import UserSignatureService from "../services/userSignature.services";
const path = require("path");
import dataSource from "../database/data-source";
import { User } from "../models/user.entity";

let userRepo = dataSource.getRepository(User);
class userSignatureController {
  async addUserSignature(req, res) {
    try {
      let userId = req.body.userId;
      let user = await userRepo.findOneBy({ id: userId });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      let signatureImagePath = req.file
        ? `/uploads/${path.basename(req.file.path).substring(0, 255)}`
        : null;

      let userSignature = await UserSignatureService.addUserSignature(
        user,
        signatureImagePath
      );
      res.status(200).json(userSignature);
    } catch (e) {
      res.status(404).json({ message: e.message });
    }
  }

  async list(req, res) {
    try {
      const userId = req.query.userId;
      
      if (!userId) {
        return res.status(401).json({ message: "User not found" });
      }

      let userSignature = await UserSignatureService.listUserSignature(userId);
      res.status(200).json(userSignature);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async detail(req, res) {
    try {
      let id = req.body.id;
      let userSignature = await UserSignatureService.detail(id);
      res.status(200).json(userSignature);
    } catch (e) {
      res.status(404).json({ message: e.message });
    }
  }

  async delete(req, res) {
    let id = req.body.id;
    let userSignature = await UserSignatureService.delete(id);
    res.status(200).json(userSignature);
  }
}

export default userSignatureController;
