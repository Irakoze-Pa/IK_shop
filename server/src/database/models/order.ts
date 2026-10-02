import { model, Schema, type InferSchemaType } from 'mongoose';

export const orderStatuses = ['pending', 'confirmed', 'supplier_check', 'purchasing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'failed'] as const;
export const paymentStatuses = ['pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded'] as const;

const orderItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnapshot: { type: String, required: true, trim: true },
    skuSnapshot: { type: String, required: true, trim: true },
    unitSnapshot: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitSellingPriceRwf: { type: Number, required: true, min: 0 },
    lineTotalRwf: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const deliveryAddressSchema = new Schema(
  {
    recipientName: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    street: { type: String, required: true, trim: true, maxlength: 240 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], required: true, minlength: 1 },
    subtotalRwf: { type: Number, required: true, min: 0 },
    deliveryFeeRwf: { type: Number, required: true, min: 0, default: 0 },
    discountRwf: { type: Number, required: true, min: 0, default: 0 },
    totalRwf: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, enum: ['RWF'], default: 'RWF' },
    deliveryAddress: { type: deliveryAddressSchema, required: true },
    deliveryId: { type: Schema.Types.ObjectId, ref: 'Delivery' },
    paymentStatus: { type: String, enum: paymentStatuses, required: true, default: 'pending' },
    orderStatus: { type: String, enum: orderStatuses, required: true, default: 'pending' },
    customerNotes: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true },
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ deliveryId: 1 });

export type Order = InferSchemaType<typeof orderSchema>;
export const OrderModel = model<Order>('Order', orderSchema);