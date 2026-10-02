import { model, Schema, type InferSchemaType } from 'mongoose';

export const productStatuses = ['active', 'archived'] as const;
export const productUnits = ['piece', 'set', 'pair', 'bag', 'box', 'kg', 'tonne', 'metre', 'litre'] as const;

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true, uppercase: true, unique: true, maxlength: 80 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand' },
    description: { type: String, trim: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    unit: { type: String, enum: productUnits, required: true },
    costPriceRwf: { type: Number, required: true, min: 0, select: false },
    sellingPriceRwf: { type: Number, required: true, min: 0 },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', select: false },
    supplierStock: { type: Number, min: 0, default: 0, select: false },
    minimumOrder: { type: Number, required: true, min: 1, default: 1 },
    status: { type: String, enum: productStatuses, default: 'active', required: true },
  },
  { timestamps: true },
);

productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ status: 1, name: 1 });
productSchema.index({ supplierId: 1, status: 1 });
productSchema.index({ name: 'text', description: 'text', sku: 'text' });

export type Product = InferSchemaType<typeof productSchema>;
export const ProductModel = model<Product>('Product', productSchema);
