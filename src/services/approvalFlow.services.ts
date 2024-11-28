import { ApprovalFlow } from "./../models/approval_flow.entity";
import dataSource from "../database/data-source";
import { Contract } from "../models/contract.entity";
import { User } from "../models/user.entity";
import { ApprovalTemplateStep } from "../models/approval_template_step.entity";
import { ApprovalTemplate } from "../models/approval_template.entity";
import { ILike } from "typeorm";

const approvalFlowRepo = dataSource.getRepository(ApprovalFlow);
const templateRepo = dataSource.getRepository(ApprovalTemplate);
const stepRepo = dataSource.getRepository(ApprovalTemplateStep);

class ApprovalFlowServices {
  static async findByContract(contract) {
    const flows = await approvalFlowRepo.find({
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
  }

  static async addApprovalFlow(
    id,
    contract,
    stepNumber,
    approver,
    action,
    actionSource,
    approvalStatus,
    comments
  ) {
    const existingFlowWithStep = await approvalFlowRepo.findOne({
      where: {
        contract: {
          id: contract.id,
        },
        stepNumber: stepNumber,
      },
    });

    if (existingFlowWithStep) {
      throw new Error(
        `Approval flow with step number ${stepNumber} already exists for this contract`
      );
    }

    const approvalFlow = new ApprovalFlow();
    approvalFlow.id = id;
    approvalFlow.contract = contract;
    approvalFlow.stepNumber = stepNumber;
    approvalFlow.approver = approver;
    approvalFlow.action = action;
    approvalFlow.actionSource = actionSource;
    approvalFlow.approvalStatus = approvalStatus;
    approvalFlow.comments = comments;

    await approvalFlowRepo.save(approvalFlow);
    return approvalFlow;
  }

  static async updateApprovalFlow(
    id,
    contract: Contract,
    stepNumber,
    approver: User,
    action,
    actionSource,
    approvalStatus,
    comments
  ) {
    const approvalFlow = await approvalFlowRepo.findOneBy({ id: id });
    approvalFlow.contract = contract;
    approvalFlow.stepNumber = stepNumber;
    approvalFlow.approver = approver;
    approvalFlow.action = action;
    approvalFlow.actionSource = actionSource;
    approvalFlow.approvalStatus = approvalStatus;
    approvalFlow.comments = comments;
    await approvalFlowRepo.save(approvalFlow);
    return approvalFlow;
  }

  static async listApprovalFlow(searchName?: string) {
    const whereCondition = searchName ? { name: ILike(`%${searchName}%`) } : {};

    const templates = await templateRepo.find({
      where: whereCondition,
      relations: ["steps", "steps.approver", "steps.department"],
      order: {
        steps: {
          stepOrder: "ASC",
        },
      },
    });
    return templates;
  }

  static async detailApprovalFlow(id) {
    const approvalFlow = await approvalFlowRepo.findOne({
      relations: ["contract", "approver"],
      where: { id: id },
    });
    return approvalFlow;
  }

  static async createTemplateWithSteps(
    name: string,
    steps: { departmentId: number; approverId: number; stepOrder: number }[]
  ) {
    const template = new ApprovalTemplate();
    template.name = name;
    const savedTemplate = await templateRepo.save(template);

    const stepEntities = steps.map((stepData) => {
      const step = new ApprovalTemplateStep();
      step.template = savedTemplate;
      step.department = { id: stepData.departmentId } as any;
      step.approver = { id: stepData.approverId } as any;
      step.stepOrder = stepData.stepOrder;
      return step;
    });

    await stepRepo.save(stepEntities);
    return savedTemplate;
  }
}

export default ApprovalFlowServices;
