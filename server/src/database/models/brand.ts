import { model, Schema, type InferSchemaType } from 'mongoose';

export const brandStatuses = ['active', 'archived'] as const;

const brandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 140 },
    status: { type: String, enum: brandStatuses, default: 'active', required: true },
  },
  { timestamps: true },
);

brandSchema.index({ status: 1, name: 1 });

export type Brand = InferSchemaType<typeof brandSchema>;
export const BrandModel = model<Brand>('Brand', brandSchema);