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
const typeorm_1 = require("typeorm");
const data_source_1 = __importDefault(require("../database/data-source"));
const approval_template_entity_1 = require("../models/approval_template.entity");
const approval_template_step_entity_1 = require("../models/approval_template_step.entity");
const contract_entity_1 = require("../models/contract.entity");
const contract_approval_entity_1 = require("../models/contract_approval.entity");
const user_entity_1 = require("../models/user.entity");
const notification_services_1 = __importDefault(require("./notification.services"));
let contractRepo = data_source_1.default.getRepository(contract_entity_1.Contract);
let signerRepo = data_source_1.default.getRepository(contract_entity_1.ContractSigner);
let stepRepo = data_source_1.default.getRepository(approval_template_entity_1.ApprovalTemplate);
class contractService {
    static addContract(contractNumber, customerId, contractType, approvalTemplateId, createdById, signers, note, pdfFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                    const contractRepo = transactionalEntityManager.getRepository(contract_entity_1.Contract);
                    const userRepo = transactionalEntityManager.getRepository(user_entity_1.User);
                    const templateRepo = transactionalEntityManager.getRepository(approval_template_entity_1.ApprovalTemplate);
                    const signerRepo = transactionalEntityManager.getRepository(contract_entity_1.ContractSigner);
                    // Kiểm tra và lấy dữ liệu cần thiết
                    const customer = yield userRepo.findOneBy({ id: customerId });
                    const createdBy = yield userRepo.findOneBy({ id: createdById });
                    const approvalTemplate = yield templateRepo.findOneBy({
                        id: approvalTemplateId,
                    });
                    if (!customer || !createdBy || !approvalTemplate) {
                        throw new Error("Invalid customer, creator or approval template");
                    }
                    // Tạo contract mới
                    const contract = new contract_entity_1.Contract();
                    contract.contractNumber = contractNumber;
                    contract.customer = customer;
                    contract.contractType = contractType;
                    contract.approvalTemplate = approvalTemplate;
                    contract.createdBy = createdBy;
                    contract.note = note;
                    contract.pdfFilePath = pdfFilePath;
                    contract.status = "draft";
                    // Lưu contract
                    const savedContract = yield contractRepo.save(contract);
                    // Xử lý signers
                    const signerEntities = [];
                    for (const signer of signers) {
                        const signerUser = yield userRepo.findOneBy({ id: signer.userId });
                        if (!signerUser) {
                            throw new Error(`Signer with id ${signer.userId} not found`);
                        }
                        const contractSigner = new contract_entity_1.ContractSigner();
                        contractSigner.contract = savedContract;
                        contractSigner.signer = signerUser;
                        contractSigner.signOrder = signer.order;
                        contractSigner.status = "pending";
                        signerEntities.push(yield signerRepo.save(contractSigner));
                    }
                    // Tạo thông báo bên ngoài transaction chính
                    setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            for (const signer of signerEntities) {
                                if (signer.signer.role !== "customer") {
                                    yield notification_services_1.default.createNotification(signer.signer, savedContract, "contract_to_sign", `Bạn có một hợp đồng mới cần ký: ${savedContract.contractNumber}`);
                                }
                            }
                        }
                        catch (notificationError) {
                            console.error("Error creating notifications:", notificationError);
                        }
                    }));
                    return savedContract;
                }));
            }
            catch (error) {
                throw new Error(`Failed to create contract: ${error.message}`);
            }
        });
    }
    static updateContract(id, contractNumber, customer, contractType, createdBy, note, approvalTemplateId, signerIds, newPdfFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.default.transaction((transactionalEntityManager) => __awaiter(this, void 0, void 0, function* () {
                const contract = yield transactionalEntityManager.findOne(contract_entity_1.Contract, {
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
                const needsReset = contractNumber !== undefined ||
                    customer !== undefined ||
                    contractType !== undefined ||
                    newPdfFilePath !== undefined ||
                    approvalTemplateId !== undefined ||
                    signerIds !== undefined;
                if (needsReset) {
                    // Reset về draft
                    contract.status = "draft";
                    // Xóa tất cả approvals
                    yield transactionalEntityManager
                        .createQueryBuilder()
                        .delete()
                        .from(contract_approval_entity_1.ContractApproval)
                        .where("contractId = :contractId", { contractId: contract.id })
                        .execute();
                    // Reset signatures
                    yield transactionalEntityManager
                        .createQueryBuilder()
                        .update(contract_entity_1.ContractSigner)
                        .set({ status: "pending", signedAt: null })
                        .where("contractId = :contractId", { contractId: contract.id })
                        .execute();
                }
                // Cập nhật thông tin contract
                if (contractNumber)
                    contract.contractNumber = contractNumber;
                if (customer)
                    contract.customer = customer;
                if (contractType)
                    contract.contractType = contractType;
                if (createdBy)
                    contract.createdBy = createdBy;
                if (note)
                    contract.note = note;
                if (newPdfFilePath)
                    contract.pdfFilePath = newPdfFilePath;
                // ... phần xử lý template và signers giữ nguyên ...
                yield transactionalEntityManager.save(contract);
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
            }));
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
                order: {
                    createdAt: "DESC",
                },
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
                // 1. Lấy thông tin contract
                const contract = yield transactionalEntityManager.findOne(contract_entity_1.Contract, {
                    where: { id: contractId },
                    relations: ["approvalTemplate", "approvalTemplate.steps"],
                });
                if (!contract)
                    throw new Error("Contract not found");
                // 2. Xử lý khi reject
                if (status === "rejected") {
                    // Cập nhật trạng thái contract về draft để user có thể sửa
                    yield transactionalEntityManager.update(contract_entity_1.Contract, contractId, {
                        status: "rejected",
                    });
                    // Xóa tất cả approvals hiện tại
                    yield transactionalEntityManager
                        .createQueryBuilder()
                        .delete()
                        .from(contract_approval_entity_1.ContractApproval)
                        .where("contractId = :contractId", { contractId })
                        .execute();
                    // Reset signatures
                    yield transactionalEntityManager
                        .createQueryBuilder()
                        .update(contract_entity_1.ContractSigner)
                        .set({ status: "pending", signedAt: null })
                        .where("contractId = :contractId", { contractId })
                        .execute();
                    // Thông báo cho người tạo nếu họ không phải là khách hàng
                    if (contract.createdBy.role !== "customer") {
                        yield notification_services_1.default.createNotification(contract.createdBy, contract, "contract_rejected", `Hợp đồng ${contract.contractNumber} đã bị từ chối`);
                    }
                    return {
                        success: true,
                        message: "Contract rejected successfully",
                        data: {
                            contractId,
                            status: "draft",
                            message: "Contract has been reset to draft status. Please update and submit for approval again.",
                        },
                    };
                }
                // 3. Xử lý khi approve
                const templateSteps = yield transactionalEntityManager
                    .createQueryBuilder(approval_template_step_entity_1.ApprovalTemplateStep, "step")
                    .where("step.templateId = :templateId", {
                    templateId: contract.approvalTemplate.id,
                })
                    .orderBy("step.stepOrder", "ASC")
                    .getMany();
                if (!templateSteps.length) {
                    throw new Error("No approval steps found");
                }
                // Lấy các approvals hiện tại
                const existingApprovals = yield transactionalEntityManager
                    .createQueryBuilder(contract_approval_entity_1.ContractApproval, "approval")
                    .where("approval.contractId = :contractId", { contractId })
                    .andWhere("approval.status = :status", { status: "approved" })
                    .getMany();
                const currentStepOrder = existingApprovals.length + 1;
                const currentStep = templateSteps.find((s) => s.stepOrder === currentStepOrder);
                if (!currentStep) {
                    throw new Error("No more steps to approve");
                }
                // Tạo approval mới
                const newApproval = transactionalEntityManager.create(contract_approval_entity_1.ContractApproval, {
                    contract: { id: contractId },
                    approver: { id: userId },
                    templateStep: { id: currentStep.id },
                    status: "approved",
                    comments: comments,
                    approvedAt: new Date(),
                });
                yield transactionalEntityManager.save(contract_approval_entity_1.ContractApproval, newApproval);
                // Cập nhật trạng thái contract
                if (currentStepOrder === templateSteps.length) {
                    yield transactionalEntityManager.update(contract_entity_1.Contract, contractId, {
                        status: "ready_to_sign",
                    });
                    // Xử lý notification bên ngoài transaction
                    const signers = yield signerRepo.find({
                        where: { contract: { id: contractId } },
                        relations: ["signer"],
                    });
                    setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            for (const signer of signers) {
                                if (signer.signer.role !== "customer") {
                                    yield notification_services_1.default.createNotification(signer.signer, contract, "contract_to_sign", `Hợp đồng ${contract.contractNumber} đã được phê duyệt và sẵn sàng để ký`);
                                }
                            }
                        }
                        catch (notificationError) {
                            console.error("Error creating notifications:", notificationError);
                        }
                    }));
                }
                else {
                    yield transactionalEntityManager.update(contract_entity_1.Contract, contractId, {
                        status: "pending_approval",
                    });
                    // Xử lý notification cho người phê duyệt tiếp theo bên ngoài transaction
                    const nextApprover = templateSteps[currentStepOrder].approver;
                    setImmediate(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            if (nextApprover.role !== "customer") {
                                yield notification_services_1.default.createNotification(nextApprover, contract, "contract_approval", `Bạn có một hợp đồng cần phê duyệt: ${contract.contractNumber}`);
                            }
                        }
                        catch (notificationError) {
                            console.error("Error creating notification:", notificationError);
                        }
                    }));
                }
                return {
                    success: true,
                    message: `Contract approved successfully`,
                    data: {
                        contractId,
                        status: "approved",
                        stepOrder: currentStepOrder,
                        totalSteps: templateSteps.length,
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
                        signOrder: (0, typeorm_1.LessThan)(contractSigner.signOrder),
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
                    where: { id: (0, typeorm_1.In)(contractIds) },
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
                    where: { id: (0, typeorm_1.In)(contractIds) },
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