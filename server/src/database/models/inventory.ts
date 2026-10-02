import { model, Schema, type InferSchemaType } from 'mongoose';

const inventorySchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    skuSnapshot: { type: String, required: true, trim: true },
    availableQuantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

inventorySchema.index({ skuSnapshot: 1 }, { unique: true });

export type Inventory = InferSchemaType<typeof inventorySchema>;
export const InventoryModel = model<Inventory>('Inventory', inventorySchema);