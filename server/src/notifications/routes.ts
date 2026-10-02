import { Router } from 'express';
import { Types } from 'mongoose';
import { authenticate, requireRole } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { NotificationModel } from '../database/models/notification.js';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate, requireRole('customer'));

notificationsRouter.get('/', async (request: AuthenticatedRequest, response) => {
  const notifications = await NotificationModel.find({ recipientId: request.user?.id }).sort({ createdAt: -1 }).limit(50);
  const unreadCount = await NotificationModel.countDocuments({ recipientId: request.user?.id, readAt: null });
  response.json({ notifications, unreadCount });
});

notificationsRouter.patch('/read-all', async (request: AuthenticatedRequest, response) => {
  const result = await NotificationModel.updateMany(
    { recipientId: request.user?.id, readAt: null },
    { readAt: new Date() },
  );
  response.json({ updatedCount: result.modifiedCount });
});

notificationsRouter.patch('/:notificationId/read', async (request: AuthenticatedRequest, response) => {
  const notificationId = typeof request.params.notificationId === 'string' ? request.params.notificationId : undefined;
  if (!notificationId || !Types.ObjectId.isValid(notificationId)) {
    response.status(400).json({ error: 'Invalid notification identifier' });
    return;
  }
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, recipientId: request.user?.id },
    { readAt: new Date() },
    { new: true },
  );
  if (!notification) {
    response.status(404).json({ error: 'Notification not found' });
    return;
  }
  response.json({ notification });
});
