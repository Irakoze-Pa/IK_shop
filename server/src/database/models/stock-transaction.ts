import { model, Schema, type InferSchemaType } from 'mongoose';

const stockTransactionSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    type: { type: String, enum: ['receipt', 'reservation', 'release', 'adjustment'], required: true },
    quantity: { type: Number, required: true, min: 1 },
    source: { type: String, required: true, trim: true, maxlength: 80 },
    referenceType: { type: String, required: true, trim: true, maxlength: 80 },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    unitCostRwf: { type: Number, min: 0 },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockTransactionSchema.index({ productId: 1, createdAt: -1 });
stockTransactionSchema.index({ referenceId: 1 });

export type StockTransaction = InferSchemaType<typeof stockTransactionSchema>;
export const StockTransactionModel = model<StockTransaction>('StockTransaction', stockTransactionSchema);