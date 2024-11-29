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
const approvalFlow_services_1 = __importDefault(require("../services/approvalFlow.services"));
class ApprovalFlowController {
    listApprovalFlow(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const searchName = req.query.name;
                const templates = yield approvalFlow_services_1.default.listApprovalFlow(searchName);
                res.status(200).json(templates);
            }
            catch (e) {
                res.status(400).json({ message: e.message });
            }
        });
    }
    createTemplateWithSteps(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, steps } = req.body;
                const template = yield approvalFlow_services_1.default.createTemplateWithSteps(name, steps);
                res.status(200).json(template);
            }
            catch (e) {
                res.status(400).json({ message: e.message });
            }
        });
    }
    detailApprovalFlow(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = req.params.id;
                const approvalFlow = yield approvalFlow_services_1.default.detailApprovalFlow(id);
                if (!approvalFlow) {
                    return res.status(404).json({ message: "Template not found" });
                }
                res.status(200).json(approvalFlow);
            }
            catch (e) {
                res.status(400).json({ message: e.message });
            }
        });
    }
}
exports.default = ApprovalFlowController;
//# sourceMappingURL=approvalFlow.controller.js.map