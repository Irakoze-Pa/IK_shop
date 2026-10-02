import { model, Schema, type InferSchemaType } from 'mongoose';

export const supplierStatuses = ['active', 'inactive'] as const;

const supplierSchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 180 },
    contactPerson: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 32 },
    whatsapp: { type: String, trim: true, maxlength: 32 },
    address: { type: String, trim: true, maxlength: 300 },
    taxDetails: { type: String, trim: true, maxlength: 300 },
    paymentTerms: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: supplierStatuses, default: 'active', required: true },
    internalNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

supplierSchema.index({ status: 1, companyName: 1 });

export type Supplier = InferSchemaType<typeof supplierSchema>;
export const SupplierModel = model<Supplier>('Supplier', supplierSchema);