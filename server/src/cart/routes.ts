import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { CartModel } from '../database/models/cart.js';
import { ProductModel } from '../database/models/product.js';

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid identifier');
const itemSchema = z.object({ quantity: z.number().int().min(1).max(10000) });

const cartResponse = (cart: { items: Array<{
  productId: { toString: () => string };
  quantity: number;
  priceSnapshotRwf: number;
  nameSnapshot: string;
  skuSnapshot: string;
}> }) => ({
  items: cart.items.map((item) => ({
    productId: item.productId.toString(),
    quantity: item.quantity,
    priceSnapshotRwf: item.priceSnapshotRwf,
    nameSnapshot: item.nameSnapshot,
    skuSnapshot: item.skuSnapshot,
    lineTotalRwf: item.quantity * item.priceSnapshotRwf,
  })),
});

const customerCart = async (request: AuthenticatedRequest) => {
  const customerId = request.user?.id;
  if (!customerId) throw new Error('Missing authenticated customer');
  return CartModel.findOneAndUpdate({ customerId }, { $setOnInsert: { customerId, items: [] } }, { new: true, upsert: true });
};

export const cartRouter = Router();
cartRouter.use(authenticate, requireRole('customer'));

cartRouter.get('/', async (request: AuthenticatedRequest, response) => {
  const cart = await customerCart(request);
  response.json({ cart: cartResponse(cart) });
});

cartRouter.put('/items/:productId', async (request: AuthenticatedRequest, response) => {
  const productId = objectId.safeParse(request.params.productId);
  const parsed = itemSchema.safeParse(request.body);
  if (!productId.success || !parsed.success) {
    response.status(400).json({ error: 'A valid product and quantity are required' });
    return;
  }

  const product = await ProductModel.findOne({ _id: productId.data, status: 'active' });
  if (!product) {
    response.status(404).json({ error: 'Product not found' });
    return;
  }
  if (parsed.data.quantity < product.minimumOrder) {
    response.status(400).json({ error: `Minimum order quantity is ${product.minimumOrder}` });
    return;
  }

  const cart = await customerCart(request);
  const existingItem = cart.items.find((item) => item.productId.toString() === productId.data);
  if (existingItem) {
    existingItem.quantity = parsed.data.quantity;
    existingItem.priceSnapshotRwf = product.sellingPriceRwf;
    existingItem.nameSnapshot = product.name;
    existingItem.skuSnapshot = product.sku;
  } else {
    cart.items.push({
      productId: product._id,
      quantity: parsed.data.quantity,
      priceSnapshotRwf: product.sellingPriceRwf,
      nameSnapshot: product.name,
      skuSnapshot: product.sku,
    });
  }
  await cart.save();
  response.json({ cart: cartResponse(cart) });
});

cartRouter.delete('/items/:productId', async (request: AuthenticatedRequest, response) => {
  const productId = objectId.safeParse(request.params.productId);
  if (!productId.success) {
    response.status(400).json({ error: 'Invalid product identifier' });
    return;
  }

  const cart = await customerCart(request);
  cart.items.pull({ productId: productId.data });
  await cart.save();
  response.json({ cart: cartResponse(cart) });
});