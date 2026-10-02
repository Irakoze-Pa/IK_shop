import { model, Schema, type InferSchemaType } from 'mongoose';

export const notificationTypes = ['order_created', 'delivery_update', 'system'] as const;

const notificationSchema = new Schema(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: notificationTypes, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    readAt: { type: Date },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });

export type Notification = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model<Notification>('Notification', notificationSchema);