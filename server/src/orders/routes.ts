import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { CartModel } from '../database/models/cart.js';
import { DeliveryModel } from '../database/models/delivery.js';
import { OrderModel } from '../database/models/order.js';
import { ProductModel } from '../database/models/product.js';
import { createNotification } from '../notifications/service.js';

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid identifier');
const checkoutSchema = z.object({
  deliveryAddress: z.object({
    recipientName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(3).max(32),
    street: z.string().trim().min(2).max(240),
    city: z.string().trim().min(2).max(100),
    notes: z.string().trim().max(500).optional(),
  }),
  customerNotes: z.string().trim().max(500).optional(),
});

const orderNumber = (): string => `IK-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;

const publicOrder = (order: {
  _id: { toString: () => string };
  orderNumber: string;
  items: Array<{ productId: { toString: () => string }; nameSnapshot: string; skuSnapshot: string; unitSnapshot: string; quantity: number; unitSellingPriceRwf: number; lineTotalRwf: number }>;
  subtotalRwf: number;
  deliveryFeeRwf: number;
  discountRwf: number;
  totalRwf: number;
  currency: string;
  deliveryAddress: unknown;
  paymentStatus: string;
  orderStatus: string;
  customerNotes?: string | null;
  createdAt: Date;
}) => ({
  id: order._id.toString(),
  orderNumber: order.orderNumber,
  items: order.items.map((item) => ({ ...item, productId: item.productId.toString() })),
  subtotalRwf: order.subtotalRwf,
  deliveryFeeRwf: order.deliveryFeeRwf,
  discountRwf: order.discountRwf,
  totalRwf: order.totalRwf,
  currency: order.currency,
  deliveryAddress: order.deliveryAddress,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  customerNotes: order.customerNotes,
  createdAt: order.createdAt,
});

export const ordersRouter = Router();
ordersRouter.use(authenticate, requireRole('customer'));

ordersRouter.post('/', async (request: AuthenticatedRequest, response) => {
  const parsed = checkoutSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'A valid delivery address is required', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const customerId = request.user?.id;
  if (!customerId) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  const cart = await CartModel.findOne({ customerId });
  if (!cart || cart.items.length === 0) {
    response.status(400).json({ error: 'Your cart is empty' });
    return;
  }

  const productIds = cart.items.map((item) => item.productId);
  const products = await ProductModel.find({ _id: { $in: productIds }, status: 'active' });
  const productById = new Map(products.map((product) => [product._id.toString(), product]));
  const missingProduct = cart.items.find((item) => !productById.has(item.productId.toString()));
  if (missingProduct) {
    response.status(400).json({ error: `${missingProduct.nameSnapshot} is no longer available` });
    return;
  }

  const items = cart.items.map((cartItem) => {
    const product = productById.get(cartItem.productId.toString());
    if (!product) throw new Error('Product disappeared during checkout');
    const lineTotalRwf = product.sellingPriceRwf * cartItem.quantity;
    return {
      productId: product._id,
      nameSnapshot: product.name,
      skuSnapshot: product.sku,
      unitSnapshot: product.unit,
      quantity: cartItem.quantity,
      unitSellingPriceRwf: product.sellingPriceRwf,
      lineTotalRwf,
    };
  });
  const subtotalRwf = items.reduce((total, item) => total + item.lineTotalRwf, 0);
  const deliveryFeeRwf = 0;
  const discountRwf = 0;
  const order = await OrderModel.create({
    orderNumber: orderNumber(),
    customerId,
    items,
    subtotalRwf,
    deliveryFeeRwf,
    discountRwf,
    totalRwf: subtotalRwf + deliveryFeeRwf - discountRwf,
    currency: 'RWF',
    deliveryAddress: parsed.data.deliveryAddress,
    customerNotes: parsed.data.customerNotes,
  });
  const delivery = await DeliveryModel.create({ orderId: order._id, address: parsed.data.deliveryAddress, feeRwf: deliveryFeeRwf });
  order.deliveryId = delivery._id;
  await order.save();
  await createNotification({ recipientId: customerId, type: 'order_created', title: 'Order received', message: `Your order ${order.orderNumber} has been received.`, orderId: order._id.toString() });

  cart.items.splice(0, cart.items.length);
  await cart.save();
  response.status(201).json({ order: publicOrder(order) });
});

ordersRouter.get('/', async (request: AuthenticatedRequest, response) => {
  const orders = await OrderModel.find({ customerId: request.user?.id }).sort({ createdAt: -1 }).limit(50);
  response.json({ orders: orders.map(publicOrder) });
});

ordersRouter.get('/:orderId', async (request: AuthenticatedRequest, response) => {
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
  response.json({ order: publicOrder(order) });
});