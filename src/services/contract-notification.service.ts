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
      // Lấy người phê duyệt đầu tiên
      const firstApprover = await this.getCurrentApprover(contract);
      if (firstApprover) {
        await this.sendContractNotifications(
          contract,
          [firstApprover],
          "CONTRACT_PENDING_APPROVAL",
          `Hợp đồng ${contract.contractNumber} đang chờ bạn phê duyệt`
        );
      }
    } catch (error) {
      console.error("Error sending new contract notifications:", error);
    }
  }

  static async sendApprovalNotifications(
    contract: Contract,
    currentApproverId: number,
    status: "approved" | "rejected",
    comments?: string
  ) {
    setTimeout(async () => {
      try {
        const currentApprover = await dataSource
          .getRepository(User)
          .findOneBy({ id: currentApproverId });

        if (!currentApprover) {
          throw new Error("Current approver not found");
        }

        if (status === "rejected") {
          // Khi từ chối, thông báo cho người tạo
          if (contract.createdBy) {
            const message = `Hợp đồng ${
              contract.contractNumber
            } đã bị từ chối bởi ${currentApprover.fullName}${
              comments ? `. Lý do: ${comments}` : ""
            }`;

            if (contract.createdBy.role === "customer") {
              await EmailService.sendContractApprovalNotification(
                contract,
                contract.createdBy,
                currentApprover,
                "rejected",
                comments
              );
            } else {
              await NotificationService.createNotification(
                contract.createdBy,
                contract,
                "CONTRACT_REJECTED",
                message
              );
            }
          }
        } else {
          // Khi phê duyệt
          const nextApprover = await this.getNextApprover(contract);

          if (nextApprover) {
            // Còn người phê duyệt tiếp theo
            const message = `Hợp đồng ${
              contract.contractNumber
            } đã được phê duyệt bởi ${
              currentApprover.fullName
            } và đang chờ bạn phê duyệt tiếp theo${
              comments ? `. Ghi chú: ${comments}` : ""
            }`;

            await NotificationService.createNotification(
              nextApprover,
              contract,
              "CONTRACT_PENDING_APPROVAL",
              message
            );
          } else {
            // Đã phê duyệt xong, thông báo cho người ký
            const signers = this.getContractSigners(contract);
            const currentSigner = this.getCurrentSigner(contract);

            if (currentSigner) {
              if (currentSigner.role === "customer") {
                await EmailService.sendContractReadyToSignEmail(
                  contract,
                  currentSigner
                );
              } else {
                await NotificationService.createNotification(
                  currentSigner,
                  contract,
                  "CONTRACT_READY_TO_SIGN",
                  `Hợp đồng ${contract.contractNumber} đã được phê duyệt và đang chờ bạn ký`
                );
              }
            }
          }
        }
      } catch (error) {
        console.error("Error sending approval notifications:", error);
      }
    }, 0);
  }

  static async sendSignatureNotifications(
    contract: Contract,
    signerId: number
  ) {
    setTimeout(async () => {
      try {
        const currentSigner = await dataSource
          .getRepository(User)
          .findOneBy({ id: signerId });

        if (!currentSigner) {
          throw new Error("Current signer not found");
        }

        // Kiểm tra xem đã ký hết chưa
        const allSigned = contract.contractSigners?.every(
          (s) => s.status === "signed"
        );

        if (allSigned) {
          // Thông báo hoàn thành cho tất cả
          const allParticipants = [
            contract.customer,
            contract.createdBy,
            ...this.getContractSigners(contract),
          ].filter(
            (user, index, self) =>
              user && self.findIndex((u) => u.id === user.id) === index
          );

          for (const user of allParticipants) {
            if (user.role === "customer") {
              await EmailService.sendContractCompletionEmail(contract, user);
            } else {
              await NotificationService.createNotification(
                user,
                contract,
                "CONTRACT_COMPLETED",
                `Hợp đồng ${contract.contractNumber} đã được hoàn thành với đầy đủ chữ ký`
              );
            }
          }
        } else {
          // Thông báo cho người ký tiếp theo
          const nextSigner = this.getCurrentSigner(contract);
          if (nextSigner) {
            if (nextSigner.role === "customer") {
              await EmailService.sendContractReadyToSignEmail(
                contract,
                nextSigner
              );
            } else {
              await NotificationService.createNotification(
                nextSigner,
                contract,
                "CONTRACT_TO_SIGN",
                `Hợp đồng ${contract.contractNumber} đã được ${currentSigner.fullName} ký và đang chờ bạn ký tiếp theo`
              );
            }
          }
        }
      } catch (error) {
        console.error("Error sending signature notifications:", error);
      }
    }, 0);
  }
}

export default ContractNotificationService;
