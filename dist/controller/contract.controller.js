"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const data_source_1 = __importDefault(require("../database/data-source"));
const contract_services_1 = __importDefault(require("../services/contract.services"));
const user_entity_1 = require("../models/user.entity");
const approval_flow_entity_1 = require("../models/approval_flow.entity");
const contract_signature_entity_1 = require("../models/contract_signature.entity");
const contract_entity_1 = require("../models/contract.entity");
const path = require("path");
let approvalFlowRepo = data_source_1.default.getRepository(approval_flow_entity_1.ApprovalFlow);
let contractSignatureRepo = data_source_1.default.getRepository(contract_signature_entity_1.ContractSignature);
let contractRepo = data_source_1.default.getRepository(contract_entity_1.Contract);
let userRepo = data_source_1.default.getRepository(user_entity_1.User);
class contractController {
    createContract(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { contractNumber, customerId, contractType, approvalTemplateId, createdById, signers, note, } = req.body;
                if (!contractNumber ||
                    !customerId ||
                    !approvalTemplateId ||
                    !createdById ||
                    !(signers === null || signers === void 0 ? void 0 : signers.length)) {
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
                const contract = yield contract_services_1.default.addContract(contractNumber, customerId, contractType, approvalTemplateId, createdById, JSON.parse(signers), note, pdfFilePath);
                return res.status(200).json({
                    message: "Contract created successfully",
                    data: contract,
                });
            }
            catch (e) {
                return res.status(500).json({ message: e.message });
            }
        });
    }
    updateContract(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, contractNumber, customer, contractType, approvalTemplateId, note, signers, createdById, } = req.body;
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
                const result = yield contract_services_1.default.updateContract(id, contractNumber, customer, contractType, createdById, note, approvalTemplateId, signersParsed, pdfFilePath);
                return res.status(200).json(result);
            }
            catch (e) {
                return res.status(400).json({
                    success: false,
                    message: e.message,
                    details: "Failed to update contract",
                });
            }
        });
    }
    allContract(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { contractNumber, status, createdById, customerId, page = 1, limit = 10, } = req.query;
                const contracts = yield contract_services_1.default.allContracts(contractNumber, status, createdById ? parseInt(createdById) : undefined, customerId ? parseInt(customerId) : undefined, parseInt(page), parseInt(limit));
                res.status(200).json(contracts);
            }
            catch (e) {
                res.status(404).json({ message: e.message });
            }
        });
    }
    getDetails(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let idContract = req.body.id;
                const contracts = yield contract_services_1.default.getDetail(idContract);
                res.status(200).json(contracts);
            }
            catch (e) {
                res.status(404).json({ message: e.message });
            }
        });
    }
    successContract(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id, status } = req.body;
                if (!id || !status) {
                    return res.status(400).json({
                        message: "Contract ID and status are required",
                    });
                }
                if (status === "signed") {
                    const approvalFlow = yield approvalFlowRepo.find({
                        where: { contract: { id }, approvalStatus: "approved" },
                    });
                    const contractSignatures = yield contractSignatureRepo.find({
                        where: { contract: { id }, status: "signed" },
                    });
                    if (!approvalFlow && !contractSignatures) {
                        return res.status(400).json({
                            message: "Cannot update contract status to signed. All approvals and signatures must be completed first.",
                        });
                    }
                    yield contractRepo.update(id, { status: "signed" });
                    return res.status(200).json({
                        message: "Contract status updated to signed successfully",
                    });
                }
                else if (status === "rejected") {
                    yield contractRepo.update(id, {
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
            }
            catch (error) {
                return res.status(500).json({
                    message: error.message,
                });
            }
        });
    }
    deleteMultipleContracts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { ids } = req.body; // Nhận một mảng các id cần xóa
                if (!Array.isArray(ids) || ids.length === 0) {
                    return res.status(400).json({
                        message: "Please provide an array of contract IDs to delete",
                    });
                }
                yield contractRepo.delete(ids);
                return res.status(200).json({
                    message: `Successfully deleted ${ids.length} contracts`,
                });
            }
            catch (e) {
                return res.status(500).json({
                    message: e.message,
                });
            }
        });
    }
    rejectMultipleContracts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                yield contractRepo.update(ids, {
                    status: "rejected",
                    note: note,
                });
                return res.status(200).json({
                    message: `Successfully rejected ${ids.length} contracts`,
                });
            }
            catch (e) {
                return res.status(500).json({
                    message: e.message,
                });
            }
        });
    }
    searchContracts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { contractNumber, customerInfo, // Thông tin khách hàng (tên hoặc số điện thoại)
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
                    queryBuilder.andWhere("(customer.name LIKE :customerInfo OR customer.phone LIKE :customerInfo)", { customerInfo: `%${customerInfo}%` });
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
                const contracts = yield queryBuilder.getMany();
                return res.status(200).json(contracts);
            }
            catch (e) {
                return res.status(500).json({
                    message: e.message,
                });
            }
        });
    }
    countContractsByStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const counts = yield contractRepo
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
            }
            catch (e) {
                return res.status(500).json({
                    message: e.message,
                });
            }
        });
    }
    signContract(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { contractId, signerId } = req.body;
                if (!contractId || !signerId || !req.file) {
                    return res.status(400).json({
                        message: "Missing required fields",
                        required: ["contractId", "signerId", "PDF file"],
                    });
                }
                // Get the PDF file path from the uploaded file
                const pdfFilePath = `/uploads/${path.basename(req.file.path)}`;
                const result = yield contract_services_1.default.signContract(contractId, signerId, pdfFilePath);
                return res.status(200).json(result);
            }
            catch (e) {
                return res.status(500).json({
                    success: false,
                    message: e.message,
                });
            }
        });
    }
    submitForApproval(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const result = yield contract_services_1.default.submitMultipleForApproval(contractIds, userId);
                return res.status(200).json(result);
            }
            catch (e) {
                return res.status(500).json({ message: e.message });
            }
        });
    }
    approveMultipleContracts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const result = yield contract_services_1.default.approveMultipleContracts(contracts, status, approverId);
                // Thêm thông tin chi tiết về việc reset nếu reject
                if (status === "rejected") {
                    return res.status(200).json(Object.assign(Object.assign({}, result), { message: "Contracts rejected and reset to draft status. All approvals and signatures have been cleared.", details: "These contracts will need to go through the entire approval and signing process again." }));
                }
                return res.status(200).json(result);
            }
            catch (e) {
                return res.status(500).json({ message: e.message });
            }
        });
    }
    cancelContracts(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
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
                        message: "Please provide a valid cancellation reason (minimum 10 characters)",
                    });
                }
                if (reason.trim().length > 500) {
                    return res.status(400).json({
                        message: "Cancellation reason is too long (maximum 500 characters)",
                    });
                }
                const result = yield contract_services_1.default.cancelContracts(contractIds, userId, reason.trim());
                return res.status(200).json(result);
            }
            catch (e) {
                return res.status(500).json({
                    message: e.message,
                });
            }
        });
    }
    getContractStatistics(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield contract_services_1.default.getContractStatistics();
                return res.status(200).json(stats);
            }
            catch (e) {
                return res.status(500).json({
                    message: e.message,
                });
            }
        });
    }
}
exports.default = contractController;
//# sourceMappingURL=contract.controller.js.map