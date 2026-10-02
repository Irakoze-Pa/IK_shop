import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../');
config({ path: resolve(projectRoot, '.env') });
config({ path: resolve(projectRoot, '.env.local'), override: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/ik_shop'),
  JWT_SECRET: z.string().min(16).default('local-development-secret-change-me'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid server environment configuration:');
  console.error(parsedEnv.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'));
  process.exit(1);
}

export const env = parsedEnv.data;
