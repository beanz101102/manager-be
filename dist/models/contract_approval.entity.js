"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractApproval = void 0;
const typeorm_1 = require("typeorm");
const contract_entity_1 = require("./contract.entity");
const approval_template_step_entity_1 = require("./approval_template_step.entity");
const user_entity_1 = require("./user.entity");
let ContractApproval = class ContractApproval {
};
exports.ContractApproval = ContractApproval;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ContractApproval.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContractApproval.prototype, "contractId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contract_entity_1.Contract, (contract) => contract.contractApprovals),
    (0, typeorm_1.JoinColumn)({ name: "contractId" }),
    __metadata("design:type", contract_entity_1.Contract)
], ContractApproval.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContractApproval.prototype, "templateStepId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => approval_template_step_entity_1.ApprovalTemplateStep),
    (0, typeorm_1.JoinColumn)({ name: "templateStepId" }),
    __metadata("design:type", approval_template_step_entity_1.ApprovalTemplateStep)
], ContractApproval.prototype, "templateStep", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContractApproval.prototype, "approverId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: "approverId" }),
    __metadata("design:type", user_entity_1.User)
], ContractApproval.prototype, "approver", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    }),
    __metadata("design:type", String)
], ContractApproval.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], ContractApproval.prototype, "comments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], ContractApproval.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ContractApproval.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ContractApproval.prototype, "updatedAt", void 0);
exports.ContractApproval = ContractApproval = __decorate([
    (0, typeorm_1.Entity)()
], ContractApproval);
//# sourceMappingURL=contract_approval.entity.js.map