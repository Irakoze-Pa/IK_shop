import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { DeliveryModel, deliveryStatuses } from '../database/models/delivery.js';
import { OrderModel } from '../database/models/order.js';
import { createNotification } from '../notifications/service.js';
import { recordAdminAudit } from '../audit/service.js';

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid identifier');
const updateSchema = z.object({
  status: z.enum(deliveryStatuses).optional(),
  driverOrPartner: z.string().trim().max(160).optional(),
  confirmation: z.string().trim().min(1).max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const deliveryRouter = Router();

deliveryRouter.get('/order/:orderId', authenticate, requireRole('customer'), async (request: AuthenticatedRequest, response) => {
  const orderId = objectId.safeParse(request.params.orderId);
  if (!orderId.success) {
    response.status(400).json({ error: 'Invalid order identifier' });
    return;
  }
  const order = await OrderModel.findOne({ _id: orderId.data, customerId: request.user?.id });
  if (!order) {
    response.status(404).json({ error: 'Order not found' });
    return;
  }
  const delivery = await DeliveryModel.findOne({ orderId: order._id });
  if (!delivery) {
    response.status(404).json({ error: 'Delivery not found' });
    return;
  }
  response.json({ delivery });
});

deliveryRouter.get('/admin', authenticate, requireRole('admin'), async (_request, response) => {
  const deliveries = await DeliveryModel.find().sort({ updatedAt: -1 }).limit(100);
  response.json({ deliveries });
});

deliveryRouter.patch('/admin/:deliveryId', authenticate, requireRole('admin'), async (request: AuthenticatedRequest, response) => {
  const deliveryId = objectId.safeParse(request.params.deliveryId);
  const parsed = updateSchema.safeParse(request.body);
  if (!deliveryId.success || !parsed.success) {
    response.status(400).json({ error: 'Invalid delivery update' });
    return;
  }
  const delivery = await DeliveryModel.findById(deliveryId.data);
  if (!delivery) {
    response.status(404).json({ error: 'Delivery not found' });
    return;
  }
  const nextStatus = parsed.data.status;
  const previousStatus = delivery.status;
  const order = await OrderModel.findById(delivery.orderId).select('customerId orderNumber');
  const allowed: Record<string, string[]> = {
    pending: ['assigned', 'failed'], assigned: ['dispatched', 'failed'], dispatched: ['delivered', 'failed', 'returned'], delivered: ['returned'], failed: [], returned: [],
  };
  if (nextStatus && !allowed[delivery.status]?.includes(nextStatus)) {
    response.status(400).json({ error: `Cannot move delivery from ${delivery.status} to ${nextStatus}` });
    return;
  }
  if (nextStatus === 'delivered' && !parsed.data.confirmation && !delivery.confirmation) {
    response.status(400).json({ error: 'Delivery confirmation is required' });
    return;
  }
  Object.assign(delivery, parsed.data);
  if (nextStatus === 'assigned') delivery.assignedAt = new Date();
  if (nextStatus === 'dispatched') delivery.dispatchedAt = new Date();
  if (nextStatus === 'delivered') delivery.deliveredAt = new Date();
  await delivery.save();
  const orderStatus = nextStatus === 'delivered' ? 'delivered' : nextStatus === 'dispatched' ? 'out_for_delivery' : undefined;
  if (orderStatus) await OrderModel.findByIdAndUpdate(delivery.orderId, { orderStatus });
  if (nextStatus && order) await createNotification({ recipientId: order.customerId.toString(), type: 'delivery_update', title: 'Delivery update', message: `Order ${order.orderNumber} is now ${nextStatus.replaceAll('_', ' ')}.`, orderId: delivery.orderId.toString() });
  await recordAdminAudit(request, { action: 'delivery.update', entityType: 'delivery', entityId: delivery._id, metadata: { previousStatus, nextStatus: delivery.status, fieldsChanged: Object.keys(parsed.data).sort().join(',') } });
  response.json({ delivery });
});
