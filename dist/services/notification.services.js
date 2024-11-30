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
const data_source_1 = __importDefault(require("../database/data-source"));
const notification_entity_1 = require("../models/notification.entity");
const notificationRepo = data_source_1.default.getRepository(notification_entity_1.Notification);
class NotificationService {
    static createNotification(user, contract, type, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxRetries = 3;
            let retryCount = 0;
            while (retryCount < maxRetries) {
                try {
                    const notification = new notification_entity_1.Notification();
                    notification.user = user;
                    notification.contract = contract;
                    notification.type = type;
                    notification.message = message;
                    notification.isRead = false;
                    return yield notificationRepo.save(notification);
                }
                catch (error) {
                    retryCount++;
                    if (error.code === "ER_LOCK_WAIT_TIMEOUT" && retryCount < maxRetries) {
                        yield new Promise((resolve) => setTimeout(resolve, 1000 * Math.random()));
                        continue;
                    }
                    throw error;
                }
            }
            throw new Error("Failed to create notification after maximum retries");
        });
    }
    static getUnreadNotifications(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield notificationRepo.find({
                where: {
                    user: { id: userId },
                    isRead: false,
                },
                relations: ["contract"],
                order: {
                    createdAt: "DESC",
                },
            });
        });
    }
    static markAsRead(notificationId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield notificationRepo.update(notificationId, { isRead: true });
        });
    }
    static markAllAsRead(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield notificationRepo.update({ user: { id: userId }, isRead: false }, { isRead: true });
        });
    }
    static getNotificationsByUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [notifications, total] = yield notificationRepo.findAndCount({
                where: { user: { id: userId } },
                relations: ["contract"],
                order: { createdAt: "DESC" },
            });
            return notifications;
        });
    }
}
exports.default = NotificationService;
//# sourceMappingURL=notification.services.js.map