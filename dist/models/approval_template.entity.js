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
exports.ApprovalTemplate = void 0;
const typeorm_1 = require("typeorm");
const approval_template_step_entity_1 = require("./approval_template_step.entity");
let ApprovalTemplate = class ApprovalTemplate {
};
exports.ApprovalTemplate = ApprovalTemplate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], ApprovalTemplate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], ApprovalTemplate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], ApprovalTemplate.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => approval_template_step_entity_1.ApprovalTemplateStep, (step) => step.template, {
        cascade: true, // Cho phép lưu/cập nhật steps cùng lúc với template
    }),
    __metadata("design:type", Array)
], ApprovalTemplate.prototype, "steps", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ApprovalTemplate.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ApprovalTemplate.prototype, "updatedAt", void 0);
exports.ApprovalTemplate = ApprovalTemplate = __decorate([
    (0, typeorm_1.Entity)()
], ApprovalTemplate);
//# sourceMappingURL=approval_template.entity.js.map