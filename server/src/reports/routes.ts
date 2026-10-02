import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import { DeliveryModel } from '../database/models/delivery.js';
import { OrderModel } from '../database/models/order.js';
import { PurchaseOrderModel } from '../database/models/purchase-order.js';
import { InventoryModel } from '../database/models/inventory.js';
import { ProductModel } from '../database/models/product.js';

const dateQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const rangeFilter = (query: unknown) => {
  const parsed = dateQuery.safeParse(query);
  if (!parsed.success || (parsed.data.from && parsed.data.to && parsed.data.from > parsed.data.to)) return undefined;
  const createdAt: { $gte?: Date; $lte?: Date } = {};
  if (parsed.data.from) createdAt.$gte = parsed.data.from;
  if (parsed.data.to) createdAt.$lte = parsed.data.to;
  return Object.keys(createdAt).length > 0 ? { createdAt } : {};
};

const reportOrderStatuses = { $nin: ['cancelled', 'failed'] };

export const reportsRouter = Router();
reportsRouter.use(authenticate, requireRole('admin'));

reportsRouter.get('/summary', async (_request, response) => {
  const [orders, pendingOrders, products, inventory, openPurchaseOrders, pendingDeliveries, recentOrders] = await Promise.all([
    OrderModel.countDocuments({ orderStatus: { $nin: ['cancelled', 'failed'] } }),
    OrderModel.countDocuments({ orderStatus: { $in: ['pending', 'confirmed', 'supplier_check', 'purchasing'] } }),
    ProductModel.countDocuments({ status: 'active' }),
    InventoryModel.find().select('skuSnapshot availableQuantity reservedQuantity unit').sort({ availableQuantity: 1 }).limit(8),
    PurchaseOrderModel.countDocuments({ status: { $in: ['draft', 'sent', 'confirmed', 'partially_received'] } }),
    DeliveryModel.countDocuments({ status: { $in: ['pending', 'assigned', 'dispatched'] } }),
    OrderModel.find({ orderStatus: { $nin: ['cancelled', 'failed'] } }).select('orderNumber totalRwf orderStatus createdAt').sort({ createdAt: -1 }).limit(5),
  ]);
  const revenueRwf = (await OrderModel.aggregate([{ $match: { orderStatus: { $nin: ['cancelled', 'failed'] } } }, { $group: { _id: null, total: { $sum: '$totalRwf' } } }]))[0]?.total ?? 0;
  response.json({ orders, pendingOrders, activeProducts: products, openPurchaseOrders, pendingDeliveries, revenueRwf, lowStock: inventory, recentOrders });
});

reportsRouter.get('/profit', async (request, response) => {
  const range = rangeFilter(request.query);
  if (!range) {
    response.status(400).json({ error: 'Invalid report date range' });
    return;
  }

  const orders = await OrderModel.find({ ...range, orderStatus: reportOrderStatuses });
  const purchaseOrders = await PurchaseOrderModel.find({ ...range, status: { $nin: ['cancelled', 'draft'] } });
  const deliveries = await DeliveryModel.find({ ...range });
  const revenueRwf = orders.reduce((total, order) => total + order.totalRwf, 0);
  const purchaseCostRwf = purchaseOrders.reduce((total, purchaseOrder) => total + purchaseOrder.items.reduce((itemTotal, item) => itemTotal + item.quantityReceived * item.unitCostRwf, 0), 0);
  const deliveryCostRwf = deliveries.reduce((total, delivery) => total + delivery.feeRwf, 0);
  const paymentFeesRwf = 0;
  const otherCostsRwf = 0;
  const grossProfitRwf = revenueRwf - purchaseCostRwf;
  const netProfitRwf = grossProfitRwf - deliveryCostRwf - paymentFeesRwf - otherCostsRwf;

  response.json({
    period: { from: range.createdAt?.$gte ?? null, to: range.createdAt?.$lte ?? null },
    revenueRwf,
    purchaseCostRwf,
    grossProfitRwf,
    deliveryCostRwf,
    paymentFeesRwf,
    otherCostsRwf,
    netProfitRwf,
    orderCount: orders.length,
  });
});

reportsRouter.get('/sales', async (request, response) => {
  const range = rangeFilter(request.query);
  if (!range) {
    response.status(400).json({ error: 'Invalid report date range' });
    return;
  }

  const orders = await OrderModel.find(range).sort({ createdAt: -1 }).limit(500);
  const byStatus = new Map<string, { count: number; totalRwf: number }>();
  for (const order of orders) {
    const current = byStatus.get(order.orderStatus) ?? { count: 0, totalRwf: 0 };
    current.count += 1;
    current.totalRwf += order.totalRwf;
    byStatus.set(order.orderStatus, current);
  }
  response.json({ orderCount: orders.length, revenueRwf: orders.filter((order) => !['cancelled', 'failed'].includes(order.orderStatus)).reduce((total, order) => total + order.totalRwf, 0), byStatus: Object.fromEntries(byStatus) });
});