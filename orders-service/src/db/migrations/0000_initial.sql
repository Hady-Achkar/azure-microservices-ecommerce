DO $$ BEGIN
 CREATE TYPE "OrderStatus" AS ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "orders" (
    "id" text PRIMARY KEY NOT NULL,
    "userId" text NOT NULL,
    "status" "OrderStatus" DEFAULT 'PENDING' NOT NULL,
    "totalAmount" numeric(10, 2) NOT NULL,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" text PRIMARY KEY NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    "quantity" integer NOT NULL,
    "price" numeric(10, 2) NOT NULL
);

DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_orders_id_fk" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;