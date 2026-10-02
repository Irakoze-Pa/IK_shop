import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { recordAdminAudit } from '../audit/service.js';
import { ProductModel } from '../database/models/product.js';
import { PurchaseOrderModel, purchaseOrderStatuses } from '../database/models/purchase-order.js';
import { SupplierModel } from '../database/models/supplier.js';
import { InventoryModel } from '../database/models/inventory.js';
import { StockTransactionModel } from '../database/models/stock-transaction.js';

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid identifier');
const supplierSchema = z.object({
  companyName: z.string().trim().min(2).max(180),
  contactPerson: z.string().trim().max(120).optional(),
  phone: z.string().trim().min(3).max(32),
  whatsapp: z.string().trim().max(32).optional(),
  address: z.string().trim().max(300).optional(),
  taxDetails: z.string().trim().max(300).optional(),
  paymentTerms: z.string().trim().max(300).optional(),
  internalNotes: z.string().trim().max(1000).optional(),
});
const purchaseOrderSchema = z.object({
  supplierId: objectId,
  sourceOrderIds: z.array(objectId).default([]),
  items: z.array(z.object({ productId: objectId, quantityOrdered: z.number().int().min(1), unitCostRwf: z.number().int().min(0) })).min(1),
  expectedDate: z.coerce.date().optional(),
  internalNotes: z.string().trim().max(1000).optional(),
});
const statusSchema = z.object({ status: z.enum(purchaseOrderStatuses) });
const receiveSchema = z.object({ items: z.array(z.object({ productId: objectId, quantityReceived: z.number().int().min(1) })).min(1) });
const purchaseOrderNumber = (): string => `PO-${new Date().getFullYear()}-${randomBytes(4).toString('hex').toUpperCase()}`;

export const purchasingRouter = Router();
purchasingRouter.use(authenticate, requireRole('admin'));

purchasingRouter.get('/suppliers', async (_request, response) => {
  const suppliers = await SupplierModel.find().sort({ companyName: 1 });
  response.json({ suppliers });
});

purchasingRouter.post('/suppliers', async (request: AuthenticatedRequest, response) => {
  const parsed = supplierSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid supplier data', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const supplier = await SupplierModel.create(parsed.data);
  await recordAdminAudit(request, { action: 'supplier.create', entityType: 'supplier', entityId: supplier._id });
  response.status(201).json({ supplier });
});

purchasingRouter.patch('/suppliers/:supplierId', async (request: AuthenticatedRequest, response) => {
  const supplierId = objectId.safeParse(request.params.supplierId);
  const parsed = supplierSchema.partial().extend({ status: z.enum(['active', 'inactive']).optional() }).safeParse(request.body);
  if (!supplierId.success || !parsed.success) {
    response.status(400).json({ error: 'Invalid supplier update' });
    return;
  }
  const supplier = await SupplierModel.findByIdAndUpdate(supplierId.data, parsed.data, { new: true, runValidators: true });
  if (!supplier) {
    response.status(404).json({ error: 'Supplier not found' });
    return;
  }
  await recordAdminAudit(request, { action: 'supplier.update', entityType: 'supplier', entityId: supplier._id, metadata: { fieldsChanged: Object.keys(parsed.data).sort().join(',') } });
  response.json({ supplier });
});

purchasingRouter.get('/purchase-orders', async (_request, response) => {
  const purchaseOrders = await PurchaseOrderModel.find().populate('supplierId', 'companyName phone').sort({ createdAt: -1 }).limit(100);
  response.json({ purchaseOrders });
});

purchasingRouter.get('/inventory', async (_request, response) => {
  const inventory = await InventoryModel.find().sort({ skuSnapshot: 1 });
  response.json({ inventory });
});

purchasingRouter.get('/stock-transactions', async (request, response) => {
  const productId = request.query.productId ? objectId.safeParse(request.query.productId) : undefined;
  if (productId && !productId.success) {
    response.status(400).json({ error: 'Invalid product identifier' });
    return;
  }
  const transactions = await StockTransactionModel.find(productId ? { productId: productId.data } : {}).sort({ createdAt: -1 }).limit(200);
  response.json({ transactions });
});

purchasingRouter.post('/purchase-orders', async (request: AuthenticatedRequest, response) => {
  const parsed = purchaseOrderSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid purchase order data', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const supplier = await SupplierModel.findOne({ _id: parsed.data.supplierId, status: 'active' });
  if (!supplier) {
    response.status(400).json({ error: 'Active supplier not found' });
    return;
  }
  const products = await ProductModel.find({ _id: { $in: parsed.data.items.map((item) => item.productId) } });
  const productsById = new Map(products.map((product) => [product._id.toString(), product]));
  const items = parsed.data.items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product) throw new Error('Product not found');
    return { productId: product._id, skuSnapshot: product.sku, nameSnapshot: product.name, quantityOrdered: item.quantityOrdered, quantityReceived: 0, unitCostRwf: item.unitCostRwf, lineTotalCostRwf: item.quantityOrdered * item.unitCostRwf };
  });
  const subtotalCostRwf = items.reduce((total, item) => total + item.lineTotalCostRwf, 0);
  const purchaseOrder = await PurchaseOrderModel.create({ purchaseOrderNumber: purchaseOrderNumber(), supplierId: supplier._id, sourceOrderIds: parsed.data.sourceOrderIds, items, subtotalCostRwf, expectedDate: parsed.data.expectedDate, internalNotes: parsed.data.internalNotes });
  await recordAdminAudit(request, { action: 'purchase_order.create', entityType: 'purchase_order', entityId: purchaseOrder._id, metadata: { purchaseOrderNumber: purchaseOrder.purchaseOrderNumber } });
  response.status(201).json({ purchaseOrder });
});

purchasingRouter.patch('/purchase-orders/:purchaseOrderId/status', async (request: AuthenticatedRequest, response) => {
  const purchaseOrderId = objectId.safeParse(request.params.purchaseOrderId);
  const parsed = statusSchema.safeParse(request.body);
  if (!purchaseOrderId.success || !parsed.success) {
    response.status(400).json({ error: 'Invalid purchase order status' });
    return;
  }
  const purchaseOrder = await PurchaseOrderModel.findById(purchaseOrderId.data);
  if (!purchaseOrder) {
    response.status(404).json({ error: 'Purchase order not found' });
    return;
  }
  const allowed: Record<string, string[]> = {
    draft: ['sent', 'cancelled'], sent: ['confirmed', 'cancelled'], confirmed: ['partially_received', 'received', 'cancelled'], partially_received: ['received'], received: ['closed'], closed: [], cancelled: [],
  };
  if (!allowed[purchaseOrder.status]?.includes(parsed.data.status)) {
    response.status(400).json({ error: `Cannot move purchase order from ${purchaseOrder.status} to ${parsed.data.status}` });
    return;
  }
  const previousStatus = purchaseOrder.status;
  purchaseOrder.status = parsed.data.status;
  if (parsed.data.status === 'received') purchaseOrder.receivedAt = new Date();
  await purchaseOrder.save();
  await recordAdminAudit(request, { action: 'purchase_order.status.update', entityType: 'purchase_order', entityId: purchaseOrder._id, metadata: { previousStatus, nextStatus: purchaseOrder.status } });
  response.json({ purchaseOrder });
});

purchasingRouter.post('/purchase-orders/:purchaseOrderId/receive', async (request: AuthenticatedRequest, response) => {
  const purchaseOrderId = objectId.safeParse(request.params.purchaseOrderId);
  const parsed = receiveSchema.safeParse(request.body);
  if (!purchaseOrderId.success || !parsed.success) {
    response.status(400).json({ error: 'Invalid receiving data' });
    return;
  }

  const purchaseOrder = await PurchaseOrderModel.findById(purchaseOrderId.data);
  if (!purchaseOrder || !['confirmed', 'partially_received'].includes(purchaseOrder.status)) {
    response.status(400).json({ error: 'Purchase order is not ready for receiving' });
    return;
  }
  const actorId = request.user?.id;
  if (!actorId) {
    response.status(401).json({ error: 'Authentication required' });
    return;
  }

  const receiptItems = parsed.data.items.map((receipt) => {
    const item = purchaseOrder.items.find((purchaseItem) => purchaseItem.productId.toString() === receipt.productId);
    if (!item || item.quantityReceived + receipt.quantityReceived > item.quantityOrdered) {
      throw new Error('Received quantity exceeds the purchase order');
    }
    return { item, receipt };
  });

  for (const { item, receipt } of receiptItems) {
    item.quantityReceived += receipt.quantityReceived;
    const product = await ProductModel.findById(item.productId);
    if (!product) throw new Error('Product linked to purchase order no longer exists');
    await InventoryModel.findOneAndUpdate(
      { productId: product._id },
      { $setOnInsert: { productId: product._id, skuSnapshot: product.sku, unit: product.unit }, $inc: { availableQuantity: receipt.quantityReceived } },
      { upsert: true, new: true },
    );
    await StockTransactionModel.create({
      productId: product._id,
      type: 'receipt',
      quantity: receipt.quantityReceived,
      source: 'purchase_order_receipt',
      referenceType: 'purchase_order',
      referenceId: purchaseOrder._id,
      unitCostRwf: item.unitCostRwf,
      performedBy: actorId,
    });
  }

  const fullyReceived = purchaseOrder.items.every((item) => item.quantityReceived === item.quantityOrdered);
  purchaseOrder.status = fullyReceived ? 'received' : 'partially_received';
  if (fullyReceived) purchaseOrder.receivedAt = new Date();
  await purchaseOrder.save();
  await recordAdminAudit(request, { action: 'purchase_order.receive', entityType: 'purchase_order', entityId: purchaseOrder._id, metadata: { status: purchaseOrder.status, itemCount: receiptItems.length } });
  response.json({ purchaseOrder });
});
