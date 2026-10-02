import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { recordAdminAudit } from '../audit/service.js';
import { OrderModel } from '../database/models/order.js';
import { UserModel } from '../database/models/user.js';

const statusSchema = z.object({ status: z.enum(['active', 'suspended']) });

export const usersRouter = Router();
usersRouter.use(authenticate, requireRole('admin'));

usersRouter.get('/', async (_request, response) => {
  const users = await UserModel.find({ role: 'customer' }).select('name email phone status createdAt lastLoginAt').sort({ createdAt: -1 }).limit(250);
  const orderCounts = await OrderModel.aggregate<{ _id: Types.ObjectId; count: number; totalRwf: number }>([
    { $match: { customerId: { $in: users.map((user) => user._id) } } },
    { $group: { _id: '$customerId', count: { $sum: 1 }, totalRwf: { $sum: '$totalRwf' } } },
  ]);
  const ordersByCustomer = new Map(orderCounts.map((item) => [item._id.toString(), item]));
  response.json({ users: users.map((user) => ({ id: user._id.toString(), name: user.name, email: user.email, phone: user.phone ?? '', status: user.status, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt ?? null, orderCount: ordersByCustomer.get(user._id.toString())?.count ?? 0, totalOrderValueRwf: ordersByCustomer.get(user._id.toString())?.totalRwf ?? 0 })) });
});

usersRouter.patch('/:userId/status', async (request: AuthenticatedRequest, response) => {
  const userId = typeof request.params.userId === 'string' ? request.params.userId : '';
  const parsed = statusSchema.safeParse(request.body);
  if (!Types.ObjectId.isValid(userId) || !parsed.success) {
    response.status(400).json({ error: 'A valid customer and account status are required' });
    return;
  }
  const user = await UserModel.findOne({ _id: userId, role: 'customer' });
  if (!user) {
    response.status(404).json({ error: 'Customer account not found' });
    return;
  }
  const previousStatus = user.status;
  user.status = parsed.data.status;
  await user.save();
  await recordAdminAudit(request, { action: 'customer.status.update', entityType: 'user', entityId: user._id, metadata: { previousStatus, nextStatus: user.status } });
  response.json({ user: { id: user._id.toString(), status: user.status } });
});
