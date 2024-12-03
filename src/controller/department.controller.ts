import DepartmentService from "../services/department.services";

class departmentController {
  async addDepartment(req, res) {
    try {
      let id = req.body.id;
      let description = req.body.description;
      let departmentName = req.body.departmentName;

      let department = await DepartmentService.addDepartment(
        id,
        description,
        departmentName
      );
      res.status(200).json(department);
    } catch (e) {
      res.status(404).json({ message: e.message });
    }
  }

  async listDepartments(req, res) {
    let department = await DepartmentService.listDepartment();
    res.status(200).json(department);
  }

  async updateDepartment(req, res) {
    try {
      const { departmentName, description, id } = req.body;

      await DepartmentService.updateDepartment(id, departmentName, description);
      res.status(200).json({ message: "Department updated successfully" });
    } catch (e) {
      res.status(404).json({ message: e.message });
    }
  }

  async deleteDepartment(req, res) {
    try {
      const { id } = req.body;
      const result = await DepartmentService.deleteDepartment(id);
      res.status(200).json(result);
    } catch (e) {
      res.status(404).json({ message: e.message });
    }
  }
}

export default departmentController;
