import dataSource from "../database/data-source";
import contractService from "../services/contract.services";
import { User } from "../models/user.entity";
import { ApprovalFlow } from "../models/approval_flow.entity";
import { ContractSignature } from "../models/contract_signature.entity";
import { Contract } from "../models/contract.entity";
import { Redis } from "ioredis";
import EmailService from "../services/email.service";
import NotificationService from "../services/notification.services";
import ContractNotificationService from "../services/contract-notification.service";
const path = require("path");

let approvalFlowRepo = dataSource.getRepository(ApprovalFlow);
let contractSignatureRepo = dataSource.getRepository(ContractSignature);
let contractRepo = dataSource.getRepository(Contract);
let userRepo = dataSource.getRepository(User);

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
});

class contractController {
  async createContract(req, res) {
    try {
      const {
        contractNumber,
        customerId,
        contractType,
        approvalTemplateId,
        createdById,
        signers,
        note,
      } = req.body;

      if (
        !contractNumber ||
        !customerId ||
        !approvalTemplateId ||
        !createdById ||
        !signers?.length
      ) {
        return res.status(400).json({
          message: "Missing required fields",
          required: [
            "contractNumber",
            "customerId",
            "approvalTemplateId",
            "createdById",
            "signers",
          ],
        });
      }

      const pdfFilePath = req.file
        ? `/uploads/${path.basename(req.file.path)}`
        : null;

      if (!pdfFilePath) {
        return res.status(400).json({
          message: "Contract file is required",
        });
      }

      const contract = await contractService.addContract(
        contractNumber,
        customerId,
        contractType,
        approvalTemplateId,
        createdById,
        JSON.parse(signers),
        note,
        pdfFilePath
      );

      return res.status(200).json({
        message: "Contract created successfully",
        data: contract,
      });
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }
  async updateContract(req, res) {
    try {
      const {
        id,
        contractNumber,
        customer,
        contractType,
        approvalTemplateId,
        note,
        signers,
        createdById,
      } = req.body;

      const signersParsed = JSON.parse(signers);

      // Validate signers array if provided
      if (signersParsed) {
        if (!Array.isArray(signersParsed)) {
          return res.status(400).json({
            success: false,
            message: "Signers must be an array",
          });
        }

        // Kiểm tra tính hợp lệ của mỗi người ký
        for (const signer of signersParsed) {
          if (!signer.userId || !signer.order) {
            return res.status(400).json({
              success: false,
              message: "Each signer must have userId and order",
            });
          }
        }

        // Kiểm tra thứ tự ký có bị trùng không
        const orders = signersParsed.map((s) => s.order);
        if (new Set(orders).size !== orders.length) {
          return res.status(400).json({
            success: false,
            message: "Duplicate sign orders are not allowed",
          });
        }
      }

      // Lấy đường dẫn file PDF mới nếu có
      const pdfFilePath = req.file
        ? `/uploads/${path.basename(req.file.path)}`
        : null;

      const result = await contractService.updateContract(
        id,
        contractNumber,
        customer,
        contractType,
        createdById,
        note,
        approvalTemplateId,
        signersParsed,
        pdfFilePath
      );

      return res.status(200).json(result);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: e.message,
        details: "Failed to update contract",
      });
    }
  }

  async allContract(req, res) {
    try {
      const {
        contractNumber,
        status,
        createdById,
        customerId,
        page = 1,
        limit = 10,
      } = req.query;

      const contracts = await contractService.allContracts(
        contractNumber,
        status,
        createdById ? parseInt(createdById as string) : undefined,
        customerId ? parseInt(customerId as string) : undefined,
        parseInt(page as string),
        parseInt(limit as string)
      );

      res.status(200).json(contracts);
    } catch (e) {
      res.status(404).json({ message: e.message });
    }
  }

  async getDetails(req, res) {
    try {
      let idContract = req.body.id;
      const contracts = await contractService.getDetail(idContract);
      res.status(200).json(contracts);
    } catch (e) {
      res.status(404).json({ message: e.message });
    }
  }
  async successContract(req, res) {
    try {
      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json({
          message: "Contract ID and status are required",
        });
      }

      if (status === "signed") {
        const approvalFlow = await approvalFlowRepo.find({
          where: { contract: { id }, approvalStatus: "approved" },
        });

        const contractSignatures = await contractSignatureRepo.find({
          where: { contract: { id }, status: "signed" },
        });

        if (!approvalFlow && !contractSignatures) {
          return res.status(400).json({
            message:
              "Cannot update contract status to signed. All approvals and signatures must be completed first.",
          });
        }

        await contractRepo.update(id, { status: "signed" });
        return res.status(200).json({
          message: "Contract status updated to signed successfully",
        });
      } else if (status === "rejected") {
        await contractRepo.update(id, {
          status: "rejected",
          note: req.body.note || "Contract rejected",
        });
        return res.status(200).json({
          message: "Contract status updated to rejected successfully",
        });
      }

      return res.status(400).json({
        message: "Invalid status. Supported values are 'signed' and 'rejected'",
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message,
      });
    }
  }
  async deleteMultipleContracts(req, res) {
    try {
      const { ids } = req.body; // Nhận một mảng các id cần xóa

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          message: "Please provide an array of contract IDs to delete",
        });
      }

      await contractRepo.delete(ids);

      return res.status(200).json({
        message: `Successfully deleted ${ids.length} contracts`,
      });
    } catch (e) {
      return res.status(500).json({
        message: e.message,
      });
    }
  }
  async rejectMultipleContracts(req, res) {
    try {
      const { ids, note } = req.body;

      // Kiểm tra đầu vào
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          message: "Please provide an array of contract IDs to reject",
        });
      }

      if (!note || note.trim() === "") {
        return res.status(400).json({
          message: "Note is required when rejecting contracts",
        });
      }

      // Cập nhật nhiều contracts
      await contractRepo.update(ids, {
        status: "rejected",
        note: note,
      });

      return res.status(200).json({
        message: `Successfully rejected ${ids.length} contracts`,
      });
    } catch (e) {
      return res.status(500).json({
        message: e.message,
      });
    }
  }
  async searchContracts(req, res) {
    try {
      const {
        contractNumber,
        customerInfo, // Thông tin khách hàng (tên hoặc số điện thoại)
        creator, // Người tạo
        status, // Trạng thái hợp đồng
        fromDate, // Từ ngày
        toDate, // Đến ngày
      } = req.query;

      const queryBuilder = contractRepo
        .createQueryBuilder("contract")
        .leftJoinAndSelect("contract.customer", "customer")
        .leftJoinAndSelect("contract.createdBy", "user");

      // Tìm theo số hợp đồng
      if (contractNumber) {
        queryBuilder.andWhere("contract.contractNumber LIKE :contractNumber", {
          contractNumber: `%${contractNumber}%`,
        });
      }

      // Tìm theo thông tin khách hàng
      if (customerInfo) {
        queryBuilder.andWhere(
          "(customer.name LIKE :customerInfo OR customer.phone LIKE :customerInfo)",
          { customerInfo: `%${customerInfo}%` }
        );
      }

      // Tìm theo người tạo
      if (creator) {
        queryBuilder.andWhere("user.name LIKE :creator", {
          creator: `%${creator}%`,
        });
      }

      // Tìm theo trạng thái
      if (status) {
        queryBuilder.andWhere("contract.status = :status", { status });
      }

      // Tìm theo khoảng thời gian
      if (fromDate) {
        queryBuilder.andWhere("contract.createdAt >= :fromDate", {
          fromDate: new Date(fromDate),
        });
      }

      if (toDate) {
        queryBuilder.andWhere("contract.createdAt <= :toDate", {
          toDate: new Date(toDate),
        });
      }

      const contracts = await queryBuilder.getMany();

      return res.status(200).json(contracts);
    } catch (e) {
      return res.status(500).json({
        message: e.message,
      });
    }
  }
  async countContractsByStatus(req, res) {
    try {
      const counts = await contractRepo
        .createQueryBuilder("contract")
        .select("contract.status", "status")
        .addSelect("COUNT(contract.id)", "count")
        .groupBy("contract.status")
        .getRawMany();

      const result = {
        new: 0,
        pending: 0,
        signed: 0,
        rejected: 0,
      };

      counts.forEach((item) => {
        result[item.status] = parseInt(item.count);
      });

      return res.status(200).json({
        total: Object.values(result).reduce((a, b) => a + b, 0),
        statusCounts: result,
      });
    } catch (e) {
      return res.status(500).json({
        message: e.message,
      });
    }
  }

  async signContract(req, res) {
    try {
      const { contractId, signerId, otp } = req.body;

      // Check required fields
      if (!contractId || !signerId || !req.file || !otp) {
        return res.status(400).json({
          message: "Missing required fields",
          required: ["contractId", "signerId", "PDF file", "otp"],
        });
      }

      // Get user's email from signerId
      const signer = await userRepo.findOne({ where: { id: signerId } });
      if (!signer || !signer.email) {
        return res.status(400).json({
          success: false,
          message: "Signer not found or email not available",
        });
      }

      // Verify OTP
      const storedOTP = await redis.get(`otp:${signer.email}`);
      if (!storedOTP) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired or is invalid",
        });
      }

      if (otp !== storedOTP) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // Delete used OTP
      await redis.del(`otp:${signer.email}`);

      // Get the PDF file path from the uploaded file
      const pdfFilePath = `/uploads/${path.basename(req.file.path)}`;

      const result = await contractService.signContract(
        contractId,
        signerId,
        pdfFilePath
      );

      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  }
  async submitForApproval(req, res) {
    try {
      const { contractIds, userId } = req.body;

      // Kiểm tra đầu vào
      if (!Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({
          message: "Please provide an array of contract IDs to submit",
        });
      }

      if (!userId) {
        return res.status(400).json({
          message: "User ID is required",
        });
      }

      const result = await contractService.submitMultipleForApproval(
        contractIds,
        userId
      );
      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }
  async approveMultipleContracts(req, res) {
    try {
      const { contracts, status, approverId } = req.body;

      // Validate main inputs
      if (!status || !approverId) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
          required: ["status", "approverId"],
        });
      }

      // Validate status value
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Must be either 'approved' or 'rejected'",
        });
      }

      // Validate contracts array
      if (!Array.isArray(contracts) || contracts.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide an array of contracts",
          required: [
            {
              contractId: "number",
              comments: "string (optional)",
            },
          ],
        });
      }

      // Validate each contract object
      for (const contract of contracts) {
        if (!contract.contractId || typeof contract.contractId !== "number") {
          return res.status(400).json({
            success: false,
            message: "Each contract must have a valid contractId (number)",
          });
        }
      }

      const result = await contractService.approveMultipleContracts(
        contracts,
        status,
        approverId
      );

      // Kiểm tra kết quả t� service
      if (result.data.failedContracts.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Some contracts could not be ${status}`,
          details: {
            successful: result.data.successfulContracts,
            failed: result.data.failedContracts.map((f) => ({
              contractId: f.contractId,
              reason: f.error,
            })),
          },
        });
      }

      // Thêm thông tin chi tiết về việc reset nếu reject
      if (status === "rejected") {
        return res.status(200).json({
          success: true,
          message:
            "Contracts rejected and reset to draft status. All approvals and signatures have been cleared.",
          details: {
            successful: result.data.successfulContracts,
            message:
              "These contracts will need to go through the entire approval and signing process again.",
          },
        });
      }

      return res.status(200).json({
        success: true,
        message: `Successfully ${status} all contracts`,
        data: result.data,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: "An error occurred while processing the approval",
        error: e.message,
      });
    }
  }
  async cancelContracts(req, res) {
    try {
      const { contractIds, reason, userId } = req.body;

      // Validate input
      if (!Array.isArray(contractIds) || contractIds.length === 0) {
        return res.status(400).json({
          message: "Please provide an array of contract IDs to cancel",
        });
      }

      // Validate reason
      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          message:
            "Please provide a valid cancellation reason (minimum 10 characters)",
        });
      }

      if (reason.trim().length > 500) {
        return res.status(400).json({
          message: "Cancellation reason is too long (maximum 500 characters)",
        });
      }

      const result = await contractService.cancelContracts(
        contractIds,
        userId,
        reason.trim()
      );

      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({
        message: e.message,
      });
    }
  }
  async getContractStatistics(req, res) {
    try {
      const stats = await contractService.getContractStatistics();
      return res.status(200).json(stats);
    } catch (e) {
      return res.status(500).json({
        message: e.message,
      });
    }
  }
  async getCancelledContractsInTimeRange(req, res) {
    try {
      const { startTime, endTime } = req.query;

      // Validate input
      if (!startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: "Both startTime and endTime are required (in seconds)",
        });
      }

      // Convert to numbers and validate
      const start = Number(startTime);
      const end = Number(endTime);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
          success: false,
          message: "startTime and endTime must be valid numbers",
        });
      }

      if (end < start) {
        return res.status(400).json({
          success: false,
          message: "endTime must be greater than startTime",
        });
      }

      const result = await contractService.getCancelledContractsInTimeRange(
        start,
        end
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  }
  async getContractsInTimeRange(req, res) {
    try {
      const { startTime, endTime, status } = req.query;

      // Validate input
      if (!startTime || !endTime || !status) {
        return res.status(400).json({
          success: false,
          message: "startTime, endTime (in seconds) and status are required",
        });
      }

      // Convert to numbers and validate
      const start = Number(startTime);
      const end = Number(endTime);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({
          success: false,
          message: "startTime and endTime must be valid numbers",
        });
      }

      if (end < start) {
        return res.status(400).json({
          success: false,
          message: "endTime must be greater than startTime",
        });
      }

      const result = await contractService.getContractsInTimeRange(
        start,
        end,
        status as string
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  }
  async getCustomerContractReport(req, res) {
    try {
      const { startTime, endTime, customerId } = req.query;
  
      const report = await contractService.getCustomerContractReport({
        startTime: startTime ? Number(startTime) : undefined,
        endTime: endTime ? Number(endTime) : undefined,
        customerId: customerId ? Number(customerId) : undefined,
      });
  
      return res.status(200).json({
        success: true,
        data: report,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  }
  async getAdvancedStatistics(req, res) {
    try {
      const { startTime, endTime, status, createdById, customerId } = req.query;

      const result = await contractService.getAdvancedStatistics({
        startTime: startTime ? Number(startTime) : undefined,
        endTime: endTime ? Number(endTime) : undefined,
        status,
        createdById: createdById ? Number(createdById) : undefined,
        customerId: customerId ? Number(customerId) : undefined,
      });

      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: e.message,
      });
    }
  }
  async sendOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in Redis with 5 minutes expiration
      await redis.set(`otp:${email}`, otp, "EX", 300);

      // Send OTP via email
      await EmailService.sendOTPEmail(email, otp);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: "Email and OTP are required",
        });
      }

      // Get stored OTP from Redis
      const storedOTP = await redis.get(`otp:${email}`);

      if (!storedOTP) {
        return res.status(400).json({
          success: false,
          message: "OTP has expired or is invalid",
        });
      }

      if (otp !== storedOTP) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      // Delete used OTP
      await redis.del(`otp:${email}`);

      return res.status(200).json({
        success: true,
        message: "OTP verified successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async addFeedback(req, res) {
    try {
      const { contractId, name, content, tag } = req.body;

      // Validate input
      if (!contractId || !name || !content) {
        return res.status(400).json({
          success: false,
          message: "Contract ID, name and content are required",
          required: ["contractId", "name", "content"],
        });
      }

      // Validate content length
      if (content.length < 10) {
        return res.status(400).json({
          success: false,
          message: "Feedback content must be at least 10 characters long",
        });
      }

      const result = await contractService.addFeedback(contractId, {
        name,
        content,
        tag,
      });

      res.status(200).json(result);

      setImmediate(async () => {
        try {
          const contract = await contractRepo.findOne({
            where: { id: contractId },
            relations: ["createdBy"],
          });

          if (contract && contract.createdBy) {
            await ContractNotificationService.sendContractNotifications(
              contract,
              [contract.createdBy],
              "contract_feedback",
              `Hợp đồng ${
                contract.contractNumber
              } có phản hồi mới từ ${name}: "${content.substring(0, 50)}${
                content.length > 50 ? "..." : ""
              }"`
            );
          }
        } catch (error) {
          console.error("Error sending feedback notification:", error);
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getFeedback(req, res) {
    try {
      const { contractId } = req.body;

      if (!contractId) {
        return res.status(400).json({
          success: false,
          message: "Contract ID is required",
        });
      }

      const result = await contractService.getFeedback(parseInt(contractId));

      // Format response để trả về array feedback trực tiếp nếu cần
      return res.status(200).json({
        success: true,
        contractId: result.data.contractId,
        contractNumber: result.data.contractNumber,
        totalFeedback: result.data.totalFeedback,
        feedback: result.data.feedback, // Array of feedback
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default contractController;
