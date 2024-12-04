import ApprovalFlowServices from "../services/approvalFlow.services";

class ApprovalFlowController {
  async listApprovalFlow(req, res) {
    try {
      const searchName = req.query.name;
      const templates = await ApprovalFlowServices.listApprovalFlow(searchName);
      res.status(200).json(templates);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  async createTemplateWithSteps(req, res) {
    try {
      const { name, steps } = req.body;
      const template = await ApprovalFlowServices.createTemplateWithSteps(
        name,
        steps
      );
      res.status(200).json(template);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  async detailApprovalFlow(req, res) {
    try {
      const id = req.params.id;
      const approvalFlow = await ApprovalFlowServices.detailApprovalFlow(id);
      if (!approvalFlow) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(200).json(approvalFlow);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  async updateTemplateWithSteps(req, res) {
    try {
      const { id, name, steps } = req.body;

      const approvalFlow = await ApprovalFlowServices.updateTemplateWithSteps(
        id,
        name,
        steps
      );
      res.status(200).json(approvalFlow);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
}

export default ApprovalFlowController;
