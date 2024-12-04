import dataSource from "../database/data-source";
import { User } from "../models/user.entity";
import { Like } from "typeorm";
import { Department } from "../models/department.entity";

let userRepo = dataSource.getRepository(User);

class UserServices {
  static async addUser(
    id,
    username,
    email,
    password,
    code,
    fullName,
    gender,
    dateOfBirth,
    placeOfBirth,
    address,
    idNumber,
    idIssueDate,
    idIssuePlace,
    phoneNumber,
    department: Department,
    position,
    role
  ) {
    const newUser = new User();
    newUser.id = id;
    newUser.code = code;
    newUser.fullName = fullName;
    newUser.gender = gender;
    newUser.dateOfBirth = dateOfBirth;
    newUser.placeOfBirth = placeOfBirth;
    newUser.address = address;
    newUser.idNumber = idNumber;
    newUser.idIssueDate = idIssueDate;
    newUser.idIssuePlace = idIssuePlace;
    newUser.phoneNumber = phoneNumber;
    newUser.department = department;
    newUser.position = position;
    newUser.role = role;
    newUser.username = username;
    newUser.email = email;
    newUser.passwordHash = password;
    await userRepo.save(newUser);
    return newUser;
  }

  static async updateUser(
    userId: number,
    code,
    fullName,
    gender,
    dateOfBirth,
    placeOfBirth,
    address,
    idNumber,
    idIssueDate,
    idIssuePlace,
    phoneNumber,
    department: Department,
    position,
    role
  ): Promise<void> {
    const user = await userRepo.findOneBy({ id: userId });
    user.code = code;
    user.fullName = fullName;
    user.gender = gender;
    user.dateOfBirth = dateOfBirth;
    user.placeOfBirth = placeOfBirth;
    user.address = address;
    user.idNumber = idNumber;
    user.idIssueDate = idIssueDate;
    user.idIssuePlace = idIssuePlace;
    user.phoneNumber = phoneNumber;
    user.department = department;
    user.position = position;
    user.role = role;
    await userRepo.save(user);
  }
  static async getUserByUserName(username: string) {
    return await userRepo.findOneBy({ username: username });
  }

  static async getUserByDepartMent(department: string) {
    return await userRepo.find({
      where: {
        department: Like(`%${department}`),
      },
    });
  }

  static async getUserDetails(id: any) {
    let user = await userRepo.findOne({
      relations: ["department"],
      where: { id: id },
    });
    return user;
  }

  static async getListUser(
    roles?: string[],
    text?: string,
    departmentId?: number,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    let queryBuilder = userRepo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.department", "department");

    if (roles && roles.length > 0) {
      queryBuilder.where("user.role IN (:...roles)", { roles });
    }

    if (departmentId) {
      queryBuilder.andWhere("department.id = :departmentId", { departmentId });
    }

    if (text) {
      queryBuilder.andWhere(
        "(user.fullName LIKE :text OR user.code LIKE :text)",
        { text: `%${text}%` }
      );
    }

    queryBuilder.orderBy("user.createdAt", "DESC").skip(skip).take(limit);

    const [listUser, total] = await queryBuilder.getManyAndCount();

    return {
      users: listUser,
      total: total,
      page: page,
      lastPage: Math.ceil(total / limit),
    };
  }
  static async deleteUser(ids: number[]) {
    const result = await userRepo.delete(ids);
    return result;
  }
}

export default UserServices;
