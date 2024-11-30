"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const contract_controller_1 = __importDefault(require("../controller/contract.controller"));
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uploadDir = path_1.default.join(__dirname, "../../uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage: storage });
const ContractRouter = express_1.default.Router();
const contractController = new contract_controller_1.default();
ContractRouter.post("/addContract", upload.single("file"), contractController.createContract);
ContractRouter.post("/", contractController.allContract);
ContractRouter.post("/detail", contractController.getDetails);
ContractRouter.post("/update", upload.single("file"), contractController.updateContract);
ContractRouter.post("/success", contractController.successContract);
ContractRouter.post("/bulk-delete", contractController.deleteMultipleContracts);
ContractRouter.post("/rejected-contract", contractController.rejectMultipleContracts);
ContractRouter.get("/search", contractController.searchContracts);
ContractRouter.post("/count", contractController.countContractsByStatus);
ContractRouter.post("/approve", contractController.approveMultipleContracts);
ContractRouter.post("/sign", upload.single("file"), contractController.signContract);
ContractRouter.post("/submit", contractController.submitForApproval);
ContractRouter.post("/cancel", contractController.cancelContracts);
ContractRouter.get("/statistics", contractController.getContractStatistics);
exports.default = ContractRouter;
//# sourceMappingURL=contract.router.js.map