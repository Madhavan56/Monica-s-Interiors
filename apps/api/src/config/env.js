import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  // Comma-separated list of allowed web origins
  WEB_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173').transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
  MONGODB_URI: z.string().optional().transform((v) => v || undefined),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_MINUTES: z.coerce.number().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().default(30),
  COURIER_WEBHOOK_SECRET: z.string().min(8),
  DEMO_AUTO_ADVANCE_SECONDS: z.coerce.number().default(0),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
