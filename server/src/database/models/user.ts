import { model, Schema, type InferSchemaType } from 'mongoose';

export const userRoles = ['customer', 'admin'] as const;
export const userStatuses = ['active', 'suspended'] as const;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, maxlength: 254 },
    phone: { type: String, trim: true, sparse: true, unique: true, maxlength: 32 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: userRoles, default: 'customer', required: true },
    status: { type: String, enum: userStatuses, default: 'active', required: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model<User>('User', userSchema);