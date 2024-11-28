import { User } from "../models/user.entity";
import dataSource from "../database/data-source";
import { Contract, ContractSigner } from "../models/contract.entity";
import { Like } from "typeorm";
import { ApprovalTemplate } from "../models/approval_template.entity";
import { LessThan } from "typeorm";
import { ApprovalTemplateStep } from "../models/approval_template_step.entity";
import { ContractApproval } from "../models/contract_approval.entity";
import EmailService from "../services/email.service";
import { In } from "typeorm";
let contractRepo = dataSource.getRepository(Contract);
let signerRepo = dataSource.getRepository(ContractSigner);
let stepRepo = dataSource.getRepository(ApprovalTemplate);
class contractService {
  static async addContract(
    contractNumber: string,
    customerId: number,
    contractType: string,
    approvalTemplateId: number,
    createdById: number,
    signerIds: { userId: number; order: number }[],
    note: string,
    pdfFilePath: string
  ): Promise<Contract> {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      const [customer, createdBy, approvalTemplate] = await Promise.all([
        dataSource.getRepository(User).findOneBy({ id: customerId }),
        dataSource.getRepository(User).findOneBy({ id: createdById }),
        dataSource
          .getRepository(ApprovalTemplate)
          .findOneBy({ id: approvalTemplateId }),
      ]);

      if (!customer) throw new Error("Customer not found");
      if (!createdBy) throw new Error("Created by user not found");
      if (!approvalTemplate) throw new Error("Approval template not found");

      let contract = new Contract();
      contract.contractNumber = contractNumber;
      contract.customer = customer;
      contract.contractType = contractType;
      contract.approvalTemplate = approvalTemplate;
      contract.createdBy = createdBy;
      contract.note = note;
      contract.pdfFilePath = pdfFilePath;
      contract.status = "draft";

      contract = await transactionalEntityManager.save(contract);

      const signerEntities =
        signerIds?.map(({ userId, order }) => {
          const signer = new ContractSigner();
          signer.contract = contract;
          signer.signer = { id: userId } as User;
          signer.signOrder = order;
          return signer;
        }) || [];

      await transactionalEntityManager.save(ContractSigner, signerEntities);

      return contract;
    });
  }

  static async updateContract(
    id: any,
    contractNumber: any,
    customer: any,
    contractType: any,
    createdBy: User,
    signersCount: any,
    status: any,
    note: any
  ) {
    let contract = await contractRepo.findOneBy({ id: id });
    contract.contractNumber = contractNumber;
    contract.customer = customer;
    contract.contractType = contractType;
    contract.createdBy = createdBy;
    contract.status = status;
    contract.note = note;
    await contractRepo.save(contract);
  }

  static async allContracts(
    contractNumber?: string,
    status?: string,
    createdById?: number,
    customerId?: number,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    let query = {
      relations: [
        "customer",
        "createdBy.department",
        "contractApprovals",
        "contractSigners",
        "contractSigners.signer",
      ],
      where: [],
      skip: skip,
      take: limit,
    };

    if (createdById) {
      query.where = [
        { createdBy: { id: createdById } },
        { contractApprovals: { approver: { id: createdById } } },
        { contractSigners: { signer: { id: createdById } } },
      ];
    } else {
      query.where = [{}];
    }

    if (contractNumber) {
      query.where = query.where.map((condition) => ({
        ...condition,
        contractNumber: Like(`%${contractNumber}%`),
      }));
    }

    if (status) {
      query.where = query.where.map((condition) => ({
        ...condition,
        status: status,
      }));
    }

    if (customerId) {
      query.where = query.where.map((condition) => ({
        ...condition,
        customer: { id: customerId },
      }));
    }

    let [contracts, total] = await contractRepo.findAndCount(query);

    const formattedContracts = contracts.map((contract) => ({
      ...contract,
      approvedUserIds:
        (contract as any).contractApprovals
          ?.filter((approval) => approval.status === "approved")
          ?.map((approval) => approval.approverId) || [],
      signedUserIds:
        (contract as any).contractSigners
          ?.filter((signer) => signer.status === "signed")
          ?.map((signer) => signer.signer.id) || [],
    }));

    return {
      data: formattedContracts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getDetail(id: any) {
    let contract = await contractRepo.findOne({
      where: { id: id },
      relations: [
        "customer",
        "createdBy",
        "approvalTemplate",
        "contractApprovals",
        "contractApprovals.approver.department",
        "contractApprovals.templateStep",
        "contractSigners",
        "contractSigners.signer.department",
      ],
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    // Format the response to include approval and signing information
    const formattedContract = {
      ...contract,
      approvals: contract.contractApprovals
        ?.map((approval) => ({
          approver: {
            id: approval.approver.id,
            name: approval.approver.fullName,
            email: approval.approver.email,
            role: approval.approver.role,
            department: approval.approver.department,
          },
          status: approval.status,
          comments: approval.comments,
          approvedAt: approval.approvedAt,
          stepOrder: approval.templateStep.stepOrder,
        }))
        .sort((a, b) => a.stepOrder - b.stepOrder),

      signers: contract.contractSigners
        ?.map((signer) => ({
          signer: {
            id: signer.signer.id,
            name: signer.signer.fullName,
            email: signer.signer.email,
            role: signer.signer.role,
            department: signer.signer.department,
          },
          status: signer.status,
          signOrder: signer.signOrder,
          signedAt: signer.signedAt,
        }))
        .sort((a, b) => a.signOrder - b.signOrder),
    };

    // Remove the raw relations from the response
    delete formattedContract.contractApprovals;
    delete formattedContract.contractSigners;

    return formattedContract;
  }

  static async approveContract(
    contractId: number,
    userId: number,
    status: "approved" | "rejected",
    comments?: string
  ) {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Kiểm tra hợp đồng và template
      const contract = await contractRepo.findOne({
        where: { id: contractId },
        relations: ["approvalTemplate"],
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      // 2. Lấy tất cả các bước phê duyệt của template
      const templateSteps = await dataSource
        .getRepository(ApprovalTemplateStep)
        .find({
          where: { templateId: contract.approvalTemplate.id },
          order: { stepOrder: "ASC" },
        });

      // 3. Lấy lịch sử phê duyệt
      const approvalHistory = await dataSource
        .getRepository(ContractApproval)
        .find({
          where: { contractId },
          relations: ["templateStep"],
          order: { createdAt: "DESC" },
        });

      // 4. Xác định bước hiện tại
      const approvedSteps = approvalHistory.filter(
        (a) => a.status === "approved"
      );
      const currentStepOrder = approvedSteps.length + 1;
      const currentStep = templateSteps.find(
        (s) => s.stepOrder === currentStepOrder
      );

      if (!currentStep) {
        throw new Error("No pending approval step found");
      }

      if (currentStep.approverId !== userId) {
        throw new Error("User not authorized to approve this step");
      }

      // 5. Tạo bản ghi phê duyệt
      const approval = new ContractApproval();
      approval.contract = contract;
      approval.templateStep = currentStep;
      approval.approver = { id: userId } as User;
      approval.status = status;
      approval.comments = comments;
      approval.approvedAt = new Date();

      await transactionalEntityManager.save(approval);

      // 7. Cập nhật trạng thái hợp đồng
      if (status === "rejected") {
        contract.status = "rejected";
      } else if (currentStepOrder === templateSteps.length) {
        // Nếu là bước cuối cùng và approved
        contract.status = "ready_to_sign"; // Đảm bảo giá trị này nằm trong ENUM
      } else {
        contract.status = "pending_approval"; // Đảm bảo giá trị này nằm trong ENUM
      }

      await transactionalEntityManager.save(contract);

      // Sau khi phê duyệt thành công
      if (status === "approved") {
        if (currentStepOrder === templateSteps.length) {
          // Nếu là bước cuối cùng, gửi email cho tất cả người ký
          const contractSigners = await transactionalEntityManager.find(
            ContractSigner,
            {
              where: { contract: { id: contractId } },
              relations: ["signer"],
              order: { signOrder: "ASC" },
            }
          );

          // Gửi email cho tất cả người ký
          for (const signer of contractSigners) {
            await EmailService.sendContractReadyToSignEmail(
              contract,
              signer.signer
            );
          }
        } else {
          // Nếu còn bước tiếp theo, gửi email cho người phê duyệt tiếp theo
          const nextStep = templateSteps.find(
            (s) => s.stepOrder === currentStepOrder + 1
          );
          if (nextStep) {
            const nextApprover = await transactionalEntityManager
              .getRepository(User)
              .findOneBy({ id: nextStep.approverId });

            if (nextApprover) {
              const currentApprover = await transactionalEntityManager
                .getRepository(User)
                .findOneBy({ id: userId });

              await EmailService.sendContractApprovalNotification(
                contract,
                nextApprover,
                currentApprover,
                status,
                comments
              );
            }
          }
        }
      }

      return {
        success: true,
        message:
          status === "approved"
            ? currentStepOrder === templateSteps.length
              ? "Contract is ready for signing"
              : "Approval step completed"
            : "Contract rejected",
        data: {
          approval,
          contract,
          nextStep:
            status === "approved" && currentStepOrder < templateSteps.length
              ? templateSteps[currentStepOrder]
              : null,
        },
      };
    });
  }

  static async signContract(contractId: number, signerId: number) {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Kiểm tra hợp đồng và người ký
      const contractSigner = await transactionalEntityManager.findOne(
        ContractSigner,
        {
          where: {
            contract: { id: contractId },
            signer: { id: signerId },
            status: "pending",
          },
          relations: ["contract"],
        }
      );

      if (!contractSigner) {
        throw new Error("Invalid signer or contract already signed");
      }

      // 2. Kiểm tra trạng thái hợp đồng
      if (contractSigner.contract.status !== "ready_to_sign") {
        throw new Error("Contract must be fully approved before signing");
      }

      // 3. Kiểm tra thứ tự ký
      const previousSigners = await transactionalEntityManager.find(
        ContractSigner,
        {
          where: {
            contract: { id: contractId },
            signOrder: LessThan(contractSigner.signOrder),
          },
        }
      );

      if (previousSigners.some((s) => s.status !== "signed")) {
        throw new Error("Previous signers must sign first");
      }

      // 4. Cập nhật trạng thái ký
      contractSigner.status = "signed";
      contractSigner.signedAt = new Date();
      await transactionalEntityManager.save(ContractSigner, contractSigner);

      // 5. Kiểm tra nếu tất cả đã ký - sử dụng transactionalEntityManager
      const [totalSigners, signedSigners] = await Promise.all([
        transactionalEntityManager.count(ContractSigner, {
          where: { contract: { id: contractId } },
        }),
        transactionalEntityManager.count(ContractSigner, {
          where: {
            contract: { id: contractId },
            status: "signed",
          },
        }),
      ]);

      console.log("Total signers:", totalSigners);
      console.log("Signed signers:", signedSigners);

      if (signedSigners === totalSigners) {
        // Tất cả đã ký xong
        contractSigner.contract.status = "completed";
        await transactionalEntityManager.save(
          Contract,
          contractSigner.contract
        );
      }

      return {
        success: true,
        message:
          signedSigners === totalSigners
            ? "Contract fully signed and completed"
            : `Contract signed successfully. ${
                totalSigners - signedSigners
              } signers remaining`,
        data: {
          totalSigners,
          signedSigners,
          remainingSigners: totalSigners - signedSigners,
        },
      };
    });
  }

  static async submitMultipleForApproval(
    contractIds: number[],
    userId: number
  ) {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      // Ly tất cả các hp đồng cần duyệt
      const contracts = await contractRepo.find({
        where: { id: In(contractIds) },
        relations: ["createdBy", "approvalTemplate"],
      });

      if (contracts.length !== contractIds.length) {
        throw new Error("Some contracts were not found");
      }

      const results = {
        success: [],
        failed: [],
      };

      // Xử lý từng hợp đồng
      for (const contract of contracts) {
        try {
          // Kiểm tra điều kiện
          if (contract.createdBy.id !== userId) {
            throw new Error("Only contract creator can submit for approval");
          }

          if (contract.status !== "draft") {
            throw new Error(
              "Only draft contracts can be submitted for approval"
            );
          }

          // Cập nhật trạng thái
          contract.status = "pending_approval";
          await transactionalEntityManager.save(Contract, contract);

          // Lấy thông tin người phê duyệt đầu tiên
          //   const firstApprovalStep = await transactionalEntityManager.findOne(
          //     ApprovalTemplateStep,
          //     {
          //       where: { templateId: contract.approvalTemplate.id },
          //       order: { stepOrder: "ASC" },
          //     }
          //   );

          //   if (firstApprovalStep) {
          //     // Gửi email thông báo cho người phê duyệt đầu tiên
          //     const firstApprover = await transactionalEntityManager.findOne(
          //       User,
          //       {
          //         where: { id: firstApprovalStep.approverId },
          //       }
          //     );

          //     if (firstApprover) {
          //       await EmailService.sendContractApprovalNotification(
          //         contract,
          //         firstApprover,
          //         contract.createdBy,
          //         "submitted",
          //         "Contract submitted for approval"
          //       );
          //     }
          //   }

          results.success.push({
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            message: "Successfully submitted for approval",
          });
        } catch (error) {
          results.failed.push({
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        message: `Successfully processed ${results.success.length} contracts, ${results.failed.length} failed`,
        data: {
          successfulContracts: results.success,
          failedContracts: results.failed,
          totalProcessed: contracts.length,
        },
      };
    });
  }

  static async approveMultipleContracts(
    contracts: Array<{
      contractId: number;
      comments?: string;
    }>,
    status: "approved" | "rejected",
    approverId: number
  ) {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      const results = {
        success: [],
        failed: [],
      };

      for (const contract of contracts) {
        try {
          const result = await this.approveContract(
            contract.contractId,
            approverId,
            status,
            contract.comments
          );

          results.success.push({
            contractId: contract.contractId,
            message: result.message,
          });
        } catch (error) {
          results.failed.push({
            contractId: contract.contractId,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        message: `Successfully ${status} ${results.success.length} contracts, ${results.failed.length} failed`,
        data: {
          successfulContracts: results.success,
          failedContracts: results.failed,
          totalProcessed: contracts.length,
          status,
        },
      };
    });
  }

  static async cancelContracts(
    contractIds: number[],
    userId: number,
    reason: string
  ) {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      // Get all contracts to cancel
      const contracts = await contractRepo.find({
        where: { id: In(contractIds) },
        relations: ["createdBy"],
      });

      if (contracts.length === 0) {
        throw new Error("No contracts found");
      }

      const results = {
        success: [],
        failed: [],
      };

      for (const contract of contracts) {
        try {
          // Check if contract can be cancelled
          if (
            contract.status === "completed" ||
            contract.status === "cancelled"
          ) {
            throw new Error(
              `Contract ${contract.contractNumber} cannot be cancelled in its current status`
            );
          }

          // Only allow creator to cancel
          if (contract.createdBy.id !== userId) {
            throw new Error(
              `Unauthorized to cancel contract ${contract.contractNumber}`
            );
          }

          // Update contract status and reason
          contract.status = "cancelled";
          contract.cancelReason = reason;
          await transactionalEntityManager.save(Contract, contract);

          results.success.push({
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            message: "Successfully cancelled",
            cancelReason: reason,
          });
        } catch (error) {
          results.failed.push({
            contractId: contract.id,
            contractNumber: contract.contractNumber,
            error: error.message,
          });
        }
      }

      return {
        success: true,
        message: `Successfully cancelled ${results.success.length} contracts, ${results.failed.length} failed`,
        data: {
          successfulContracts: results.success,
          failedContracts: results.failed,
          totalProcessed: contracts.length,
        },
      };
    });
  }
}

export default contractService;
