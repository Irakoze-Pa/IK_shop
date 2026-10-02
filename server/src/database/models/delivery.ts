import { model, Schema, type InferSchemaType } from 'mongoose';

export const deliveryStatuses = ['pending', 'assigned', 'dispatched', 'delivered', 'failed', 'returned'] as const;

const deliverySchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    address: { type: Schema.Types.Mixed, required: true },
    feeRwf: { type: Number, required: true, min: 0, default: 0 },
    driverOrPartner: { type: String, trim: true, maxlength: 160 },
    status: { type: String, enum: deliveryStatuses, required: true, default: 'pending' },
    assignedAt: { type: Date },
    dispatchedAt: { type: Date },
    deliveredAt: { type: Date },
    confirmation: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

deliverySchema.index({ status: 1, updatedAt: -1 });
deliverySchema.index({ driverOrPartner: 1, status: 1 });

export type Delivery = InferSchemaType<typeof deliverySchema>;
export const DeliveryModel = model<Delivery>('Delivery', deliverySchema);