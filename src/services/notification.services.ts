import dataSource from "../database/data-source";
import { Notification } from "../models/notification.entity";
import { User } from "../models/user.entity";
import { Contract } from "../models/contract.entity";

const notificationRepo = dataSource.getRepository(Notification);

class NotificationService {
  static async createNotification(
    user: User,
    contract: Contract,
    type: string,
    message: string
  ): Promise<Notification> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const notification = new Notification();
        notification.user = user;
        notification.contract = contract;
        notification.type = type;
        notification.message = message;
        notification.isRead = false;

        return await notificationRepo.save(notification);
      } catch (error) {
        retryCount++;
        if (error.code === "ER_LOCK_WAIT_TIMEOUT" && retryCount < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.random())
          );
          continue;
        }
        throw error;
      }
    }

    throw new Error("Failed to create notification after maximum retries");
  }

  static async getUnreadNotifications(userId: number) {
    return await notificationRepo.find({
      where: {
        user: { id: userId },
        isRead: false,
      },
      relations: ["contract"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  static async markAsRead(notificationId: number) {
    await notificationRepo.update(notificationId, { isRead: true });
  }

  static async markAllAsRead(userId: number) {
    await notificationRepo.update({ user: { id: userId } }, { isRead: true });
  }

  static async getNotificationsByUser(userId: number) {
    const [notifications, total] = await notificationRepo.findAndCount({
      where: {
        user: { id: userId },
      },
      relations: ["contract"],
      order: {
        createdAt: "DESC", // Sort by createdAt in descending order (newest first)
      },
    });

    return notifications;
  }
}

export default NotificationService;
