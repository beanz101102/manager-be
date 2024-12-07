import nodemailer from "nodemailer";
import { User } from "../models/user.entity";
import { Contract } from "../models/contract.entity";

class EmailService {
  private static transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "Nduythai0101@gmail.com",
      pass: "hesnmlyqblfpkzzj",
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
    }
  }

  static async sendNewContractEmail(contract: Contract, customer: User) {
    const subject = `Hợp đồng mới ${contract.contractNumber}`;
    const html = `
      <h2>Thông báo hợp đồng mới</h2>
      <p>Kính gửi ${customer.fullName},</p>
      <p>Hợp đồng số <strong>${contract.contractNumber}</strong> đã được tạo.</p>
      <p>Chúng tôi sẽ thông báo cho bạn khi hợp đồng sẵn sàng để ký.</p>
      <br>
      <p>Trân trọng,</p>
      <p>Đội ngũ ứng dụng</p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: customer.email,
        subject,
        html,
      });
      console.log(`Đã gửi email thông báo hợp đồng mới đến ${customer.email}`);
    } catch (error) {
      console.error("Lỗi khi gửi email:", error);
    }
  }

  static async sendContractCompletionEmail(contract: Contract, user: User) {
    const subject = `Hợp đồng ${contract.contractNumber} đã hoàn thành`;
    const html = `
      <h2>Hợp đồng đã hoàn thành</h2>
      <p>Kính gửi ${user.fullName},</p>
      <p>Hợp đồng số <strong>${contract.contractNumber}</strong> đã được hoàn thành.</p>
      <p>Cảm ơn sự hợp tác của bạn.</p>
      <br>
      <p>Trân trọng,</p>
      <p>Đội ngũ ứng dụng</p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject,
        html,
      });
    } catch (error) {
      console.error("Lỗi khi gửi email:", error);
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
      <p>Đội ngũ ứng d��ng</p>
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
