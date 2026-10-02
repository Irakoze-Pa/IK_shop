import { model, Schema, type InferSchemaType } from 'mongoose';

export const categoryStatuses = ['active', 'archived'] as const;

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 140 },
    description: { type: String, trim: true, maxlength: 500 },
    image: { type: String, trim: true },
    status: { type: String, enum: categoryStatuses, default: 'active', required: true },
  },
  { timestamps: true },
);

categorySchema.index({ status: 1, name: 1 });

export type Category = InferSchemaType<typeof categorySchema>;
export const CategoryModel = model<Category>('Category', categorySchema);