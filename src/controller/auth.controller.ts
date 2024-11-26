import bcrypt from "bcryptjs";
import createError from "http-errors";
import dataSource from "../database/data-source";
import { User } from "../models/user.entity";

let userRepo = dataSource.getRepository(User);

class AuthController {
  static async register(req, res, next): Promise<User> {
    try {
      const { username, passwordHash, email, code, fullName, idNumber } =
        req.body;
      const user = await userRepo.findOne({
        where: [{ email }, { username }],
      });
      if (user) {
        if (user.username === username) {
          return next(createError(401, "Username already exists"));
        }
        return next(createError(401, "Email already exists"));
      }
      let password = await bcrypt.hash(passwordHash, 10);
      const newUser = await userRepo.save({
        code: code,
        idNumber: idNumber,
        fullName: fullName,
        email: email,
        username: username,
        passwordHash: password,
      });

      res.status(200).json({
        message: "created successfully",
        newUser,
      });
    } catch (error) {
      next(error);
    }
  }
  static async login(req, res, next) {
    try {
      let { email, passwordHash } = req.body;
      let user = await userRepo.findOne({
        where: { email },
      });
      if (!user || !(await bcrypt.compare(passwordHash, user.passwordHash))) {
        return next(createError(401, "Wrong email or password"));
      }
      res.status(200).json({
        message: "Login successful",
        user,
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Something is wrong!" });
    }
  }
}

export default AuthController;
