import { In, LessThan, Like } from "typeorm";
import dataSource from "../database/data-source";
import { ApprovalTemplate } from "../models/approval_template.entity";
import { ApprovalTemplateStep } from "../models/approval_template_step.entity";
import { Contract, ContractSigner } from "../models/contract.entity";
import { ContractApproval } from "../models/contract_approval.entity";
import { User } from "../models/user.entity";
import ContractNotificationService from "./contract-notification.service";
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

          // Gửi thông báo sau khi transaction hoàn thành
          // setImmediate(async () => {
          //   try {
          //     await ContractNotificationService.sendNewContractNotifications(
          //       savedContract
          //     );
          //   } catch (error) {
          //     console.error("Error sending notifications:", error);
          //   }
          // });

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
        "approvalTemplate.steps",
      ],
      where: [],
      skip: skip,
      take: limit,
      order: {
        createdAt: "DESC" as const,
      },
    };

    if (createdById) {
      if (status === "pending_approval") {
        // Chỉ lấy hợp đồng cần phê duyệt
        query.where = [
          {
            status: "pending_approval",
            approvalTemplate: {
              steps: {
                approver: { id: createdById },
              },
            },
          } as any,
        ];
      } else if (status === "ready_to_sign") {
        // Chỉ lấy hợp đồng cần ký
        query.where = [
          {
            status: "ready_to_sign",
            contractSigners: {
              signer: { id: createdById },
              status: "pending",
            },
          } as any,
        ];
      } else {
        // Mặc định: lấy hợp đồng user tạo
        query.where = [
          {
            createdBy: { id: createdById },
          },
        ];

        // Nếu có status khác, thêm điều kiện status
        if (status) {
          query.where = query.where.map((condition) => ({
            ...condition,
            status: status,
          }));
        }
      }
    } else {
      query.where = [{}];

      if (status) {
        query.where = query.where.map((condition) => ({
          ...condition,
          status: status,
        }));
      }
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
      // 1. Lấy thông tin contract và template steps
      const contract = await transactionalEntityManager.findOne(Contract, {
        where: { id: contractId },
        relations: ["approvalTemplate", "approvalTemplate.steps", "customer"],
      });

      if (!contract) throw new Error("Contract not found");

      // 2. Lấy tất cả các steps theo thứ tự
      const templateSteps = await transactionalEntityManager
        .createQueryBuilder(ApprovalTemplateStep, "step")
        .where("step.templateId = :templateId", {
          templateId: contract.approvalTemplate.id,
        })
        .orderBy("step.stepOrder", "ASC")
        .getMany();

      // 3. Lấy các approvals hiện tại
      const existingApprovals = await transactionalEntityManager
        .createQueryBuilder(ContractApproval, "approval")
        .leftJoinAndSelect("approval.templateStep", "step")
        .where("approval.contractId = :contractId", { contractId })
        .orderBy("step.stepOrder", "ASC")
        .getMany();

      // 4. Xác định bước hiện tại
      const nextStepOrder = existingApprovals.length + 1;
      const nextStep = templateSteps.find(
        (step) => step.stepOrder === nextStepOrder
      );

      if (!nextStep) {
        throw new Error("No more steps to approve");
      }

      // 5. Kiểm tra xem người dùng có phải là người được chỉ định ở bước tiếp theo không
      if (nextStep.approverId !== userId) {
        const expectedApprover = await transactionalEntityManager
          .getRepository(User)
          .findOne({ where: { id: nextStep.approverId } });

        throw new Error(
          `This step (${nextStep.stepOrder}) must be approved by ${
            expectedApprover?.fullName || "another user"
          } (ID: ${nextStep.approverId}). Your ID: ${userId}`
        );
      }

      // 6. Kiểm tra các bước trước đã được duyệt chưa
      for (let i = 0; i < nextStepOrder - 1; i++) {
        const previousStep = templateSteps[i];
        const previousApproval = existingApprovals.find(
          (a) => a.templateStep.stepOrder === previousStep.stepOrder
        );

        if (!previousApproval || previousApproval.status !== "approved") {
          const expectedApprover = await transactionalEntityManager
            .getRepository(User)
            .findOne({ where: { id: previousStep.approverId } });

          throw new Error(
            `Step ${previousStep.stepOrder} must be approved by ${
              expectedApprover?.fullName || "another user"
            } (ID: ${previousStep.approverId}) first`
          );
        }
      }

      // Nếu đã qua được tất cả các kiểm tra, tiếp tục xử lý approval
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
        if (contract.createdBy) {
          await ContractNotificationService.sendApprovalNotifications(
            contract,
            userId,
            "rejected",
            comments
          );
        }

        setImmediate(async () => {
          try {
            await ContractNotificationService.sendApprovalNotifications(
              contract,
              userId,
              "rejected",
              comments
            );
          } catch (error) {
            console.error("Error sending rejection notifications:", error);
          }
        });

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

      // Tạo approval mới
      const newApproval = transactionalEntityManager.create(ContractApproval, {
        contract: { id: contractId },
        approver: { id: userId },
        templateStep: { id: nextStep.id },
        status: "approved",
        comments: comments,
        approvedAt: new Date(),
      });

      await transactionalEntityManager.save(ContractApproval, newApproval);

      // Cập nhật trạng thái contract
      if (nextStepOrder === templateSteps.length) {
        await transactionalEntityManager.update(Contract, contractId, {
          status: "ready_to_sign",
        });

        setImmediate(async () => {
          try {
            await ContractNotificationService.sendApprovalNotifications(
              contract,
              userId,
              "approved",
              comments
            );
          } catch (error) {
            console.error("Error sending approval notifications:", error);
          }
        });
      } else {
        await transactionalEntityManager.update(Contract, contractId, {
          status: "pending_approval",
        });

        setImmediate(async () => {
          try {
            await ContractNotificationService.sendApprovalNotifications(
              contract,
              userId,
              "approved",
              comments
            );
          } catch (error) {
            console.error("Error sending approval notifications:", error);
          }
        });
      }

      return {
        success: true,
        message: `Contract approved successfully`,
        data: {
          contractId,
          status:
            nextStepOrder === templateSteps.length
              ? "ready_to_sign"
              : "pending_approval",
          stepOrder: nextStepOrder,
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
        contractSigner.contract.completedAt = new Date();
        await transactionalEntityManager.save(
          Contract,
          contractSigner.contract
        );
      }

      // Add notification call after saving all changes
      setImmediate(async () => {
        try {
          await ContractNotificationService.sendSignatureNotifications(
            contractSigner.contract,
            signerId
          );
        } catch (error) {
          console.error("Error sending signature notifications:", error);
        }
      });

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

          // L��y thông tin người phê duyệt đầu tiên
          const firstApprovalStep = await transactionalEntityManager
            .getRepository(ApprovalTemplateStep)
            .findOne({
              where: { templateId: contract.approvalTemplate.id },
              relations: ["approver"],
              order: { stepOrder: "ASC" },
            });

          if (firstApprovalStep && firstApprovalStep.approver) {
            // Gửi thông báo cho người phê duyệt đầu tiên
            setImmediate(async () => {
              try {
                await NotificationService.createNotification(
                  firstApprovalStep.approver,
                  contract,
                  "contract_approval",
                  `Hợp đồng ${contract.contractNumber} đang chờ bạn phê duyệt`
                );
              } catch (error) {
                console.error("Error sending notification:", error);
              }
            });
          }

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

  static async getContractStatistics(userId?: number) {
    // Tạo query builder cơ bản
    let queryBuilder = contractRepo
      .createQueryBuilder("contract")
      .select("contract.status", "status")
      .addSelect("COUNT(contract.id)", "count");

    // Nếu có userId, thêm điều kiện filter
    if (userId) {
      queryBuilder = queryBuilder
        .leftJoin("contract.createdBy", "creator")
        .where("creator.id = :userId", { userId });
    }

    // Thực hiện group by và lấy kết quả
    const stats = await queryBuilder.groupBy("contract.status").getRawMany();

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
          percentage:
            total > 0 ? ((result.draft / total) * 100).toFixed(1) : "0.0",
        },
        pending_approval: {
          count: result.pending_approval,
          percentage:
            total > 0
              ? ((result.pending_approval / total) * 100).toFixed(1)
              : "0.0",
        },
        ready_to_sign: {
          count: result.ready_to_sign,
          percentage:
            total > 0
              ? ((result.ready_to_sign / total) * 100).toFixed(1)
              : "0.0",
        },
        cancelled: {
          count: result.cancelled,
          percentage:
            total > 0 ? ((result.cancelled / total) * 100).toFixed(1) : "0.0",
        },
        completed: {
          count: result.completed,
          percentage:
            total > 0 ? ((result.completed / total) * 100).toFixed(1) : "0.0",
        },
        rejected: {
          count: result.rejected,
          percentage:
            total > 0 ? ((result.rejected / total) * 100).toFixed(1) : "0.0",
        },
      },
      filtered: userId ? true : false,
      userId: userId || null,
    };
  }

  static async getCancelledContractsInTimeRange(
    startTime: number,
    endTime: number
  ) {
    // Convert seconds to Date objects
    const startDate = new Date(startTime * 1000);
    const endDate = new Date(endTime * 1000);

    // Query cancelled contracts within the time range
    const cancelledContracts = await contractRepo
      .createQueryBuilder("contract")
      .where("contract.status = :status", { status: "cancelled" })
      .andWhere("contract.updatedAt >= :startDate", { startDate })
      .andWhere("contract.updatedAt <= :endDate", { endDate })
      .getMany();

    return {
      total: cancelledContracts.length,
      timeRange: {
        start: startDate,
        end: endDate,
      },
      contracts: cancelledContracts.map((contract) => ({
        id: contract.id,
        contractNumber: contract.contractNumber,
        cancelReason: contract.cancelReason,
        cancelledAt: contract.updatedAt,
      })),
    };
  }

  static async getContractsInTimeRange(
    startTime: number,
    endTime: number,
    status: string
  ) {
    // Validate status
    const validStatuses = [
      "draft",
      "pending_approval",
      "rejected",
      "ready_to_sign",
      "completed",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      );
    }

    // Query contracts within the time range with specified status
    const contracts = await contractRepo
      .createQueryBuilder("contract")
      .leftJoinAndSelect("contract.customer", "customer")
      .leftJoinAndSelect("contract.createdBy", "createdBy")
      .where("contract.status = :status", { status })
      .andWhere("contract.createdAt BETWEEN :startDate AND :endDate", {
        startDate: new Date(startTime).toISOString(),
        endDate: new Date(endTime).toISOString(),
      })
      .getMany();

    return {
      total: contracts.length,
      timeRange: {
        start: new Date(startTime),
        end: new Date(endTime),
      },
      contracts: contracts.map((contract) => ({
        id: contract.id,
        contractNumber: contract.contractNumber,
        status: contract.status,
        customer: {
          id: contract.customer.id,
          name: contract.customer.fullName,
        },
        createdBy: {
          id: contract.createdBy.id,
          name: contract.createdBy.fullName,
        },
        updatedAt: contract.updatedAt,
        cancelReason: contract.cancelReason,
        note: contract.note,
      })),
    };
  }

  static async getCustomerContractReport() {
    const report = await contractRepo
      .createQueryBuilder("contract")
      .leftJoin("contract.customer", "customer")
      .select([
        "customer.id as customerId",
        "customer.fullName as customerName",
        "COUNT(contract.id) as totalContracts",
        `COUNT(CASE WHEN contract.status = 'cancelled' THEN 1 END) as cancelledContracts`,
        `COUNT(CASE WHEN contract.status = 'completed' THEN 1 END) as completedContracts`,
        `COUNT(CASE WHEN contract.status = 'draft' THEN 1 END) as draftContracts`,
        `COUNT(CASE WHEN contract.status = 'pending_approval' THEN 1 END) as pendingContracts`,
        `COUNT(CASE WHEN contract.status = 'ready_to_sign' THEN 1 END) as readyToSignContracts`,
        `COUNT(CASE WHEN contract.status = 'rejected' THEN 1 END) as rejectedContracts`,
      ])
      .groupBy("customer.id")
      .addGroupBy("customer.fullName")
      .getRawMany();

    // Tính toán tỷ lệ phần trăm và format lại dữ liệu
    const formattedReport = report.map((customer) => ({
      customerId: customer.customerId,
      customerName: customer.customerName,
      statistics: {
        total: parseInt(customer.totalContracts),
        draft: {
          count: parseInt(customer.draftContracts),
          percentage: (
            (parseInt(customer.draftContracts) /
              parseInt(customer.totalContracts)) *
            100
          ).toFixed(1),
        },
        pending: {
          count: parseInt(customer.pendingContracts),
          percentage: (
            (parseInt(customer.pendingContracts) /
              parseInt(customer.totalContracts)) *
            100
          ).toFixed(1),
        },
        readyToSign: {
          count: parseInt(customer.readyToSignContracts),
          percentage: (
            (parseInt(customer.readyToSignContracts) /
              parseInt(customer.totalContracts)) *
            100
          ).toFixed(1),
        },
        cancelled: {
          count: parseInt(customer.cancelledContracts),
          percentage: (
            (parseInt(customer.cancelledContracts) /
              parseInt(customer.totalContracts)) *
            100
          ).toFixed(1),
        },
        completed: {
          count: parseInt(customer.completedContracts),
          percentage: (
            (parseInt(customer.completedContracts) /
              parseInt(customer.totalContracts)) *
            100
          ).toFixed(1),
        },
        rejected: {
          count: parseInt(customer.rejectedContracts),
          percentage: (
            (parseInt(customer.rejectedContracts) /
              parseInt(customer.totalContracts)) *
            100
          ).toFixed(1),
        },
      },
    }));

    // Tính tổng số liệu
    const totals = formattedReport.reduce(
      (acc, curr) => {
        acc.totalContracts += curr.statistics.total;
        acc.totalDraft += curr.statistics.draft.count;
        acc.totalPending += curr.statistics.pending.count;
        acc.totalReadyToSign += curr.statistics.readyToSign.count;
        acc.totalCancelled += curr.statistics.cancelled.count;
        acc.totalCompleted += curr.statistics.completed.count;
        acc.totalRejected += curr.statistics.rejected.count;
        return acc;
      },
      {
        totalContracts: 0,
        totalDraft: 0,
        totalPending: 0,
        totalReadyToSign: 0,
        totalCancelled: 0,
        totalCompleted: 0,
        totalRejected: 0,
      }
    );

    return {
      customers: formattedReport,
      summary: {
        totalCustomers: formattedReport.length,
        totalContracts: totals.totalContracts,
        draft: {
          count: totals.totalDraft,
          percentage: (
            (totals.totalDraft / totals.totalContracts) *
            100
          ).toFixed(1),
        },
        pending: {
          count: totals.totalPending,
          percentage: (
            (totals.totalPending / totals.totalContracts) *
            100
          ).toFixed(1),
        },
        readyToSign: {
          count: totals.totalReadyToSign,
          percentage: (
            (totals.totalReadyToSign / totals.totalContracts) *
            100
          ).toFixed(1),
        },
        cancelled: {
          count: totals.totalCancelled,
          percentage: (
            (totals.totalCancelled / totals.totalContracts) *
            100
          ).toFixed(1),
        },
        completed: {
          count: totals.totalCompleted,
          percentage: (
            (totals.totalCompleted / totals.totalContracts) *
            100
          ).toFixed(1),
        },
        rejected: {
          count: totals.totalRejected,
          percentage: (
            (totals.totalRejected / totals.totalContracts) *
            100
          ).toFixed(1),
        },
      },
    };
  }

  static async getAdvancedStatistics({
    startTime,
    endTime,
    status,
    createdById,
    customerId,
  }) {
    // Tạo base query builder
    const baseQueryBuilder = () =>
      contractRepo
        .createQueryBuilder("contract")
        .leftJoin("contract.customer", "customer")
        .leftJoin("contract.createdBy", "creator");

    // Áp dụng các điều ki���n filter
    const applyFilters = (qb) => {
      if (startTime) {
        const startDate = new Date(parseInt(startTime));
        if (isNaN(startDate.getTime())) {
          console.error("Invalid start time:", startTime);
          throw new Error("Invalid start time");
        }

        // Nếu status là completed, filter theo completedAt
        if (status === "completed") {
          qb.andWhere("contract.completedAt >= :startDate", {
            startDate: startDate,
          });
        } else {
          qb.andWhere("contract.createdAt >= :startDate", {
            startDate: startDate,
          });
        }
      }

      if (endTime) {
        const endDate = new Date(parseInt(endTime));
        if (isNaN(endDate.getTime())) {
          console.error("Invalid end time:", endTime);
          throw new Error("Invalid end time");
        }

        // Nếu status là completed, filter theo completedAt
        if (status === "completed") {
          qb.andWhere("contract.completedAt <= :endDate", {
            endDate: endDate,
          });
        } else {
          qb.andWhere("contract.createdAt <= :endDate", {
            endDate: endDate,
          });
        }
      }

      if (status) {
        qb.andWhere("contract.status = :status", { status });
      }

      if (createdById) {
        qb.andWhere("creator.id = :createdById", { createdById });
      }

      if (customerId) {
        qb.andWhere("customer.id = :customerId", { customerId });
      }

      return qb;
    };

    // Query cho thống kê theo trạng thái
    const statusStats = await applyFilters(baseQueryBuilder())
      .select("contract.status", "status")
      .addSelect("COUNT(contract.id)", "count")
      .groupBy("contract.status")
      .getRawMany();

    // Query cho thống kê theo tháng
    const monthlyStats = await applyFilters(baseQueryBuilder())
      .select("DATE_FORMAT(contract.createdAt, '%Y-%m')", "monthYear")
      .addSelect("COUNT(contract.id)", "count")
      .groupBy("monthYear")
      .orderBy("monthYear", "DESC")
      .limit(12)
      .getRawMany();

    // Format kết quả
    const result = {
      summary: {
        total: statusStats.reduce((sum, item) => sum + parseInt(item.count), 0),
        byStatus: statusStats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
      },
      monthlyTrend: monthlyStats.map((item) => ({
        month: item.monthYear,
        count: parseInt(item.count),
      })),
      timeRange:
        startTime && endTime
          ? {
              start: new Date(startTime * 1000),
              end: new Date(endTime * 1000),
            }
          : null,
    };

    // Thêm thống kê về mối quan hệ người tạo - khách hàng nếu có
    if (createdById && customerId) {
      const creatorCustomerStats = await applyFilters(baseQueryBuilder())
        .select("contract.status", "status")
        .addSelect("COUNT(contract.id)", "count")
        .groupBy("contract.status")
        .getRawMany();

      result["creatorCustomerRelationship"] = {
        total: creatorCustomerStats.reduce(
          (sum, item) => sum + parseInt(item.count),
          0
        ),
        byStatus: creatorCustomerStats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
      };
    }

    return result;
  }
}

export default contractService;
