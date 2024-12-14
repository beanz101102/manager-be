import { User } from "../models/user.entity";
import { Contract } from "../models/contract.entity";
import NotificationService from "./notification.services";
import EmailService from "./email.service";
import { ApprovalTemplateStep } from "../models/approval_template_step.entity";
import dataSource from "../database/data-source";

class ContractNotificationService {
  private static async getContractApprovers(
    contract: Contract
  ): Promise<User[]> {
    const templateSteps = await dataSource
      .getRepository(ApprovalTemplateStep)
      .find({
        where: { templateId: contract.approvalTemplate.id },
        relations: ["approver"],
        order: { stepOrder: "ASC" },
      });

    return templateSteps.map((step) => step.approver);
  }

  private static async getCurrentApprover(
    contract: Contract
  ): Promise<User | null> {
    const approvers = await this.getContractApprovers(contract);
    const approvedCount = contract.contractApprovals?.length || 0;
    return approvers[approvedCount] || null;
  }

  private static async getNextApprover(
    contract: Contract
  ): Promise<User | null> {
    const approvers = await this.getContractApprovers(contract);
    const approvedCount = contract.contractApprovals?.length || 0;
    return approvers[approvedCount + 1] || null;
  }

  private static getContractSigners(contract: Contract): User[] {
    return (
      contract.contractSigners
        ?.sort((a, b) => a.signOrder - b.signOrder)
        ?.map((signer) => signer.signer) || []
    );
  }

  private static getCurrentSigner(contract: Contract): User | null {
    const signers = this.getContractSigners(contract);
    const signedCount =
      contract.contractSigners?.filter((s) => s.status === "signed").length ||
      0;
    return signers[signedCount] || null;
  }

  private static getNextSigner(contract: Contract): User | null {
    // Đảm bảo contractSigners được sắp xếp theo signOrder
    const sortedSigners =
      contract.contractSigners?.sort((a, b) => a.signOrder - b.signOrder) || [];

    console.log(
      "DEBUG - All signers:",
      sortedSigners.map((s) => ({
        id: s.signer.id,
        name: s.signer.fullName,
        order: s.signOrder,
        status: s.status,
      }))
    );

    // Tìm index của người ký tiếp theo (người đầu tiên có status !== 'signed')
    const nextSignerIndex = sortedSigners.findIndex(
      (s) => s.status !== "signed"
    );
    console.log("DEBUG - Next signer index:", nextSignerIndex);

    // Nếu tìm thấy, trả về thông tin người ký
    const nextSigner =
      nextSignerIndex !== -1 ? sortedSigners[nextSignerIndex].signer : null;
    console.log(
      "DEBUG - Next signer:",
      nextSigner
        ? {
            id: nextSigner.id,
            name: nextSigner.fullName,
            role: nextSigner.role,
            email: nextSigner.email,
          }
        : "No next signer found"
    );

    return nextSigner;
  }

  static async sendContractNotifications(
    contract: Contract,
    recipients: User[],
    type: string,
    message: string
  ) {
    setTimeout(async () => {
      try {
        for (const recipient of recipients) {
          if (recipient.role === "customer") {
            // Với khách hàng, chỉ gửi email khi hợp đồng đã được duyệt và sẵn sàng ký
            if (type === "CONTRACT_READY_TO_SIGN") {
              await EmailService.sendContractReadyToSignEmail(
                contract,
                recipient
              );
            }
          } else {
            await NotificationService.createNotification(
              recipient,
              contract,
              type,
              message
            );
          }
        }
      } catch (error) {
        console.error("Error sending notifications:", error);
      }
    }, 0);
  }

  static async sendNewContractNotifications(contract: Contract) {
    try {
      // 1. Tạo Set để lưu trữ người nhận thông báo duy nhất
      const relatedUsers = new Map<number, { user: User; roles: string[] }>();

      // Helper function để thêm user và role
      const addUserWithRole = (user: User, role: string) => {
        if (!user) return;

        if (relatedUsers.has(user.id)) {
          relatedUsers.get(user.id).roles.push(role);
        } else {
          relatedUsers.set(user.id, { user, roles: [role] });
        }
      };

      // Thêm người tạo
      addUserWithRole(contract.createdBy, "creator");

      // Thêm người ký
      const signers = this.getContractSigners(contract);
      signers.forEach((signer) => addUserWithRole(signer, "signer"));

      // 2. Gửi thông báo cho từng người với message phù hợp
      for (const { user, roles } of relatedUsers.values()) {
        if (user.role === "customer") {
          // Gửi email cho khách hàng
          await EmailService.sendNewContractEmail(contract, user);
        } else {
          let message = "";
          if (roles.includes("creator")) {
            message = `Hợp đồng ${contract.contractNumber} đã được tạo thành công`;
          } else if (roles.includes("signer")) {
            message = `Hợp đồng ${contract.contractNumber} đã được tạo và sẽ cần bạn ký sau khi được phê duyệt`;
          }

          if (message) {
            await NotificationService.createNotification(
              user,
              contract,
              "contract_modified",
              message
            );
          }
        }
      }

      // 3. Gửi email cho khách hàng(nếu không nằm trong danh sách người ký)
      if (!relatedUsers.has(contract.customer.id)) {
        await EmailService.sendNewContractEmail(contract, contract.customer);
      }
    } catch (error) {
      console.error("Error sending new contract notifications:", error);
    }
  }

  static async sendApprovalNotifications(
    contract: Contract,
    approverId: number,
    status: "approved" | "rejected",
    comments?: string
  ) {
    try {
      // Load contract với đầy đủ thông tin
      const fullContract = await dataSource.getRepository(Contract).findOne({
        where: { id: contract.id },
        relations: [
          "approvalTemplate",
          "contractApprovals",
          "contractApprovals.approver",
          "contractSigners",
          "contractSigners.signer",
          "createdBy",
          "customer",
        ],
      });

      if (!fullContract) {
        throw new Error("Contract not found");
      }

      const userRepo = dataSource.getRepository(User);
      const currentApprover = await userRepo.findOne({
        where: { id: approverId },
      });

      if (!currentApprover) {
        throw new Error("Current approver not found");
      }

      if (status === "approved") {
        // Lấy danh sách người phê duyệt theo template với relation approver
        const templateSteps = await dataSource
          .getRepository(ApprovalTemplateStep)
          .find({
            where: { templateId: fullContract.approvalTemplate.id },
            relations: ["approver"],
            order: { stepOrder: "ASC" },
          });

        if (!templateSteps || templateSteps.length === 0) {
          throw new Error("No approval steps found for template");
        }

        // Xác định vị trí của người phê duyệt hiện tại trong quy trình
        const currentStepIndex = templateSteps.findIndex(
          (step) => step.approver && step.approver.id === approverId
        );

        if (currentStepIndex === -1) {
          throw new Error("Current approver not found in template steps");
        }

        // Kiểm tra xem đây có phải là người phê duyệt cuối cùng không
        const isLastApprover = currentStepIndex === templateSteps.length - 1;

        if (isLastApprover) {
          // Cập nhật trạng thái contract
          await dataSource
            .getRepository(Contract)
            .update({ id: contract.id }, { status: "ready_to_sign" });

          // Lấy người ký đầu tiên
          const firstSigner = this.getCurrentSigner(fullContract);

          if (firstSigner) {
            // Gửi thông báo cho người ký đầu tiên
            if (firstSigner.role === "customer") {
              await EmailService.sendContractReadyToSignEmail(
                fullContract,
                firstSigner
              );
            } else {
              await NotificationService.createNotification(
                firstSigner,
                fullContract,
                "contract_to_sign",
                `Hợp đồng ${fullContract.contractNumber} đã được phê duyệt hoàn tất và đang chờ bạn ký`
              );
            }

            // Thông báo cho người tạo
            if (fullContract.createdBy.id !== approverId) {
              await NotificationService.createNotification(
                fullContract.createdBy,
                fullContract,
                "contract_approved",
                `Hợp đồng ${fullContract.contractNumber} đã được phê duyệt hoàn tất và chuyển sang giai đoạn ký kết`
              );
            }
          }
        } else {
          // Nếu không phải người cuối cùng, gửi thông báo cho người tiếp theo
          const nextStep = templateSteps[currentStepIndex + 1];
          if (!nextStep || !nextStep.approver) {
            throw new Error("Next approver not found");
          }

          await NotificationService.createNotification(
            nextStep.approver,
            fullContract,
            "contract_approval",
            `Hợp đồng ${fullContract.contractNumber} đang chờ bạn phê duyệt`
          );
        }
      } else if (status === "rejected") {
        // Xử lý từ chối
        // if (fullContract.createdBy.id !== approverId) {
          await NotificationService.createNotification(
            fullContract.createdBy,
            fullContract,
            "contract_rejected",
            `Hợp đồng ${fullContract.contractNumber} đã bị từ chối bởi ${
              currentApprover.fullName
            }${comments ? `. Lý do: ${comments}` : ""}`
          );
        // }
      }
    } catch (error) {
      console.error("Error in sendApprovalNotifications:", error);
      throw error;
    }
  }

  static async sendSignatureNotifications(
    contract: Contract,
    signerId: number
  ) {
    try {
      console.log("DEBUG - Starting sendSignatureNotifications");
      console.log("DEBUG - Input contract ID:", contract.id);
      console.log("DEBUG - Input signer ID:", signerId);

      // Load contract với đầy đủ relations
      const fullContract = await dataSource.getRepository(Contract).findOne({
        where: { id: contract.id },
        relations: [
          "contractSigners",
          "contractSigners.signer",
          "createdBy",
          "customer",
        ],
      });

      console.log("DEBUG - Loaded full contract:", {
        id: fullContract?.id,
        status: fullContract?.status,
        signersCount: fullContract?.contractSigners?.length,
      });

      if (!fullContract) {
        console.error("DEBUG - Contract not found!");
        throw new Error("Contract not found");
      }

      const userRepo = dataSource.getRepository(User);
      const currentSigner = await userRepo.findOne({
        where: { id: signerId },
      });

      console.log("DEBUG - Current signer:", {
        id: currentSigner?.id,
        name: currentSigner?.fullName,
        role: currentSigner?.role,
      });

      if (!currentSigner) {
        console.error("DEBUG - Current signer not found!");
        throw new Error("Current signer not found");
      }

      // Thông báo cho người tạo
      console.log("DEBUG - Sending notification to creator:", {
        creatorId: fullContract.createdBy.id,
        creatorName: fullContract.createdBy.fullName,
      });

      await NotificationService.createNotification(
        fullContract.createdBy,
        fullContract,
        "contract_signed",
        `Hợp đồng ${fullContract.contractNumber} đã được ký bởi ${currentSigner.fullName}`
      );

      if (fullContract.status !== "completed") {
        console.log("DEBUG - Contract not completed, looking for next signer");
        const nextSigner = this.getNextSigner(fullContract);

        if (nextSigner) {
          console.log("DEBUG - Found next signer, preparing notification:", {
            id: nextSigner.id,
            name: nextSigner.fullName,
            role: nextSigner.role,
            email: nextSigner.email,
          });

          if (nextSigner.role === "customer") {
            console.log("DEBUG - Sending email to customer:", nextSigner.email);
            await EmailService.sendContractReadyToSignEmail(
              fullContract,
              nextSigner
            );
            console.log("DEBUG - Email sent successfully to customer");
          } else {
            console.log("DEBUG - Sending notification to internal user");
            await NotificationService.createNotification(
              nextSigner,
              fullContract,
              "CONTRACT_READY_TO_SIGN",
              `Hợp đồng ${fullContract.contractNumber} đã được ký bởi ${currentSigner.fullName} và đang chờ bạn ký`
            );
            console.log(
              "DEBUG - Notification sent successfully to internal user"
            );
          }
        } else {
          console.log(
            "DEBUG - No next signer found, but contract not completed"
          );
        }
      } else {
        console.log("DEBUG - Contract is completed, sending completion emails");
        await EmailService.sendContractCompletionEmail(
          fullContract,
          fullContract.createdBy
        );
        await EmailService.sendContractCompletionEmail(
          fullContract,
          fullContract.customer
        );
        console.log("DEBUG - Completion emails sent successfully");
      }
    } catch (error) {
      console.error("DEBUG - Error in sendSignatureNotifications:", error);
      throw error;
    }
  }
}

export default ContractNotificationService;
