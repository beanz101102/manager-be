import nodemailer from "nodemailer";
import { User } from "../models/user.entity";
import { Contract } from "../models/contract.entity";

class EmailService {
  private static transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "hungvuong@technixo.com", // Email Gmail của bạn
      pass: "jtlfweynujkxwose", // App Password từ Gmail
    },
  });

  static async sendContractReadyToSignEmail(contract: Contract, signer: User) {
    const subject = `Contract ${contract.contractNumber} is ready for your signature`;
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const html = `
      <h2>Contract Ready for Signature</h2>
      <p>Dear ${signer.fullName},</p>
      <p>Contract number <strong>${contract.contractNumber}</strong> has been approved and is now ready for your signature.</p>
      <p>Please log in to the application to review and sign the contract:</p>
      <p><a href="${appUrl}/contracts/${contract.id}/sign" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Sign Contract</a></p>
      <p>If you have any questions, please contact the contract creator.</p>
      <br>
      <p>Best regards,</p>
      <p>Your Application Team</p>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: signer.email,
        subject,
        html,
      });
      console.log(`Signature notification email sent to ${signer.email}`);
    } catch (error) {
      console.error("Error sending email:", error);
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
    const appUrl = process.env.APP_URL || "http://localhost:3000";

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
        <p>The contract is now waiting for your approval. Please review and take action:</p>
        <p><a href="${appUrl}/contracts/${contract.id}/approve" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Review Contract</a></p>
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
}

export default EmailService;
