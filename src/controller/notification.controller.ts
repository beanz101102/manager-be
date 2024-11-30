import NotificationService from "../services/notification.services";

class NotificationController {
  async getNotifications(req, res) {
    try {
      const userId = req.id; // Assuming you have user info in request
      const { page, limit } = req.query;

      const notifications = await NotificationService.getNotificationsByUser(
        userId
      );

      return res.status(200).json(notifications);
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      await NotificationService.markAsRead(parseInt(notificationId));
      return res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.body.userId;
      await NotificationService.markAllAsRead(userId);
      return res
        .status(200)
        .json({ message: "All notifications marked as read" });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }
}

export default NotificationController;
