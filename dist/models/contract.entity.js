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
exports.ContractSigner = exports.Contract = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const approval_template_entity_1 = require("./approval_template.entity");
const contract_approval_entity_1 = require("./contract_approval.entity");
// Đánh dấu class này là một Entity (bảng trong database)
let Contract = class Contract {
};
exports.Contract = Contract;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Contract.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Contract.prototype, "contractNumber", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false }),
    __metadata("design:type", user_entity_1.User)
], Contract.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => approval_template_entity_1.ApprovalTemplate, { nullable: false }),
    __metadata("design:type", approval_template_entity_1.ApprovalTemplate)
], Contract.prototype, "approvalTemplate", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false }),
    __metadata("design:type", user_entity_1.User)
], Contract.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Contract.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], Contract.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ContractSigner, (signer) => signer.contract, {
        cascade: true,
    }),
    __metadata("design:type", Array)
], Contract.prototype, "signers", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: [
            "draft",
            "pending_approval",
            "rejected",
            "ready_to_sign",
            "completed",
            "cancelled",
        ],
        default: "draft",
    }),
    __metadata("design:type", String)
], Contract.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "note", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255, nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "pdfFilePath", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], Contract.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => contract_approval_entity_1.ContractApproval, (approval) => approval.contract),
    __metadata("design:type", Array)
], Contract.prototype, "contractApprovals", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => ContractSigner, (signer) => signer.contract),
    __metadata("design:type", Array)
], Contract.prototype, "contractSigners", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", String)
], Contract.prototype, "cancelReason", void 0);
exports.Contract = Contract = __decorate([
    (0, typeorm_1.Entity)()
], Contract);
// Thêm entity mới cho người ký
let ContractSigner = class ContractSigner {
};
exports.ContractSigner = ContractSigner;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ContractSigner.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Contract, (contract) => contract.signers, {
        onDelete: "CASCADE",
    }),
    __metadata("design:type", Contract)
], ContractSigner.prototype, "contract", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    __metadata("design:type", user_entity_1.User)
], ContractSigner.prototype, "signer", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: ["pending", "signed"],
        default: "pending",
    }),
    __metadata("design:type", String)
], ContractSigner.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ContractSigner.prototype, "signOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamp", nullable: true }),
    __metadata("design:type", Date)
], ContractSigner.prototype, "signedAt", void 0);
exports.ContractSigner = ContractSigner = __decorate([
    (0, typeorm_1.Entity)()
], ContractSigner);
//# sourceMappingURL=contract.entity.js.map