import { model, Schema, type InferSchemaType } from 'mongoose';

export const purchaseOrderStatuses = ['draft', 'sent', 'confirmed', 'partially_received', 'received', 'closed', 'cancelled'] as const;

const purchaseItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    skuSnapshot: { type: String, required: true, trim: true },
    nameSnapshot: { type: String, required: true, trim: true },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, required: true, min: 0, default: 0 },
    unitCostRwf: { type: Number, required: true, min: 0 },
    lineTotalCostRwf: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const purchaseOrderSchema = new Schema(
  {
    purchaseOrderNumber: { type: String, required: true, unique: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
    sourceOrderIds: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
    items: { type: [purchaseItemSchema], required: true, minlength: 1 },
    subtotalCostRwf: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['RWF'], default: 'RWF', required: true },
    status: { type: String, enum: purchaseOrderStatuses, default: 'draft', required: true },
    expectedDate: { type: Date },
    receivedAt: { type: Date },
    internalNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ supplierId: 1, status: 1 });
purchaseOrderSchema.index({ status: 1, expectedDate: 1 });
purchaseOrderSchema.index({ sourceOrderIds: 1 });

export type PurchaseOrder = InferSchemaType<typeof purchaseOrderSchema>;
export const PurchaseOrderModel = model<PurchaseOrder>('PurchaseOrder', purchaseOrderSchema);