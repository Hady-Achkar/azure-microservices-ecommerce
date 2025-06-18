CREATE TABLE IF NOT EXISTS "products" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "price" numeric(10, 2) NOT NULL,
    "stock" integer DEFAULT 0 NOT NULL,
    "category" text NOT NULL,
    "imageUrl" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
);