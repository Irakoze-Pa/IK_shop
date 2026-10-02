import { describe, expect, it } from 'vitest';
import { BrandModel } from './brand.js';
import { CategoryModel } from './category.js';
import { CartModel } from './cart.js';
import { ProductModel } from './product.js';
import { OrderModel } from './order.js';
import { PurchaseOrderModel } from './purchase-order.js';
import { SupplierModel } from './supplier.js';
import { InventoryModel } from './inventory.js';
import { StockTransactionModel } from './stock-transaction.js';
import { DeliveryModel } from './delivery.js';
import { NotificationModel } from './notification.js';
import { UserModel } from './user.js';
import { AuditLogModel } from './audit-log.js';

describe('catalog models', () => {
  it('normalizes category and brand identifiers', () => {
    const category = new CategoryModel({ name: 'Cement', slug: 'CEMENT' });
    const brand = new BrandModel({ name: 'IK Materials', slug: 'IK-MATERIALS' });

    expect(category.slug).toBe('cement');
    expect(category.status).toBe('active');
    expect(brand.slug).toBe('ik-materials');
    expect(brand.status).toBe('active');
  });

  it('requires the product catalog contract', async () => {
    const product = new ProductModel();
    const error = product.validateSync();

    expect(error?.errors.name).toBeDefined();
    expect(error?.errors.slug).toBeDefined();
    expect(error?.errors.sku).toBeDefined();
    expect(error?.errors.categoryId).toBeDefined();
    expect(error?.errors.unit).toBeDefined();
    expect(error?.errors.costPriceRwf).toBeDefined();
    expect(error?.errors.sellingPriceRwf).toBeDefined();
  });

  it('normalizes product identifiers and excludes internal fields by default', () => {
    const product = new ProductModel({
      name: 'Portland Cement',
      slug: 'PORTLAND-CEMENT',
      sku: 'ik-cem-001',
      categoryId: '507f1f77bcf86cd799439011',
      unit: 'bag',
      costPriceRwf: 8500,
      sellingPriceRwf: 10000,
    });

    expect(product.slug).toBe('portland-cement');
    expect(product.sku).toBe('IK-CEM-001');
    expect(product.minimumOrder).toBe(1);
    expect(product.schema.path('costPriceRwf')?.options.select).toBe(false);
    expect(product.schema.path('supplierId')?.options.select).toBe(false);
    expect(product.schema.path('supplierStock')?.options.select).toBe(false);
  });

  it('rejects unsupported product units', () => {
    const product = new ProductModel({
      name: 'Portland Cement',
      slug: 'portland-cement',
      sku: 'IK-CEM-001',
      categoryId: '507f1f77bcf86cd799439011',
      unit: 'pallet',
      costPriceRwf: 8500,
      sellingPriceRwf: 10000,
    });

    expect(product.validateSync()?.errors.unit).toBeDefined();
  });

  it('protects user credentials and defaults new accounts to customers', () => {
    const user = new UserModel({
      name: 'Jane Builder',
      email: 'jane@example.com',
      passwordHash: 'hashed-password',
    });

    expect(user.role).toBe('customer');
    expect(user.status).toBe('active');
    expect(user.schema.path('passwordHash')?.options.select).toBe(false);
  });
});

describe('cart model', () => {
  it('requires a customer and preserves cart item snapshots', () => {
    const cart = new CartModel({
      customerId: '507f1f77bcf86cd799439011',
      items: [{
        productId: '507f1f77bcf86cd799439012',
        quantity: 2,
        priceSnapshotRwf: 10000,
        nameSnapshot: 'Portland Cement',
        skuSnapshot: 'IK-CEM-001',
      }],
    });

    expect(cart.validateSync()).toBeUndefined();
    expect(cart.items[0]?.priceSnapshotRwf).toBe(10000);
    expect(cart.schema.path('customerId')?.options.unique).toBe(true);
  });
});

describe('order model', () => {
  it('requires immutable selling snapshots and RWF totals', () => {
    const order = new OrderModel({
      orderNumber: 'IK-2026-TEST01',
      customerId: '507f1f77bcf86cd799439011',
      items: [{
        productId: '507f1f77bcf86cd799439012',
        nameSnapshot: 'Portland Cement',
        skuSnapshot: 'IK-CEM-001',
        unitSnapshot: 'bag',
        quantity: 2,
        unitSellingPriceRwf: 10000,
        lineTotalRwf: 20000,
      }],
      subtotalRwf: 20000,
      totalRwf: 20000,
      deliveryAddress: {
        recipientName: 'Jane Builder',
        phone: '0780000000',
        street: 'KG 1 Ave',
        city: 'Kigali',
      },
    });

    expect(order.validateSync()).toBeUndefined();
    expect(order.paymentStatus).toBe('pending');
    expect(order.orderStatus).toBe('pending');
    expect(order.items[0]?.lineTotalRwf).toBe(20000);
  });
});

describe('purchasing models', () => {
  it('defaults suppliers and purchase orders to operational starting states', () => {
    const supplier = new SupplierModel({ companyName: 'Kigali Materials Ltd', phone: '0780000000' });
    const purchaseOrder = new PurchaseOrderModel({
      purchaseOrderNumber: 'PO-2026-TEST01',
      supplierId: '507f1f77bcf86cd799439011',
      items: [{
        productId: '507f1f77bcf86cd799439012',
        skuSnapshot: 'IK-CEM-001',
        nameSnapshot: 'Portland Cement',
        quantityOrdered: 10,
        unitCostRwf: 8500,
        lineTotalCostRwf: 85000,
      }],
      subtotalCostRwf: 85000,
    });

    expect(supplier.status).toBe('active');
    expect(purchaseOrder.status).toBe('draft');
    expect(purchaseOrder.items[0]?.quantityReceived).toBe(0);
    expect(purchaseOrder.validateSync()).toBeUndefined();
  });
});

describe('inventory models', () => {
  it('starts stock at zero and requires traceable receipt references', () => {
    const inventory = new InventoryModel({
      productId: '507f1f77bcf86cd799439011',
      skuSnapshot: 'IK-CEM-001',
      unit: 'bag',
    });
    const transaction = new StockTransactionModel({
      productId: '507f1f77bcf86cd799439011',
      type: 'receipt',
      quantity: 10,
      source: 'purchase_order_receipt',
      referenceType: 'purchase_order',
      referenceId: '507f1f77bcf86cd799439012',
      performedBy: '507f1f77bcf86cd799439013',
    });

    expect(inventory.availableQuantity).toBe(0);
    expect(inventory.reservedQuantity).toBe(0);
    expect(transaction.validateSync()).toBeUndefined();
  });
});

describe('delivery model', () => {
  it('starts delivery in a pending state with no confirmation', () => {
    const delivery = new DeliveryModel({
      orderId: '507f1f77bcf86cd799439011',
      address: { city: 'Kigali', street: 'KG 1 Ave' },
    });

    expect(delivery.status).toBe('pending');
    expect(delivery.feeRwf).toBe(0);
    expect(delivery.confirmation).toBeUndefined();
    expect(delivery.validateSync()).toBeUndefined();
  });
});

describe('notification model', () => {
  it('defaults new notifications to unread', () => {
    const notification = new NotificationModel({
      recipientId: '507f1f77bcf86cd799439011',
      type: 'order_created',
      title: 'Order received',
      message: 'Your order has been received.',
    });

    expect(notification.readAt).toBeUndefined();
    expect(notification.validateSync()).toBeUndefined();
  });
});

describe('audit log model', () => {
  it('requires traceable actor, action, and entity fields', () => {
    const auditLog = new AuditLogModel({
      actorId: '507f1f77bcf86cd799439011',
      action: 'product.archive',
      entityType: 'product',
      entityId: '507f1f77bcf86cd799439012',
      metadata: { sku: 'IK-CEM-001' },
    });

    expect(auditLog.validateSync()).toBeUndefined();
    expect(auditLog.metadata).toEqual({ sku: 'IK-CEM-001' });
  });
});
