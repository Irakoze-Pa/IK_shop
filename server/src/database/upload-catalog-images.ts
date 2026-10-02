import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { ProductModel } from './models/product.js';

const imageDirectory = resolve(process.cwd(), '../client/public/products');
const cloudinaryFolder = 'ik-shop/products';

type CloudinaryUpload = { secure_url?: string; error?: { message?: string } };

const uploadImage = async (fileName: string): Promise<string> => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary is not configured');

  const publicId = basename(fileName, extname(fileName));
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureFields = `folder=${cloudinaryFolder}&invalidate=true&overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(`${signatureFields}${apiSecret}`).digest('hex');
  const image = await readFile(resolve(imageDirectory, fileName));
  const form = new FormData();
  form.append('file', new Blob([image], { type: 'image/png' }), fileName);
  form.append('api_key', apiKey);
  form.append('folder', cloudinaryFolder);
  form.append('invalidate', 'true');
  form.append('overwrite', 'true');
  form.append('public_id', publicId);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
  const result = await response.json() as CloudinaryUpload;
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message ?? `Cloudinary upload failed for ${fileName}`);
  return result.secure_url;
};

const migrateCatalogImages = async (): Promise<void> => {
  const files = (await readdir(imageDirectory)).filter((fileName) => fileName.endsWith('.png')).sort();
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  let uploaded = 0;
  for (const fileName of files) {
    const slug = basename(fileName, '.png');
    const product = await ProductModel.findOne({ $or: [{ slug }, { images: `/products/${fileName}` }] });
    if (!product) throw new Error(`No catalog product matches ${fileName}`);
    const secureUrl = await uploadImage(fileName);
    product.images = [secureUrl];
    await product.save();
    uploaded += 1;
    console.log(`Uploaded ${uploaded}/${files.length}: ${slug}`);
  }

  console.log(`Migrated ${uploaded} catalog images to Cloudinary.`);
  await mongoose.disconnect();
};

migrateCatalogImages().catch(async (error: unknown) => {
  console.error('Catalog image migration failed:', error instanceof Error ? error.message : error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
