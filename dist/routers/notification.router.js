"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = __importDefault(require("../controller/notification.controller"));
const router = express_1.default.Router();
const notificationController = new notification_controller_1.default();
router.get("/", notificationController.getNotifications);
router.put("/:notificationId/read", notificationController.markAsRead);
router.post("/read-all", notificationController.markAllAsRead);
exports.default = router;
//# sourceMappingURL=notification.router.js.map