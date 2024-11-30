import express from "express";
import NotificationController from "../controller/notification.controller";

const router = express.Router();
const notificationController = new NotificationController();

router.get("/", notificationController.getNotifications);
router.put("/:notificationId/read", notificationController.markAsRead);
router.post("/read-all", notificationController.markAllAsRead);

export default router;
