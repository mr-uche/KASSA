import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // The URL is required when running migrations, but not for schema-only generation.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
