import dataSource from "../database/data-source";
import { Department } from "./../models/department.entity";

let departmentRepo = dataSource.getRepository(Department);

class DepartmentService {
  static async addDepartment(id, departmentName, description) {
    let department = new Department();
    department.id = id;
    department.description = description;
    department.departmentName = departmentName;
    await departmentRepo.save(department);
    return department;
  }
  static async updateDepartment(id, departmentName, description) {
    const department = await departmentRepo.findOneBy({ id: id });
    department.id = id;
    department.description = description;
    department.departmentName = departmentName;

    await departmentRepo.save(department);
  }
  static async listDepartment() {
    const department = await departmentRepo.find();
    return department;
  }
  static async deleteDepartment(id: number) {
    const department = await departmentRepo.findOneBy({ id: id });
    if (!department) {
      throw new Error("Department not found");
    }
    await departmentRepo.remove(department);
    return { message: "Department deleted successfully" };
  }
}

export default DepartmentService;
