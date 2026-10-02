import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { CategoryModel } from './models/category.js';

const categories = [
  { name: 'Cement & Binders', slug: 'cement-binders', description: 'Cement, mortar, and binding materials for structural and masonry work.' },
  { name: 'Steel & Reinforcement', slug: 'steel-reinforcement', description: 'Steel bars, mesh, wire, and reinforcement materials for structural work.' },
  { name: 'Finishing Materials', slug: 'finishing-materials', description: 'Tiles, paint, and other materials for completed interior and exterior surfaces.' },
  { name: 'Roofing and Exterior', slug: 'roofing-and-exterior', description: 'Roofing and exterior materials that protect completed buildings.' },
  { name: 'Plumbing & Electrical', slug: 'plumbing-electrical', description: 'Materials for water, drainage, power, and electrical installations.' },
  { name: 'Tools & Site Equipment', slug: 'tools-site-equipment', description: 'Tools and practical equipment used for construction and site work.' },
] as const;

const seedCategories = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  for (const category of categories) {
    await CategoryModel.findOneAndUpdate(
      { slug: category.slug },
      { ...category, status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }

  console.log(`Seeded ${categories.length} categories.`);
  await mongoose.disconnect();
};

seedCategories().catch(async (error: unknown) => {
  console.error('Category seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
