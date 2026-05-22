import { defineConfig } from "@prisma/internals";

export default defineConfig({
  // Prisma 7 requires datasource URLs to be passed here or via environment
  // The schema.prisma will read from the .env DATABASE_URL variable
});
