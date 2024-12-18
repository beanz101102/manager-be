import express, { Router } from "express";
import ApprovalFlowController from "../controller/approvalFlow.controller";

const ApprovalFlowRouter: Router = express.Router();

const approvalFlowController = new ApprovalFlowController();

ApprovalFlowRouter.post("/add", approvalFlowController.createTemplateWithSteps);
ApprovalFlowRouter.post("/", approvalFlowController.listApprovalFlow);
ApprovalFlowRouter.post("/detail", approvalFlowController.detailApprovalFlow);

export default ApprovalFlowRouter;
