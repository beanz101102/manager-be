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
const approval_flow_entity_1 = require("./../models/approval_flow.entity");
const data_source_1 = __importDefault(require("../database/data-source"));
const approval_template_step_entity_1 = require("../models/approval_template_step.entity");
const approval_template_entity_1 = require("../models/approval_template.entity");
const typeorm_1 = require("typeorm");
const approvalFlowRepo = data_source_1.default.getRepository(approval_flow_entity_1.ApprovalFlow);
const templateRepo = data_source_1.default.getRepository(approval_template_entity_1.ApprovalTemplate);
const stepRepo = data_source_1.default.getRepository(approval_template_step_entity_1.ApprovalTemplateStep);
class ApprovalFlowServices {
    static findByContract(contract) {
        return __awaiter(this, void 0, void 0, function* () {
            const flows = yield approvalFlowRepo.find({
                where: {
                    contract: {
                        id: contract.id,
                    },
                },
                order: {
                    stepNumber: "ASC",
                },
            });
            return flows;
        });
    }
    static addApprovalFlow(id, contract, stepNumber, approver, action, actionSource, approvalStatus, comments) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingFlowWithStep = yield approvalFlowRepo.findOne({
                where: {
                    contract: {
                        id: contract.id,
                    },
                    stepNumber: stepNumber,
                },
            });
            if (existingFlowWithStep) {
                throw new Error(`Approval flow with step number ${stepNumber} already exists for this contract`);
            }
            const approvalFlow = new approval_flow_entity_1.ApprovalFlow();
            approvalFlow.id = id;
            approvalFlow.contract = contract;
            approvalFlow.stepNumber = stepNumber;
            approvalFlow.approver = approver;
            approvalFlow.action = action;
            approvalFlow.actionSource = actionSource;
            approvalFlow.approvalStatus = approvalStatus;
            approvalFlow.comments = comments;
            yield approvalFlowRepo.save(approvalFlow);
            return approvalFlow;
        });
    }
    static updateApprovalFlow(id, contract, stepNumber, approver, action, actionSource, approvalStatus, comments) {
        return __awaiter(this, void 0, void 0, function* () {
            const approvalFlow = yield approvalFlowRepo.findOneBy({ id: id });
            approvalFlow.contract = contract;
            approvalFlow.stepNumber = stepNumber;
            approvalFlow.approver = approver;
            approvalFlow.action = action;
            approvalFlow.actionSource = actionSource;
            approvalFlow.approvalStatus = approvalStatus;
            approvalFlow.comments = comments;
            yield approvalFlowRepo.save(approvalFlow);
            return approvalFlow;
        });
    }
    static listApprovalFlow(searchName) {
        return __awaiter(this, void 0, void 0, function* () {
            const whereCondition = searchName ? { name: (0, typeorm_1.ILike)(`%${searchName}%`) } : {};
            const templates = yield templateRepo.find({
                where: whereCondition,
                relations: ["steps", "steps.approver", "steps.department"],
                order: {
                    steps: {
                        stepOrder: "ASC",
                    },
                },
            });
            return templates;
        });
    }
    static detailApprovalFlow(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const approvalFlow = yield approvalFlowRepo.findOne({
                relations: ["contract", "approver"],
                where: { id: id },
            });
            return approvalFlow;
        });
    }
    static createTemplateWithSteps(name, steps) {
        return __awaiter(this, void 0, void 0, function* () {
            const template = new approval_template_entity_1.ApprovalTemplate();
            template.name = name;
            const savedTemplate = yield templateRepo.save(template);
            const stepEntities = steps.map((stepData) => {
                const step = new approval_template_step_entity_1.ApprovalTemplateStep();
                step.template = savedTemplate;
                step.department = { id: stepData.departmentId };
                step.approver = { id: stepData.approverId };
                step.stepOrder = stepData.stepOrder;
                return step;
            });
            yield stepRepo.save(stepEntities);
            return savedTemplate;
        });
    }
}
exports.default = ApprovalFlowServices;
//# sourceMappingURL=approvalFlow.services.js.map