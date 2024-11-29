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
exports.ApprovalTemplateStep = void 0;
const typeorm_1 = require("typeorm");
const approval_template_entity_1 = require("./approval_template.entity");
const department_entity_1 = require("./department.entity");
const user_entity_1 = require("./user.entity");
let ApprovalTemplateStep = class ApprovalTemplateStep {
};
exports.ApprovalTemplateStep = ApprovalTemplateStep;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ApprovalTemplateStep.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ApprovalTemplateStep.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => approval_template_entity_1.ApprovalTemplate, (template) => template.steps, {
        onDelete: "CASCADE", // Xóa steps khi xóa template
    }),
    (0, typeorm_1.JoinColumn)({ name: "templateId" }),
    __metadata("design:type", approval_template_entity_1.ApprovalTemplate)
], ApprovalTemplateStep.prototype, "template", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ApprovalTemplateStep.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => department_entity_1.Department),
    (0, typeorm_1.JoinColumn)({ name: "departmentId" }),
    __metadata("design:type", department_entity_1.Department)
], ApprovalTemplateStep.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ApprovalTemplateStep.prototype, "approverId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: "approverId" }),
    __metadata("design:type", user_entity_1.User)
], ApprovalTemplateStep.prototype, "approver", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], ApprovalTemplateStep.prototype, "stepOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ApprovalTemplateStep.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ApprovalTemplateStep.prototype, "updatedAt", void 0);
exports.ApprovalTemplateStep = ApprovalTemplateStep = __decorate([
    (0, typeorm_1.Entity)()
], ApprovalTemplateStep);
//# sourceMappingURL=approval_template_step.entity.js.map