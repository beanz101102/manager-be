import ContractController from "../controller/contract.controller";
import express, { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

const ContractRouter: Router = express.Router();

const contractController = new ContractController();

ContractRouter.post(
  "/addContract",
  upload.single("file"),
  contractController.createContract
);
ContractRouter.post("/", contractController.allContract);
ContractRouter.post("/detail", contractController.getDetails);
ContractRouter.post(
  "/update",
  upload.single("file"),
  contractController.updateContract
);
ContractRouter.post("/bulk-delete", contractController.deleteMultipleContracts);
ContractRouter.post(
  "/rejected-contract",
  contractController.rejectMultipleContracts
);
ContractRouter.get("/search", contractController.searchContracts);
ContractRouter.post("/count", contractController.countContractsByStatus);
ContractRouter.post("/approve", contractController.approveMultipleContracts);
ContractRouter.post(
  "/sign",
  upload.single("file"),
  contractController.signContract
);
ContractRouter.post("/submit", contractController.submitForApproval);
ContractRouter.post("/cancel", contractController.cancelContracts);
ContractRouter.post("/statistics", contractController.getContractStatistics);
ContractRouter.get(
  "/customer-report",
  contractController.getCustomerContractReport
);
ContractRouter.get(
  "/contracts-in-range",
  contractController.getContractsInTimeRange
);
ContractRouter.get(
  "/advanced-statistics",
  contractController.getAdvancedStatistics
);
ContractRouter.post("/send-otp", contractController.sendOTP);
ContractRouter.post("/verify-otp", contractController.verifyOTP);
ContractRouter.post("/add-feedback", contractController.addFeedback);
ContractRouter.get("/get-feedback", contractController.getFeedback);

export default ContractRouter;
