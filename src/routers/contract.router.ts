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
ContractRouter.post("/update", contractController.updateContract);
ContractRouter.post("/success", contractController.successContract);
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
ContractRouter.get("/statistics", contractController.getContractStatistics);

export default ContractRouter;
