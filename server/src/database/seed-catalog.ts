import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { BrandModel } from './models/brand.js';
import { CategoryModel } from './models/category.js';
import { ProductModel } from './models/product.js';

const categories = [
  { name: 'Cement & Masonry', slug: 'cement-masonry', legacySlug: 'cement-binders', description: 'Cement, mortar, blocks, bricks, sand, aggregates, and masonry materials.' },
  { name: 'Paints & Finishes', slug: 'paints-finishes', legacySlug: 'finishing-materials', description: 'Interior and exterior coatings, primers, finishes, and painting accessories.' },
  { name: 'Steel & Metal', slug: 'steel-metal', legacySlug: 'steel-reinforcement', description: 'Reinforcement bars, binding wire, pipes, sections, profiles, and metal sheets.' },
  { name: 'Roofing', slug: 'roofing', legacySlug: 'roofing-and-exterior', description: 'Roofing sheets, tiles, ridge caps, gutters, fasteners, and insulation.' },
  { name: 'Plumbing', slug: 'plumbing', legacySlug: 'plumbing-electrical', description: 'Pipes, fittings, valves, taps, tanks, pumps, drainage, and connectors.' },
  { name: 'Electrical', slug: 'electrical', description: 'Cables, sockets, switches, protection, distribution, lighting, and conduits.' },
  { name: 'Tiles & Flooring', slug: 'tiles-flooring', description: 'Ceramic, porcelain, wall and floor tiles, grout, and flooring accessories.' },
  { name: 'Bathroom & Sanitary Ware', slug: 'bathroom-sanitary-ware', description: 'Toilets, basins, showers, sinks, faucets, mirrors, and sanitary accessories.' },
  { name: 'Doors, Windows & Security', slug: 'doors-windows-security', description: 'Doors, windows, frames, glass, locks, handles, hinges, and security fittings.' },
  { name: 'Tools & Equipment', slug: 'tools-equipment', legacySlug: 'tools-site-equipment', description: 'Hand tools, power tools, ladders, wheelbarrows, and measuring equipment.' },
  { name: 'Safety & PPE', slug: 'safety-ppe', description: 'Helmets, boots, gloves, eye protection, reflective wear, masks, and harnesses.' },
  { name: 'Construction Chemicals & Adhesives', slug: 'construction-chemicals-adhesives', description: 'Tile and construction adhesives, sealants, epoxy, additives, and bonding agents.' },
];

const brands = [
  { name: 'BuildPro', slug: 'buildpro' },
  { name: 'Rwanda Materials Co.', slug: 'rwanda-materials-co' },
];

const catalogImage = (slug: string): string => env.CLOUDINARY_CLOUD_NAME
  ? `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/ik-shop/products/${slug}.png`
  : `/products/${slug}.png`;

const products = [
  { name: 'Portland Cement 50kg', slug: 'portland-cement-50kg', sku: 'IK-CEM-001', categorySlug: 'cement-masonry', brandSlug: 'buildpro', description: 'General-purpose cement for foundations, masonry, and concrete work.', unit: 'bag', costPriceRwf: 8500, sellingPriceRwf: 10000, minimumOrder: 1, image: catalogImage('portland-cement-50kg') },
  { name: 'Masonry Cement 50kg', slug: 'masonry-cement-50kg', sku: 'IK-CEM-002', categorySlug: 'cement-masonry', brandSlug: 'rwanda-materials-co', description: 'Smooth, dependable cement for blockwork and plastering.', unit: 'bag', costPriceRwf: 7800, sellingPriceRwf: 9500, minimumOrder: 1, image: catalogImage('masonry-cement-50kg') },
  { name: 'Interior Wall Paint 20L', slug: 'interior-wall-paint-20l', sku: 'IK-FIN-002', categorySlug: 'paints-finishes', brandSlug: 'rwanda-materials-co', description: 'Low-odour interior paint for a clean, lasting finish.', unit: 'piece', costPriceRwf: 32000, sellingPriceRwf: 39000, minimumOrder: 1, image: '/products/interior-wall-paint-20l.png' },
  { name: 'Exterior Waterproofing Coating 20L', slug: 'exterior-waterproofing-coating-20l', sku: 'IK-ROOF-002', categorySlug: 'paints-finishes', brandSlug: 'buildpro', description: 'Weather-resistant coating for exterior walls and exposed concrete surfaces.', unit: 'piece', costPriceRwf: 38000, sellingPriceRwf: 46000, minimumOrder: 1, image: '/products/exterior-waterproofing-coating-20l.png' },
  { name: 'High Yield Rebar 12mm', slug: 'high-yield-rebar-12mm', sku: 'IK-STEEL-001', categorySlug: 'steel-metal', brandSlug: 'buildpro', description: 'High-yield reinforcement bar for slabs, beams, and columns.', unit: 'piece', costPriceRwf: 8500, sellingPriceRwf: 10500, minimumOrder: 5, image: '/products/high-yield-rebar-12mm.png' },
  { name: 'Binding Wire 25kg', slug: 'binding-wire-25kg', sku: 'IK-STEEL-002', categorySlug: 'steel-metal', brandSlug: 'rwanda-materials-co', description: 'Flexible annealed wire for tying reinforcement and general site work.', unit: 'kg', costPriceRwf: 18000, sellingPriceRwf: 22000, minimumOrder: 1, image: '/products/binding-wire-25kg.png' },
  { name: 'Corrugated Roofing Sheet', slug: 'corrugated-roofing-sheet', sku: 'IK-ROOF-001', categorySlug: 'roofing', brandSlug: 'buildpro', description: 'Galvanized corrugated sheet for durable roofing and exterior coverage.', unit: 'piece', costPriceRwf: 9500, sellingPriceRwf: 12000, minimumOrder: 5, image: '/products/corrugated-roofing-sheet.png' },
  { name: 'Galvanized Ridge Cap', slug: 'galvanized-ridge-cap', sku: 'IK-ROOF-003', categorySlug: 'roofing', brandSlug: 'rwanda-materials-co', description: 'Galvanized ridge cap for a weather-tight finish at the roof apex.', unit: 'piece', costPriceRwf: 4200, sellingPriceRwf: 5500, minimumOrder: 2, image: '/products/galvanized-ridge-cap.png' },
  { name: 'PVC Pressure Pipe 25mm', slug: 'pvc-pressure-pipe-25mm', sku: 'IK-PLUMB-001', categorySlug: 'plumbing', brandSlug: 'buildpro', description: 'Smooth 25 mm PVC pressure pipe for cold-water plumbing installations.', unit: 'piece', costPriceRwf: 4200, sellingPriceRwf: 5500, minimumOrder: 2, image: '/products/pvc-pressure-pipe-25mm.png' },
  { name: 'PPR Elbow Fitting 25mm', slug: 'ppr-elbow-fitting-25mm', sku: 'IK-PLUMB-002', categorySlug: 'plumbing', brandSlug: 'rwanda-materials-co', description: 'Heat-fusion 90-degree PPR elbow fitting for 25 mm water lines.', unit: 'piece', costPriceRwf: 700, sellingPriceRwf: 1000, minimumOrder: 4, image: '/products/ppr-elbow-fitting-25mm.png' },
  { name: 'Twin & Earth Electrical Cable 100m', slug: 'twin-earth-electrical-cable-100m', sku: 'IK-ELEC-001', categorySlug: 'electrical', brandSlug: 'rwanda-materials-co', description: 'Insulated twin-and-earth cable supplied as a 100 metre coil for fixed wiring.', unit: 'piece', costPriceRwf: 65000, sellingPriceRwf: 78000, minimumOrder: 1, image: '/products/twin-earth-electrical-cable-100m.png' },
  { name: 'Double Wall Socket', slug: 'double-wall-socket', sku: 'IK-ELEC-002', categorySlug: 'electrical', brandSlug: 'buildpro', description: 'Durable double wall socket with a clean white faceplate.', unit: 'piece', costPriceRwf: 4500, sellingPriceRwf: 6000, minimumOrder: 1, image: '/products/double-wall-socket.png' },
  { name: 'Ceramic Floor Tile', slug: 'ceramic-floor-tile', sku: 'IK-FIN-001', categorySlug: 'tiles-flooring', brandSlug: 'buildpro', description: 'Durable neutral ceramic floor tile for homes, shops, and offices.', unit: 'box', costPriceRwf: 12500, sellingPriceRwf: 16000, minimumOrder: 2, image: '/products/ceramic-floor-tile.png' },
  { name: 'Porcelain Floor Tile', slug: 'porcelain-floor-tile', sku: 'IK-TILE-002', categorySlug: 'tiles-flooring', brandSlug: 'rwanda-materials-co', description: 'Polished cream porcelain tile with subtle marble veining.', unit: 'box', costPriceRwf: 19000, sellingPriceRwf: 24000, minimumOrder: 2, image: '/products/porcelain-floor-tile.png' },
  { name: 'Close-Coupled Toilet', slug: 'close-coupled-toilet', sku: 'IK-SAN-001', categorySlug: 'bathroom-sanitary-ware', brandSlug: 'buildpro', description: 'Modern white ceramic close-coupled toilet supplied as a complete set.', unit: 'set', costPriceRwf: 95000, sellingPriceRwf: 120000, minimumOrder: 1, image: '/products/close-coupled-toilet.png' },
  { name: 'Ceramic Wash Basin', slug: 'ceramic-wash-basin', sku: 'IK-SAN-002', categorySlug: 'bathroom-sanitary-ware', brandSlug: 'rwanda-materials-co', description: 'White ceramic pedestal wash basin with a single tap hole.', unit: 'set', costPriceRwf: 54000, sellingPriceRwf: 68000, minimumOrder: 1, image: '/products/ceramic-wash-basin.png' },
  { name: 'Steel Security Door', slug: 'steel-security-door', sku: 'IK-DOOR-001', categorySlug: 'doors-windows-security', brandSlug: 'buildpro', description: 'Full-height steel security door supplied with frame, handle, and lockset.', unit: 'set', costPriceRwf: 180000, sellingPriceRwf: 225000, minimumOrder: 1, image: '/products/steel-security-door.png' },
  { name: 'Aluminium Sliding Window', slug: 'aluminium-sliding-window', sku: 'IK-WIN-001', categorySlug: 'doors-windows-security', brandSlug: 'rwanda-materials-co', description: 'Two-panel aluminium sliding window with clear glass and charcoal frame.', unit: 'piece', costPriceRwf: 125000, sellingPriceRwf: 155000, minimumOrder: 1, image: '/products/aluminium-sliding-window.png' },
  { name: 'Claw Hammer 500g', slug: 'claw-hammer-500g', sku: 'IK-TOOL-001', categorySlug: 'tools-equipment', brandSlug: 'buildpro', description: 'Balanced steel claw hammer with a comfortable non-slip grip.', unit: 'piece', costPriceRwf: 6500, sellingPriceRwf: 8500, minimumOrder: 1, image: '/products/claw-hammer-500g.png' },
  { name: 'Steel Wheelbarrow 80L', slug: 'steel-wheelbarrow-80l', sku: 'IK-SITE-001', categorySlug: 'tools-equipment', brandSlug: 'rwanda-materials-co', description: 'Durable 80 litre steel wheelbarrow for moving materials around the site.', unit: 'piece', costPriceRwf: 48000, sellingPriceRwf: 58000, minimumOrder: 1, image: '/products/steel-wheelbarrow-80l.png' },
  { name: 'Construction Safety Helmet', slug: 'construction-safety-helmet', sku: 'IK-PPE-001', categorySlug: 'safety-ppe', brandSlug: 'buildpro', description: 'Adjustable industrial safety helmet for general construction work.', unit: 'piece', costPriceRwf: 6000, sellingPriceRwf: 8000, minimumOrder: 1, image: '/products/safety-helmet.png' },
  { name: 'Coated Work Gloves', slug: 'coated-work-gloves', sku: 'IK-PPE-002', categorySlug: 'safety-ppe', brandSlug: 'rwanda-materials-co', description: 'Protective work gloves with a textured coated palm for secure handling.', unit: 'pair', costPriceRwf: 1800, sellingPriceRwf: 2500, minimumOrder: 1, image: '/products/coated-work-gloves.png' },
  { name: 'Tile Adhesive 20kg', slug: 'tile-adhesive-20kg', sku: 'IK-CHEM-001', categorySlug: 'construction-chemicals-adhesives', brandSlug: 'buildpro', description: 'Cement-based tile adhesive for ceramic and porcelain installations.', unit: 'bag', costPriceRwf: 9000, sellingPriceRwf: 12000, minimumOrder: 1, image: '/products/tile-adhesive-20kg.png' },
  { name: 'Construction Silicone Sealant', slug: 'construction-silicone-sealant', sku: 'IK-CHEM-002', categorySlug: 'construction-chemicals-adhesives', brandSlug: 'rwanda-materials-co', description: 'Flexible silicone sealant cartridge for glazing, joints, and sanitary applications.', unit: 'piece', costPriceRwf: 4500, sellingPriceRwf: 6000, minimumOrder: 1, image: '/products/construction-silicone-sealant.png' },
];

const seedCatalog = async (): Promise<void> => {
  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const categoryBySlug = new Map<string, string>();
  const brandBySlug = new Map<string, string>();

  for (const category of categories) {
    const { legacySlug, ...categoryFields } = category;
    const existing = await CategoryModel.findOne({ slug: category.slug }) ?? (legacySlug ? await CategoryModel.findOne({ slug: legacySlug }) : null);
    const saved = existing
      ? await CategoryModel.findByIdAndUpdate(existing._id, { ...categoryFields, status: 'active' }, { new: true, runValidators: true })
      : await CategoryModel.create({ ...categoryFields, status: 'active' });
    if (!saved) throw new Error(`Could not seed category ${category.slug}`);
    categoryBySlug.set(category.slug, saved._id.toString());
  }
  for (const brand of brands) {
    const saved = await BrandModel.findOneAndUpdate({ slug: brand.slug }, brand, { upsert: true, new: true, setDefaultsOnInsert: true });
    brandBySlug.set(brand.slug, saved._id.toString());
  }
  for (const product of products) {
    const { categorySlug, brandSlug, image, ...fields } = product;
    const catalogImageUrl = env.CLOUDINARY_CLOUD_NAME ? catalogImage(product.slug) : image;
    await ProductModel.findOneAndUpdate(
      { sku: product.sku },
      { ...fields, categoryId: categoryBySlug.get(categorySlug), brandId: brandBySlug.get(brandSlug), images: [catalogImageUrl], status: 'active' },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
    );
  }

  console.log(`Seeded ${categories.length} categories, ${brands.length} brands, and ${products.length} products.`);
  await mongoose.disconnect();
};

seedCatalog().catch(async (error: unknown) => {
  console.error('Catalog seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
