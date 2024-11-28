import dataSource from "../database/data-source";
import contractService from "../services/contract.services";
import { User } from "../models/user.entity";
import { ApprovalFlow } from "../models/approval_flow.entity";
import { ContractSignature } from "../models/contract_signature.entity";
import { Contract } from "../models/contract.entity";
const path = require("path");

let approvalFlowRepo = dataSource.getRepository(ApprovalFlow);
let contractSignatureRepo = dataSource.getRepository(ContractSignature);
let contractRepo = dataSource.getRepository(Contract);
let userRepo = dataSource.getRepository(User);

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
        signersCount,
        status,
        note,
      } = req.body;
      const createdBy = req.user.id;
      const contract = await contractService.updateContract(
        id,
        contractNumber,
        customer,
        contractType,
        createdBy,
        signersCount,
        status,
        note
      );

      res.status(200).json(contract);
    } catch (e) {
      res.status(404).json({ message: e.message });
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
    const { id, status } = req.body;
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
    }
    await contractRepo.update(id, { status: "signed" });

    return res.status(200).json({
      message: "Contract status updated to signed successfully",
    });
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
      const { contracts, signerId } = req.body;

      if (!Array.isArray(contracts) || contracts.length === 0 || !signerId) {
        return res.status(400).json({
          message: "Missing required fields",
          required: [
            {
              contracts: "array of contract IDs",
              signerId: "number",
            },
          ],
        });
      }

      // Kiểm tra xem signer có tồn tại không
      const signer = await userRepo.findOneBy({ id: signerId });
      if (!signer) {
        return res.status(404).json({
          message: "Signer not found",
        });
      }

      const results = {
        success: [],
        failed: [],
      };

      for (const contractId of contracts) {
        try {
          const result = await contractService.signContract(
            contractId,
            signerId
          );
          results.success.push({
            contractId,
            message: result.message,
          });
        } catch (error) {
          results.failed.push({
            contractId,
            error: error.message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `Successfully signed ${results.success.length} contracts, ${results.failed.length} failed`,
        data: {
          successfulContracts: results.success,
          failedContracts: results.failed,
          totalProcessed: contracts.length,
        },
      });
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
          message: "Missing required fields",
          required: ["status", "approverId"],
        });
      }

      // Validate contracts array
      if (!Array.isArray(contracts) || contracts.length === 0) {
        return res.status(400).json({
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
        if (!contract.contractId) {
          return res.status(400).json({
            message: "Missing contractId in one or more contracts",
          });
        }
      }

      const result = await contractService.approveMultipleContracts(
        contracts,
        status,
        approverId
      );

      return res.status(200).json(result);
    } catch (e) {
      return res.status(500).json({ message: e.message });
    }
  }
}

export default contractController;
