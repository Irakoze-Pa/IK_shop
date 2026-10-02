import { NotificationModel } from '../database/models/notification.js';

export const createNotification = (input: {
  recipientId: string;
  type: 'order_created' | 'delivery_update' | 'system';
  title: string;
  message: string;
  orderId?: string;
}) => NotificationModel.create(input);