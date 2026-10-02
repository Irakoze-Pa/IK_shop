import { Router } from 'express';
import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { z } from 'zod';
import { authenticate, requireRole } from '../auth/middleware.js';
import type { AuthenticatedRequest } from '../auth/types.js';
import { recordAdminAudit } from '../audit/service.js';
import { env } from '../config/env.js';
import { BrandModel } from '../database/models/brand.js';
import { CategoryModel } from '../database/models/category.js';
import { ProductModel, productUnits } from '../database/models/product.js';

const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'Invalid identifier');
const imageUrl = z.string().url().max(2048).refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'Image URL must use HTTP or HTTPS');
const imagesSchema = z.object({ images: z.array(imageUrl).max(20) });
const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  image: imageUrl.optional(),
});
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const productFields = {
  name: z.string().trim().min(1).max(180),
  slug: z.string().trim().min(1).max(200),
  sku: z.string().trim().min(1).max(80),
  categoryId: objectId,
  brandId: objectId.optional(),
  description: z.string().trim().max(2000).optional(),
  images: z.array(imageUrl).max(20).default([]),
  unit: z.enum(productUnits),
  costPriceRwf: z.number().int().min(0),
  sellingPriceRwf: z.number().int().min(0),
  supplierId: objectId.optional(),
  supplierStock: z.number().int().min(0).optional(),
  minimumOrder: z.number().int().min(1).default(1),
};
const createProductSchema = z.object(productFields);
const updateProductSchema = createProductSchema.partial();

const uniqueImages = (images: string[]): string[] => [...new Set(images)];

export const publicProduct = (product: {
  _id: { toString: () => string };
  name: string;
  slug: string;
  sku: string;
  categoryId: unknown;
  brandId?: unknown | null;
  description?: string | null;
  images: string[];
  unit: string;
  sellingPriceRwf: number;
  minimumOrder: number;
  status: string;
}) => ({
  id: product._id.toString(),
  name: product.name,
  slug: product.slug,
  sku: product.sku,
  categoryId: String(product.categoryId),
  ...(product.brandId ? { brandId: String(product.brandId) } : {}),
  description: product.description,
  images: product.images,
  unit: product.unit,
  sellingPriceRwf: product.sellingPriceRwf,
  minimumOrder: product.minimumOrder,
  status: product.status,
});

const publicCategory = (category: { _id: { toString: () => string }; name: string; slug: string; description?: string | null; image?: string | null }) => ({
  id: category._id.toString(),
  name: category.name,
  slug: category.slug,
  description: category.description,
  image: category.image,
});

const publicBrand = (brand: { _id: { toString: () => string }; name: string; slug: string }) => ({
  id: brand._id.toString(),
  name: brand.name,
  slug: brand.slug,
});

const adminProduct = (product: Record<string, unknown> & { _id: { toString: () => string } }) => ({
  ...publicProduct(product as never),
  costPriceRwf: product.costPriceRwf,
  supplierId: product.supplierId,
  supplierStock: product.supplierStock,
});

export const catalogRouter = Router();

catalogRouter.get('/categories', async (_request, response) => {
  const categories = await CategoryModel.find({ status: 'active' }).sort({ name: 1 }).lean();
  response.json({ categories: categories.map(publicCategory) });
});

catalogRouter.post('/admin/categories', authenticate, requireRole('admin'), async (request: AuthenticatedRequest, response) => {
  const parsed = createCategorySchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid category data', details: parsed.error.flatten().fieldErrors });
    return;
  }
  const slug = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existing = await CategoryModel.findOne({ slug }).lean();
  if (existing) {
    response.status(409).json({ error: 'A category with this name already exists' });
    return;
  }
  const category = await CategoryModel.create({ ...parsed.data, slug, status: 'active' });
  await recordAdminAudit(request, { action: 'category.create', entityType: 'category', entityId: category._id });
  response.status(201).json({ category: publicCategory(category) });
});

catalogRouter.get('/brands', async (_request, response) => {
  const brands = await BrandModel.find({ status: 'active' }).sort({ name: 1 }).lean();
  response.json({ brands: brands.map(publicBrand) });
});

catalogRouter.get('/products', async (request, response) => {
  const pagination = paginationSchema.safeParse(request.query);
  if (!pagination.success) {
    response.status(400).json({ error: 'Invalid pagination parameters' });
    return;
  }

  const querySchema = z.object({
    q: z.string().trim().max(100).optional(),
    categoryId: objectId.optional(),
    brandId: objectId.optional(),
  });
  const filters = querySchema.safeParse(request.query);
  if (!filters.success) {
    response.status(400).json({ error: 'Invalid catalog filters' });
    return;
  }

  const { page, limit } = pagination.data;
  const query: Record<string, unknown> = { status: 'active' };
  if (filters.data.categoryId) query.categoryId = filters.data.categoryId;
  if (filters.data.brandId) query.brandId = filters.data.brandId;
  if (filters.data.q) query.$text = { $search: filters.data.q };

  const [products, total] = await Promise.all([
    ProductModel.find(query).sort(filters.data.q ? { score: { $meta: 'textScore' } } : { name: 1 }).skip((page - 1) * limit).limit(limit),
    ProductModel.countDocuments(query),
  ]);

  response.json({ products: products.map(publicProduct), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

catalogRouter.get('/products/:productId', async (request, response) => {
  const productId = objectId.safeParse(request.params.productId);
  if (!productId.success) {
    response.status(400).json({ error: 'Invalid product identifier' });
    return;
  }

  const product = await ProductModel.findOne({ _id: productId.data, status: 'active' });
  if (!product) {
    response.status(404).json({ error: 'Product not found' });
    return;
  }

  response.json({ product: publicProduct(product) });
});

catalogRouter.get('/admin/products', authenticate, requireRole('admin'), async (_request, response) => {
  const products = await ProductModel.find().sort({ status: 1, name: 1 }).select('+costPriceRwf +supplierId +supplierStock').lean();
  response.json({ products: products.map((product) => adminProduct(product as never)) });
});

catalogRouter.post('/admin/uploads/signature', authenticate, requireRole('admin'), async (_request, response) => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;
  if (!cloudName || !apiKey || !apiSecret) {
    response.status(503).json({ error: 'Cloudinary is not configured on the server' });
    return;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = 'ik-shop/products';
  const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest('hex');
  response.json({ cloudName, apiKey, folder, timestamp, signature });
});

catalogRouter.post('/admin/products', authenticate, requireRole('admin'), async (request: AuthenticatedRequest, response) => {
  const parsed = createProductSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Invalid product data', details: parsed.error.flatten().fieldErrors });
    return;
  }

  const product = await ProductModel.create({ ...parsed.data, images: uniqueImages(parsed.data.images) });
  await recordAdminAudit(request, { action: 'product.create', entityType: 'product', entityId: product._id, metadata: { sku: product.sku } });
  response.status(201).json({ product: adminProduct(product.toObject()) });
});

catalogRouter.patch('/admin/products/:productId', authenticate, requireRole('admin'), async (request: AuthenticatedRequest, response) => {
  const productId = objectId.safeParse(request.params.productId);
  const parsed = updateProductSchema.safeParse(request.body);
  if (!productId.success || !parsed.success) {
    response.status(400).json({ error: 'Invalid product update' });
    return;
  }

  const product = await ProductModel.findByIdAndUpdate(
    productId.data,
    { ...parsed.data, ...(parsed.data.images ? { images: uniqueImages(parsed.data.images) } : {}) },
    { new: true, runValidators: true },
  )
    .select('+costPriceRwf +supplierId +supplierStock');
  if (!product) {
    response.status(404).json({ error: 'Product not found' });
    return;
  }
  await recordAdminAudit(request, { action: 'product.update', entityType: 'product', entityId: product._id, metadata: { fieldsChanged: Object.keys(parsed.data).sort().join(',') } });

  response.json({ product: adminProduct(product.toObject()) });
});

catalogRouter.put('/admin/products/:productId/images', authenticate, requireRole('admin'), async (request: AuthenticatedRequest, response) => {
  const productId = objectId.safeParse(request.params.productId);
  const parsed = imagesSchema.safeParse(request.body);
  if (!productId.success || !parsed.success) {
    response.status(400).json({ error: 'Invalid product images' });
    return;
  }

  const product = await ProductModel.findByIdAndUpdate(
    productId.data,
    { images: uniqueImages(parsed.data.images) },
    { new: true, runValidators: true },
  ).select('+costPriceRwf +supplierId +supplierStock');
  if (!product) {
    response.status(404).json({ error: 'Product not found' });
    return;
  }
  await recordAdminAudit(request, { action: 'product.images.replace', entityType: 'product', entityId: product._id, metadata: { imageCount: product.images.length } });

  response.json({ product: adminProduct(product.toObject()) });
});

catalogRouter.post('/admin/products/:productId/archive', authenticate, requireRole('admin'), async (request: AuthenticatedRequest, response) => {
  const productId = objectId.safeParse(request.params.productId);
  if (!productId.success) {
    response.status(400).json({ error: 'Invalid product identifier' });
    return;
  }

  const product = await ProductModel.findByIdAndUpdate(productId.data, { status: 'archived' }, { new: true })
    .select('+costPriceRwf +supplierId +supplierStock');
  if (!product) {
    response.status(404).json({ error: 'Product not found' });
    return;
  }
  await recordAdminAudit(request, { action: 'product.archive', entityType: 'product', entityId: product._id, metadata: { sku: product.sku } });

  response.json({ product: adminProduct(product.toObject()) });
});
