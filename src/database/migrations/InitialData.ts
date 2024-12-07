import { MigrationInterface, QueryRunner } from "typeorm";
import { Department } from "../../models/department.entity";
import { User } from "../../models/user.entity";
import dataSource from "../data-source";
import bcrypt from "bcryptjs";

export class InitialData implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const departmentRepo = dataSource.getRepository(Department);
    const userRepo = dataSource.getRepository(User);

    // Create Director department if it doesn't exist
    let directorDepartment = await departmentRepo.findOne({
      where: { departmentName: "Giám đốc" },
    });

    if (!directorDepartment) {
      directorDepartment = new Department();
      directorDepartment.departmentName = "Giám đốc";
      directorDepartment.description = "Ban Giám đốc";
      directorDepartment = await departmentRepo.save(directorDepartment);
    }

    // Create admin user if it doesn't exist
    const existingAdmin = await userRepo.findOne({
      where: { username: "admin" },
    });

    if (!existingAdmin) {
      const adminUser = new User();
      adminUser.code = "admin";
      adminUser.fullName = "admin";
      adminUser.gender = "Nam";
      adminUser.dateOfBirth = new Date("2002-12-11");
      adminUser.placeOfBirth = "hanoi";
      adminUser.address = "hanoi";
      adminUser.idNumber = "888";
      adminUser.idIssueDate = new Date("2018-12-11");
      adminUser.idIssuePlace = null;
      adminUser.phoneNumber = "0981632302";
      adminUser.email = "admin@gmail.com";
      adminUser.position = "Giám đốc";
      adminUser.role = "admin";
      adminUser.username = "admin";
      adminUser.passwordHash = await bcrypt.hash("1111", 10);
      adminUser.department = directorDepartment;
      adminUser.active = true;

      await userRepo.save(adminUser);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const userRepo = dataSource.getRepository(User);
    const departmentRepo = dataSource.getRepository(Department);

    // Remove admin user
    await userRepo.delete({ username: "admin" });

    // Remove director department
    await departmentRepo.delete({ departmentName: "Giám đốc" });
  }
}
