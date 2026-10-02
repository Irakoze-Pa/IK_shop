import { describe, expect, it } from 'vitest';
import { ProductModel } from '../database/models/product.js';
import { publicProduct } from './routes.js';

describe('catalog public DTOs', () => {
  it('does not expose internal supplier or cost fields', () => {
    const product = new ProductModel({
      name: 'Portland Cement',
      slug: 'portland-cement',
      sku: 'IK-CEM-001',
      categoryId: '507f1f77bcf86cd799439011',
      unit: 'bag',
      costPriceRwf: 8500,
      sellingPriceRwf: 10000,
      supplierId: '507f1f77bcf86cd799439012',
      supplierStock: 40,
    });

    const response = publicProduct(product);

    expect(response.sellingPriceRwf).toBe(10000);
    expect(response).not.toHaveProperty('costPriceRwf');
    expect(response).not.toHaveProperty('supplierId');
    expect(response).not.toHaveProperty('supplierStock');
  });

  it('preserves image URLs in the public product gallery', () => {
    const product = new ProductModel({
      name: 'Steel Bar',
      slug: 'steel-bar',
      sku: 'IK-STEEL-001',
      categoryId: '507f1f77bcf86cd799439011',
      unit: 'piece',
      costPriceRwf: 5000,
      sellingPriceRwf: 6500,
      images: ['https://cdn.example.com/steel-bar.jpg'],
    });

    expect(publicProduct(product).images).toEqual(['https://cdn.example.com/steel-bar.jpg']);
  });
});