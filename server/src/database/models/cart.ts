import { model, Schema, type InferSchemaType } from 'mongoose';

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    priceSnapshotRwf: { type: Number, required: true, min: 0 },
    nameSnapshot: { type: String, required: true, trim: true },
    skuSnapshot: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const cartSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

cartSchema.index({ updatedAt: 1 });

export type Cart = InferSchemaType<typeof cartSchema>;
export const CartModel = model<Cart>('Cart', cartSchema);