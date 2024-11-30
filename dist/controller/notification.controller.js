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
const notification_services_1 = __importDefault(require("../services/notification.services"));
class NotificationController {
    getNotifications(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.id; // Assuming you have user info in request
                const { page, limit } = req.query;
                const notifications = yield notification_services_1.default.getNotificationsByUser(userId);
                return res.status(200).json(notifications);
            }
            catch (error) {
                return res.status(500).json({ message: error.message });
            }
        });
    }
    markAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { notificationId } = req.params;
                yield notification_services_1.default.markAsRead(parseInt(notificationId));
                return res.status(200).json({ message: "Notification marked as read" });
            }
            catch (error) {
                return res.status(500).json({ message: error.message });
            }
        });
    }
    markAllAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.body.userId;
                yield notification_services_1.default.markAllAsRead(userId);
                return res
                    .status(200)
                    .json({ message: "All notifications marked as read" });
            }
            catch (error) {
                return res.status(500).json({ message: error.message });
            }
        });
    }
}
exports.default = NotificationController;
//# sourceMappingURL=notification.controller.js.map