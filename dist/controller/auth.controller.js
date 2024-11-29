"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const http_errors_1 = __importDefault(require("http-errors"));
const data_source_1 = __importDefault(require("../database/data-source"));
const user_entity_1 = require("../models/user.entity");
let userRepo = data_source_1.default.getRepository(user_entity_1.User);
class AuthController {
    static register(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { username, passwordHash, email, code, fullName, idNumber } = req.body;
                const user = yield userRepo.findOne({
                    where: [{ email }, { username }],
                });
                if (user) {
                    if (user.username === username) {
                        return next((0, http_errors_1.default)(401, "Username already exists"));
                    }
                    return next((0, http_errors_1.default)(401, "Email already exists"));
                }
                let password = yield bcryptjs_1.default.hash(passwordHash, 10);
                const newUser = yield userRepo.save({
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
            }
            catch (error) {
                next(error);
            }
        });
    }
    static login(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let { email, passwordHash } = req.body;
                let user = yield userRepo.findOne({
                    where: { email },
                });
                if (!user || !(yield bcryptjs_1.default.compare(passwordHash, user.passwordHash))) {
                    return next((0, http_errors_1.default)(401, "Wrong email or password"));
                }
                res.status(200).json({
                    message: "Login successful",
                    user,
                });
            }
            catch (err) {
                res.status(500).json({ message: err.message || "Something is wrong!" });
            }
        });
    }
}
exports.default = AuthController;
//# sourceMappingURL=auth.controller.js.map