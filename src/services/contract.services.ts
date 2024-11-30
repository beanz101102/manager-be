import { In, LessThan, Like } from "typeorm";
import dataSource from "../database/data-source";
import { ApprovalTemplate } from "../models/approval_template.entity";
import { ApprovalTemplateStep } from "../models/approval_template_step.entity";
import { Contract, ContractSigner } from "../models/contract.entity";
import { ContractApproval } from "../models/contract_approval.entity";
import { User } from "../models/user.entity";
import NotificationService from "./notification.services";
let contractRepo = dataSource.getRepository(Contract);
let signerRepo = dataSource.getRepository(ContractSigner);
let stepRepo = dataSource.getRepository(ApprovalTemplate);

type ApprovalStatus = "approved" | "rejected";
class contractService {
  static async addContract(
    contractNumber: string,
    customerId: number,
    contractType: string,
    approvalTemplateId: number,
    createdById: number,
    signers: any[],
    note: string,
    pdfFilePath: string
  ): Promise<Contract> {
    try {
      return await dataSource.transaction(
        async (transactionalEntityManager) => {
          const contractRepo =
            transactionalEntityManager.getRepository(Contract);
          const userRepo = transactionalEntityManager.getRepository(User);
          const templateRepo =
            transactionalEntityManager.getRepository(ApprovalTemplate);
          const signerRepo =
            transactionalEntityManager.getRepository(ContractSigner);

          // Kiểm tra và lấy dữ liệu cần thiết
          const customer = await userRepo.findOneBy({ id: customerId });
          const createdBy = await userRepo.findOneBy({ id: createdById });
          const approvalTemplate = await templateRepo.findOneBy({
            id: approvalTemplateId,
          });

          if (!customer || !createdBy || !approvalTemplate) {
            throw new Error("Invalid customer, creator or approval template");
          }

          // Tạo contract mới
          const contract = new Contract();
          contract.contractNumber = contractNumber;
          contract.customer = customer;
          contract.contractType = contractType;
          contract.approvalTemplate = approvalTemplate;
          contract.createdBy = createdBy;
          contract.note = note;
          contract.pdfFilePath = pdfFilePath;
          contract.status = "draft";

          // Lưu contract
          const savedContract = await contractRepo.save(contract);

          // Xử lý signers
          const signerEntities = [];
          for (const signer of signers) {
            const signerUser = await userRepo.findOneBy({ id: signer.userId });
            if (!signerUser) {
              throw new Error(`Signer with id ${signer.userId} not found`);
            }

            const contractSigner = new ContractSigner();
            contractSigner.contract = savedContract;
            contractSigner.signer = signerUser;
            contractSigner.signOrder = signer.order;
            contractSigner.status = "pending";

            signerEntities.push(await signerRepo.save(contractSigner));
          }

          // Tạo thông báo bên ngoài transaction chính
          setImmediate(async () => {
            try {
              for (const signer of signerEntities) {
                if (signer.signer.role !== "customer") {
                  await NotificationService.createNotification(
                    signer.signer,
                    savedContract,
                    "contract_to_sign",
                    `Bạn có một hợp đồng mới cần ký: ${savedContract.contractNumber}`
                  );
                }
              }
            } catch (notificationError) {
              console.error("Error creating notifications:", notificationError);
            }
          });

          return savedContract;
        }
      );
    } catch (error) {
      throw new Error(`Failed to create contract: ${error.message}`);
    }
  }

  static async updateContract(
    id: number,
    contractNumber?: string,
    customer?: any,
    contractType?: string,
    createdBy?: User,
    note?: string,
    approvalTemplateId?: number,
    signerIds?: { userId: number; order: number }[],
    newPdfFilePath?: string
  ) {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      const contract = await transactionalEntityManager.findOne(Contract, {
        where: { id },
        relations: [
          "approvalTemplate",
          "contractApprovals",
          "contractSigners",
          "contractSigners.signer",
          "customer",
          "createdBy",
        ],
      });

      if (!contract) {
        throw new Error("Contract not found");
      }

      // Kiểm tra các thay đổi quan trọng cần reset quy trình
      const needsReset =
        contractNumber !== undefined ||
        customer !== undefined ||
        contractType !== undefined ||
        newPdfFilePath !== undefined ||
        approvalTemplateId !== undefined ||
        signerIds !== undefined;

      if (needsReset) {
        // Reset về draft
        contract.status = "draft";

        // Xóa tất cả approvals
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(ContractApproval)
          .where("contractId = :contractId", { contractId: contract.id })
          .execute();

        // Reset signatures
        await transactionalEntityManager
          .createQueryBuilder()
          .update(ContractSigner)
          .set({ status: "pending", signedAt: null })
          .where("contractId = :contractId", { contractId: contract.id })
          .execute();
      }

      // Cập nhật thông tin contract
      if (contractNumber) contract.contractNumber = contractNumber;
      if (customer) contract.customer = customer;
      if (contractType) contract.contractType = contractType;
      if (createdBy) contract.createdBy = createdBy;
      if (note) contract.note = note;
      if (newPdfFilePath) contract.pdfFilePath = newPdfFilePath;

      // ... phần xử lý template và signers giữ nguyên ...

      await transactionalEntityManager.save(contract);

      return {
        success: true,
        message: needsReset
          ? "Contract updated and reset to draft status"
          : "Contract updated successfully",
        data: {
          contractId: contract.id,
          status: contract.status,
          needsReapproval: needsReset,
        },
      };
    });
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
      order: {
        createdAt: "DESC" as const,
      },
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

    // Get all expected approvers from the template steps
    const templateSteps = await dataSource
      .getRepository(ApprovalTemplateStep)
      .find({
        where: { templateId: contract.approvalTemplate.id },
        relations: ["approver", "approver.department"],
        order: { stepOrder: "ASC" },
      });

    // Format the response to include approval and signing information
    const formattedContract = {
      ...contract,
      approvals: templateSteps.map((step) => {
        // Find matching approval if it exists
        const existingApproval = contract.contractApprovals?.find(
          (approval) => approval.templateStep.stepOrder === step.stepOrder
        );

        return {
          approver: {
            id: step.approver.id,
            name: step.approver.fullName,
            email: step.approver.email,
            role: step.approver.role,
            department: step.approver.department,
          },
          status: existingApproval?.status || "pending",
          comments: existingApproval?.comments || null,
          approvedAt: existingApproval?.approvedAt || null,
          stepOrder: step.stepOrder,
        };
      }),

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
    status: ApprovalStatus,
    comments?: string
  ) {
    return await dataSource.transaction(async (transactionalEntityManager) => {
      // 1. Lấy thông tin contract
      const contract = await transactionalEntityManager.findOne(Contract, {
        where: { id: contractId },
        relations: ["approvalTemplate", "approvalTemplate.steps"],
      });

      if (!contract) throw new Error("Contract not found");

      // 2. Xử lý khi reject
      if (status === "rejected") {
        // Cập nhật trạng thái contract về draft để user có thể sửa
        await transactionalEntityManager.update(Contract, contractId, {
          status: "rejected",
        });

        // Xóa tất cả approvals hiện tại
        await transactionalEntityManager
          .createQueryBuilder()
          .delete()
          .from(ContractApproval)
          .where("contractId = :contractId", { contractId })
          .execute();

        // Reset signatures
        await transactionalEntityManager
          .createQueryBuilder()
          .update(ContractSigner)
          .set({ status: "pending", signedAt: null })
          .where("contractId = :contractId", { contractId })
          .execute();

        // Thông báo cho người tạo nếu họ không phải là khách hàng
        if (contract.createdBy.role !== "customer") {
          await NotificationService.createNotification(
            contract.createdBy,
            contract,
            "contract_rejected",
            `Hợp đồng ${contract.contractNumber} đã bị từ chối`
          );
        }

        return {
          success: true,
          message: "Contract rejected successfully",
          data: {
            contractId,
            status: "draft",
            message:
              "Contract has been reset to draft status. Please update and submit for approval again.",
          },
        };
      }

      // 3. Xử lý khi approve
      const templateSteps = await transactionalEntityManager
        .createQueryBuilder(ApprovalTemplateStep, "step")
        .where("step.templateId = :templateId", {
          templateId: contract.approvalTemplate.id,
        })
        .orderBy("step.stepOrder", "ASC")
        .getMany();

      if (!templateSteps.length) {
        throw new Error("No approval steps found");
      }

      // Lấy các approvals hiện tại
      const existingApprovals = await transactionalEntityManager
        .createQueryBuilder(ContractApproval, "approval")
        .where("approval.contractId = :contractId", { contractId })
        .andWhere("approval.status = :status", { status: "approved" })
        .getMany();

      const currentStepOrder = existingApprovals.length + 1;
      const currentStep = templateSteps.find(
        (s) => s.stepOrder === currentStepOrder
      );

      if (!currentStep) {
        throw new Error("No more steps to approve");
      }

      // Tạo approval mới
      const newApproval = transactionalEntityManager.create(ContractApproval, {
        contract: { id: contractId },
        approver: { id: userId },
        templateStep: { id: currentStep.id },
        status: "approved",
        comments: comments,
        approvedAt: new Date(),
      });

      await transactionalEntityManager.save(ContractApproval, newApproval);

      // Cập nhật trạng thái contract
      if (currentStepOrder === templateSteps.length) {
        await transactionalEntityManager.update(Contract, contractId, {
          status: "ready_to_sign",
        });

        // Xử lý notification bên ngoài transaction
        const signers = await signerRepo.find({
          where: { contract: { id: contractId } },
          relations: ["signer"],
        });

        setImmediate(async () => {
          try {
            for (const signer of signers) {
              if (signer.signer.role !== "customer") {
                await NotificationService.createNotification(
                  signer.signer,
                  contract,
                  "contract_to_sign",
                  `Hợp đồng ${contract.contractNumber} đã được phê duyệt và sẵn sàng để ký`
                );
              }
            }
          } catch (notificationError) {
            console.error("Error creating notifications:", notificationError);
          }
        });
      } else {
        await transactionalEntityManager.update(Contract, contractId, {
          status: "pending_approval",
        });

        // Xử lý notification cho người phê duyệt tiếp theo bên ngoài transaction
        const nextApprover = templateSteps[currentStepOrder].approver;

        setImmediate(async () => {
          try {
            if (nextApprover.role !== "customer") {
              await NotificationService.createNotification(
                nextApprover,
                contract,
                "contract_approval",
                `Bạn có một hợp đồng cần phê duyệt: ${contract.contractNumber}`
              );
            }
          } catch (notificationError) {
            console.error("Error creating notification:", notificationError);
          }
        });
      }

      return {
        success: true,
        message: `Contract approved successfully`,
        data: {
          contractId,
          status: "approved",
          stepOrder: currentStepOrder,
          totalSteps: templateSteps.length,
        },
      };
    });
  }

  static async signContract(
    contractId: number,
    signerId: number,
    pdfFilePath: string
  ) {
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

      // 4. Cập nhật trạng thái ký và PDF file path
      contractSigner.status = "signed";
      contractSigner.signedAt = new Date();
      await transactionalEntityManager.save(ContractSigner, contractSigner);

      // Update contract's PDF file path
      contractSigner.contract.pdfFilePath = pdfFilePath;
      await transactionalEntityManager.save(Contract, contractSigner.contract);

      // 5. Kiểm tra nếu tất cả đã ký
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

      if (signedSigners === totalSigners) {
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
          pdfFilePath,
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

  static async getContractStatistics() {
    const stats = await contractRepo
      .createQueryBuilder("contract")
      .select("contract.status", "status")
      .addSelect("COUNT(contract.id)", "count")
      .groupBy("contract.status")
      .getRawMany();

    // Khởi tạo object kết quả với giá trị mặc định là 0
    const result = {
      draft: 0, // Hợp đồng đã soạn
      pending_approval: 0, // Hợp đồng chờ duyệt
      ready_to_sign: 0, // Hợp đồng chờ ký
      cancelled: 0, // Hợp đồng bị hủy
      completed: 0, // Hợp đồng đã hoàn thành
      rejected: 0, // Hợp đồng bị từ chối
    };

    // Cập nhật số lượng từ kết quả query
    stats.forEach((item) => {
      result[item.status] = parseInt(item.count);
    });

    // Tính tổng số hợp đồng
    const total = Object.values(result).reduce((sum, count) => sum + count, 0);

    return {
      total,
      details: {
        draft: {
          count: result.draft,
          percentage: ((result.draft / total) * 100).toFixed(1),
        },
        pending_approval: {
          count: result.pending_approval,
          percentage: ((result.pending_approval / total) * 100).toFixed(1),
        },
        ready_to_sign: {
          count: result.ready_to_sign,
          percentage: ((result.ready_to_sign / total) * 100).toFixed(1),
        },
        cancelled: {
          count: result.cancelled,
          percentage: ((result.cancelled / total) * 100).toFixed(1),
        },
        completed: {
          count: result.completed,
          percentage: ((result.completed / total) * 100).toFixed(1),
        },
        rejected: {
          count: result.rejected,
          percentage: ((result.rejected / total) * 100).toFixed(1),
        },
      },
    };
  }
}

export default contractService;
