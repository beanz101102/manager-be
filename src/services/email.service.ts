import nodemailer from "nodemailer";
import { User } from "../models/user.entity";
import { Contract } from "../models/contract.entity";

class EmailService {
  private static transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "Nduythai0101@gmail.com", // Email Gmail của bạn
      pass: "hesnmlyqblfpkzzj", // App Password từ Gmail
    },
  });

  static async sendContractReadyToSignEmail(contract: Contract, signer: User) {
    const subject = `Hợp đồng ${contract.contractNumber} đã sẵn sàng để ký`;
    const appUrl = "https://app.phatdat.online";

    const html = `
      <h2>Hợp đồng sẵn sàng để ký</h2>
      <p>Kính gửi ${signer.fullName},</p>
      <p>Hợp đồng số <strong>${contract.contractNumber}</strong> đã được phê duyệt và hiện đã sẵn sàng để ký.</p>
      <p>Vui lòng đăng nhập vào ứng dụng để xem xét và ký hợp đồng:</p>
      <p><a href="${appUrl}/client-signature/${contract.id}?token=kh_${signer.id}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Ký hợp đồng</a></p>
      <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với người tạo hợp đồng.</p>
      <br>
      <p>Trân trọng,</p>
      <p>Đội ngũ ứng dụng</p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: signer.email,
        subject,
        html,
      });
      console.log(`Đã gửi email thông báo ký tên đến ${signer.email}`);
    } catch (error) {
      console.error("Lỗi khi gửi email:", error);
      // Không throw error để không ảnh hưởng đến quy trình chính
    }
  }

  static async sendContractApprovalNotification(
    contract: Contract,
    nextApprover: User,
    currentApprover: User,
    status: "approved" | "rejected",
    comments?: string
  ) {
    const subject = `Contract ${
      contract.contractNumber
    } - ${status.toUpperCase()}`;

    const html = `
      <h2>Contract ${status.toUpperCase()}</h2>
      <p>Dear ${nextApprover.fullName},</p>
      <p>Contract number <strong>${
        contract.contractNumber
      }</strong> has been ${status} by ${currentApprover.fullName}.</p>
      ${comments ? `<p>Comments: ${comments}</p>` : ""}
      ${
        status === "approved"
          ? `
        <p>The contract is now waiting for your approval. Please review and take action.</p>
      `
          : ""
      }
      <br>
      <p>Best regards,</p>
      <p>Your Application Team</p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: nextApprover.email,
        subject,
        html,
      });
    } catch (error) {
      console.error("Error sending email:", error);
    }
  }

  static async sendContractCompletionEmail(contract: Contract, user: User) {
    const subject = `Congratulations! Contract ${contract.contractNumber} is Completed`;
    const html = `
      <h2>Contract Completed</h2>
      <p>Dear ${user.fullName},</p>
      <p>We are pleased to inform you that contract number <strong>${contract.contractNumber}</strong> has been successfully completed.</p>
      <p>Thank you for your cooperation and trust in our services.</p>
      <br>
      <p>Best regards,</p>
      <p>Your Application Team</p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject,
        html,
      });
      console.log(`Completion email sent to ${user.email}`);
    } catch (error) {
      console.error("Error sending completion email:", error);
    }
  }

  static async sendOTPEmail(email: string, otp: string) {
    const subject = `Mã OTP xác thực`;
    const html = `
      <h2>Xác thực OTP</h2>
      <p>Mã OTP của bạn là: <strong>${otp}</strong></p>
      <p>Mã này sẽ hết hạn trong vòng 5 phút.</p>
      <p>Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
      <br>
      <p>Trân trọng,</p>
      <p>Đội ngũ ứng dụng</p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject,
        html,
      });
      console.log(`OTP email sent to ${email}`);
      return true;
    } catch (error) {
      console.error("Error sending OTP email:", error);
      throw new Error("Failed to send OTP email");
    }
  }
}

export default EmailService;
