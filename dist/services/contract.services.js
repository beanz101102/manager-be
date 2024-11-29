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
const user_entity_1 = require("../models/user.entity");
const data_source_1 = __importDefault(require("../database/data-source"));
const contract_entity_1 = require("../models/contract.entity");
const typeorm_1 = require("typeorm");
const approval_template_entity_1 = require("../models/approval_template.entity");
const typeorm_2 = require("typeorm");
const approval_template_step_entity_1 = require("../models/approval_template_step.entity");
const contract_approval_entity_1 = require("../models/contract_approval.entity");
const email_service_1 = __importDefault(require("../services/email.service"));
const typeorm_3 = require("typeorm");
let contractRepo = data_source_1.default.getRepository(contract_entity_1.Contract);
let signerRepo = data_source_1.default.getRepository(contract_entity_1.ContractSigner);
let stepRepo = data_source_1.default.getRepository(approval_template_entity_1.ApprovalTemplate);
class contractService {
    static addContract(contractNumber, customerId, contractType, approvalTemplateId, createdById, signerIds, note, pdfFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const [customer, createdBy, approvalTemplate] = yield Promise.all([
                    data_source_1.default.getRepository(user_entity_1.User).findOneBy({ id: customerId }),
                    data_source_1.default.getRepository(user_entity_1.User).findOneBy({ id: createdById }),
                    data_source_1.default
                        .getRepository(approval_template_entity_1.ApprovalTemplate)
                        .findOneBy({ id: approvalTemplateId }),
                ]);
                if (!customer)
                    throw new Error("Customer not found");
                if (!createdBy)
                    throw new Error("Created by user not found");
                if (!approvalTemplate)
                    throw new Error("Approval template not found");
                let contract = new contract_entity_1.Contract();
                contract.contractNumber = contractNumber;
                contract.customer = customer;
                contract.contractType = contractType;
                contract.approvalTemplate = approvalTemplate;
                contract.createdBy = createdBy;
                contract.note = note;
                contract.pdfFilePath = pdfFilePath;
                contract.status = "draft";
                contract = yield transactionalEntityManager.save(contract);
                const signerEntities = (signerIds === null || signerIds === void 0 ? void 0 : signerIds.map(({ userId, order }) => {
                    const signer = new contract_entity_1.ContractSigner();
                    signer.contract = contract;
                    signer.signer = { id: userId };
                    signer.signOrder = order;
                    return signer;
                })) || [];
                yield transactionalEntityManager.save(contract_entity_1.ContractSigner, signerEntities);
                return contract;
            }));
        });
    }
    static updateContract(id, contractNumber, customer, contractType, createdBy, signersCount, status, note) {
        return __awaiter(this, void 0, void 0, function* () {
            let contract = yield contractRepo.findOneBy({ id: id });
            contract.contractNumber = contractNumber;
            contract.customer = customer;
            contract.contractType = contractType;
            contract.createdBy = createdBy;
            contract.status = status;
            contract.note = note;
            yield contractRepo.save(contract);
        });
    }
    static allContracts(contractNumber_1, status_1, createdById_1, customerId_1) {
        return __awaiter(this, arguments, void 0, function* (contractNumber, status, createdById, customerId, page = 1, limit = 10) {
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
            };
            if (createdById) {
                query.where = [
                    { createdBy: { id: createdById } },
                    { contractApprovals: { approver: { id: createdById } } },
                    { contractSigners: { signer: { id: createdById } } },
                ];
            }
            else {
                query.where = [{}];
            }
            if (contractNumber) {
                query.where = query.where.map((condition) => (Object.assign(Object.assign({}, condition), { contractNumber: (0, typeorm_1.Like)(`%${contractNumber}%`) })));
            }
            if (status) {
                query.where = query.where.map((condition) => (Object.assign(Object.assign({}, condition), { status: status })));
            }
            if (customerId) {
                query.where = query.where.map((condition) => (Object.assign(Object.assign({}, condition), { customer: { id: customerId } })));
            }
            let [contracts, total] = yield contractRepo.findAndCount(query);
            const formattedContracts = contracts.map((contract) => {
                var _a, _b, _c, _d;
                return (Object.assign(Object.assign({}, contract), { approvedUserIds: ((_b = (_a = contract.contractApprovals) === null || _a === void 0 ? void 0 : _a.filter((approval) => approval.status === "approved")) === null || _b === void 0 ? void 0 : _b.map((approval) => approval.approverId)) || [], signedUserIds: ((_d = (_c = contract.contractSigners) === null || _c === void 0 ? void 0 : _c.filter((signer) => signer.status === "signed")) === null || _d === void 0 ? void 0 : _d.map((signer) => signer.signer.id)) || [] }));
            });
            return {
                data: formattedContracts,
                total,
                page,
                totalPages: Math.ceil(total / limit),
            };
        });
    }
    static getDetail(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            let contract = yield contractRepo.findOne({
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
            const templateSteps = yield data_source_1.default
                .getRepository(approval_template_step_entity_1.ApprovalTemplateStep)
                .find({
                where: { templateId: contract.approvalTemplate.id },
                relations: ["approver", "approver.department"],
                order: { stepOrder: "ASC" },
            });
            // Format the response to include approval and signing information
            const formattedContract = Object.assign(Object.assign({}, contract), { approvals: templateSteps.map((step) => {
                    var _a;
                    // Find matching approval if it exists
                    const existingApproval = (_a = contract.contractApprovals) === null || _a === void 0 ? void 0 : _a.find((approval) => approval.templateStep.stepOrder === step.stepOrder);
                    return {
                        approver: {
                            id: step.approver.id,
                            name: step.approver.fullName,
                            email: step.approver.email,
                            role: step.approver.role,
                            department: step.approver.department,
                        },
                        status: (existingApproval === null || existingApproval === void 0 ? void 0 : existingApproval.status) || "pending",
                        comments: (existingApproval === null || existingApproval === void 0 ? void 0 : existingApproval.comments) || null,
                        approvedAt: (existingApproval === null || existingApproval === void 0 ? void 0 : existingApproval.approvedAt) || null,
                        stepOrder: step.stepOrder,
                    };
                }), signers: (_a = contract.contractSigners) === null || _a === void 0 ? void 0 : _a.map((signer) => ({
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
                })).sort((a, b) => a.signOrder - b.signOrder) });
            // Remove the raw relations from the response
            delete formattedContract.contractApprovals;
            delete formattedContract.contractSigners;
            return formattedContract;
        });
    }
    static approveContract(contractId, userId, status, comments) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                // 1. Kiểm tra hợp đồng và template
                const contract = yield contractRepo.findOne({
                    where: { id: contractId },
                    relations: ["approvalTemplate"],
                });
                if (!contract) {
                    throw new Error("Contract not found");
                }
                // 2. Lấy tất cả các bước phê duyệt của template
                const templateSteps = yield data_source_1.default
                    .getRepository(approval_template_step_entity_1.ApprovalTemplateStep)
                    .find({
                    where: { templateId: contract.approvalTemplate.id },
                    order: { stepOrder: "ASC" },
                });
                // 3. Lấy lịch sử phê duyệt
                const approvalHistory = yield data_source_1.default
                    .getRepository(contract_approval_entity_1.ContractApproval)
                    .find({
                    where: { contractId },
                    relations: ["templateStep"],
                    order: { createdAt: "DESC" },
                });
                // 4. Xác định bước hiện tại
                const approvedSteps = approvalHistory.filter((a) => a.status === "approved");
                const currentStepOrder = approvedSteps.length + 1;
                const currentStep = templateSteps.find((s) => s.stepOrder === currentStepOrder);
                if (!currentStep) {
                    throw new Error("No pending approval step found");
                }
                if (currentStep.approverId !== userId) {
                    throw new Error("User not authorized to approve this step");
                }
                // 5. Tạo bản ghi phê duyệt
                const approval = new contract_approval_entity_1.ContractApproval();
                approval.contract = contract;
                approval.templateStep = currentStep;
                approval.approver = { id: userId };
                approval.status = status;
                approval.comments = comments;
                approval.approvedAt = new Date();
                yield transactionalEntityManager.save(approval);
                // 7. Cập nhật trạng thái hợp đồng
                if (status === "rejected") {
                    contract.status = "rejected";
                }
                else if (currentStepOrder === templateSteps.length) {
                    // Nếu là bước cuối cùng và approved
                    contract.status = "ready_to_sign"; // Đảm bảo giá trị này nằm trong ENUM
                }
                else {
                    contract.status = "pending_approval"; // Đảm bảo giá trị này nằm trong ENUM
                }
                yield transactionalEntityManager.save(contract);
                // Sau khi phê duyệt thành công
                if (status === "approved") {
                    if (currentStepOrder === templateSteps.length) {
                        // Nếu là bước cuối cùng, gửi email cho tất cả người ký
                        const contractSigners = yield transactionalEntityManager.find(contract_entity_1.ContractSigner, {
                            where: { contract: { id: contractId } },
                            relations: ["signer"],
                            order: { signOrder: "ASC" },
                        });
                        // Gửi email cho tất cả người ký
                        for (const signer of contractSigners) {
                            yield email_service_1.default.sendContractReadyToSignEmail(contract, signer.signer);
                        }
                    }
                    else {
                        // Nếu còn bước tiếp theo, gửi email cho người phê duyệt tiếp theo
                        const nextStep = templateSteps.find((s) => s.stepOrder === currentStepOrder + 1);
                        if (nextStep) {
                            const nextApprover = yield transactionalEntityManager
                                .getRepository(user_entity_1.User)
                                .findOneBy({ id: nextStep.approverId });
                            if (nextApprover) {
                                const currentApprover = yield transactionalEntityManager
                                    .getRepository(user_entity_1.User)
                                    .findOneBy({ id: userId });
                                yield email_service_1.default.sendContractApprovalNotification(contract, nextApprover, currentApprover, status, comments);
                            }
                        }
                    }
                }
                return {
                    success: true,
                    message: status === "approved"
                        ? currentStepOrder === templateSteps.length
                            ? "Contract is ready for signing"
                            : "Approval step completed"
                        : "Contract rejected",
                    data: {
                        approval,
                        contract,
                        nextStep: status === "approved" && currentStepOrder < templateSteps.length
                            ? templateSteps[currentStepOrder]
                            : null,
                    },
                };
            }));
        });
    }
    static signContract(contractId, signerId, pdfFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                // 1. Kiểm tra hợp đồng và người ký
                const contractSigner = yield transactionalEntityManager.findOne(contract_entity_1.ContractSigner, {
                    where: {
                        contract: { id: contractId },
                        signer: { id: signerId },
                        status: "pending",
                    },
                    relations: ["contract"],
                });
                if (!contractSigner) {
                    throw new Error("Invalid signer or contract already signed");
                }
                // 2. Kiểm tra trạng thái hợp đồng
                if (contractSigner.contract.status !== "ready_to_sign") {
                    throw new Error("Contract must be fully approved before signing");
                }
                // 3. Kiểm tra thứ tự ký
                const previousSigners = yield transactionalEntityManager.find(contract_entity_1.ContractSigner, {
                    where: {
                        contract: { id: contractId },
                        signOrder: (0, typeorm_2.LessThan)(contractSigner.signOrder),
                    },
                });
                if (previousSigners.some((s) => s.status !== "signed")) {
                    throw new Error("Previous signers must sign first");
                }
                // 4. Cập nhật trạng thái ký và PDF file path
                contractSigner.status = "signed";
                contractSigner.signedAt = new Date();
                yield transactionalEntityManager.save(contract_entity_1.ContractSigner, contractSigner);
                // Update contract's PDF file path
                contractSigner.contract.pdfFilePath = pdfFilePath;
                yield transactionalEntityManager.save(contract_entity_1.Contract, contractSigner.contract);
                // 5. Kiểm tra nếu tất cả đã ký
                const [totalSigners, signedSigners] = yield Promise.all([
                    transactionalEntityManager.count(contract_entity_1.ContractSigner, {
                        where: { contract: { id: contractId } },
                    }),
                    transactionalEntityManager.count(contract_entity_1.ContractSigner, {
                        where: {
                            contract: { id: contractId },
                            status: "signed",
                        },
                    }),
                ]);
                if (signedSigners === totalSigners) {
                    contractSigner.contract.status = "completed";
                    yield transactionalEntityManager.save(contract_entity_1.Contract, contractSigner.contract);
                }
                return {
                    success: true,
                    message: signedSigners === totalSigners
                        ? "Contract fully signed and completed"
                        : `Contract signed successfully. ${totalSigners - signedSigners} signers remaining`,
                    data: {
                        totalSigners,
                        signedSigners,
                        remainingSigners: totalSigners - signedSigners,
                        pdfFilePath,
                    },
                };
            }));
        });
    }
    static submitMultipleForApproval(contractIds, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                // Ly tất cả các hp đồng cần duyệt
                const contracts = yield contractRepo.find({
                    where: { id: (0, typeorm_3.In)(contractIds) },
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
                            throw new Error("Only draft contracts can be submitted for approval");
                        }
                        // Cập nhật trạng thái
                        contract.status = "pending_approval";
                        yield transactionalEntityManager.save(contract_entity_1.Contract, contract);
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
                    }
                    catch (error) {
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
            }));
        });
    }
    static approveMultipleContracts(contracts, status, approverId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const results = {
                    success: [],
                    failed: [],
                };
                for (const contract of contracts) {
                    try {
                        const result = yield this.approveContract(contract.contractId, approverId, status, contract.comments);
                        results.success.push({
                            contractId: contract.contractId,
                            message: result.message,
                        });
                    }
                    catch (error) {
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
            }));
        });
    }
    static cancelContracts(contractIds, userId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                // Get all contracts to cancel
                const contracts = yield contractRepo.find({
                    where: { id: (0, typeorm_3.In)(contractIds) },
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
                        if (contract.status === "completed" ||
                            contract.status === "cancelled") {
                            throw new Error(`Contract ${contract.contractNumber} cannot be cancelled in its current status`);
                        }
                        // Only allow creator to cancel
                        if (contract.createdBy.id !== userId) {
                            throw new Error(`Unauthorized to cancel contract ${contract.contractNumber}`);
                        }
                        // Update contract status and reason
                        contract.status = "cancelled";
                        contract.cancelReason = reason;
                        yield transactionalEntityManager.save(contract_entity_1.Contract, contract);
                        results.success.push({
                            contractId: contract.id,
                            contractNumber: contract.contractNumber,
                            message: "Successfully cancelled",
                            cancelReason: reason,
                        });
                    }
                    catch (error) {
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
            }));
        });
    }
    static getContractStatistics() {
        return __awaiter(this, void 0, void 0, function* () {
            const stats = yield contractRepo
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
        });
    }
}
exports.default = contractService;
//# sourceMappingURL=contract.services.js.map