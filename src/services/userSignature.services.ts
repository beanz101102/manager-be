import { UserSignature } from "../models/user_signature.entity";
import dataSource from "../database/data-source";
import { User } from "../models/user.entity";

let userSignatureRepo = dataSource.getRepository(UserSignature);

class UserSignatureService {
  static async addUserSignature(user: User, signatureImagePath) {
    let userSignature = new UserSignature();
    userSignature.user = user;
    userSignature.signatureImagePath = signatureImagePath;
    await userSignatureRepo.save(userSignature);
    return userSignature;
  }
  static async updateUserSignature(id, user: User, signatureImagePath) {
    const userSignature = await userSignatureRepo.findOneBy({ id: id });
    userSignature.id = id;
    userSignature.user = user;
    userSignature.signatureImagePath = signatureImagePath;

    await userSignatureRepo.save(userSignature);
  }
  static async listUserSignature() {
    try {
      const userSignature = await userSignatureRepo.find({
        relations: ["user", "user.department"],
      });
      return userSignature;
    } catch (error) {
      console.error("Error fetching user signatures:", error);
      throw new Error("Failed to fetch user signatures");
    }
  }
  static async detail(id) {
    const userSignature = await userSignatureRepo.findOne({
      relations: ["user", "user.department"],
      where: { id: id },
    });
    return userSignature;
  }
  static async delete(id) {
    const userSignature = await userSignatureRepo.delete(id);
    return userSignature;
  }
}

export default UserSignatureService;
