import { ServiceBusReceivedMessage } from "@azure/service-bus";
import { db } from "../index";
import { products } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

// Schema validation for incoming message data
const orderCreatedSchema = z.object({
  orderId: z.string(),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
    })
  ),
});

export async function handleOrderCreated(message: ServiceBusReceivedMessage) {
  try {
    const orderData = orderCreatedSchema.parse(JSON.parse(message.body));
    console.log("Received order created event:", orderData);

    // Update product stock based on order using a transaction
    await db.transaction(async (tx) => {
      for (const item of orderData.items) {
        // Update stock by decrementing the quantity
        const [updatedProduct] = await tx
          .update(products)
          .set({
            stock: sql`${products.stock} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(eq(products.id, item.productId))
          .returning({ id: products.id, stock: products.stock });

        // Check if product exists and has sufficient stock
        if (!updatedProduct) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        // Optionally check for negative stock and handle appropriately
        if (updatedProduct.stock < 0) {
          console.warn(
            `Product ${item.productId} has negative stock: ${updatedProduct.stock}`
          );
          // You might want to implement back-order logic or send alerts here
        }
      }
    });

    console.log("Product stock updated for order:", orderData.orderId);
  } catch (error) {
    console.error("Error handling order created message:", error);
    throw error;
  }
}

// Additional handler for product stock reconciliation
export async function handleStockAdjustment(
  message: ServiceBusReceivedMessage
) {
  try {
    const stockData = z
      .object({
        productId: z.string(),
        adjustment: z.number().int(),
        reason: z.string().optional(),
      })
      .parse(JSON.parse(message.body));

    console.log("Received stock adjustment event:", stockData);

    await db
      .update(products)
      .set({
        stock: sql`${products.stock} + ${stockData.adjustment}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, stockData.productId));

    console.log(
      `Stock adjusted for product ${stockData.productId} by ${stockData.adjustment}`
    );
  } catch (error) {
    console.error("Error handling stock adjustment message:", error);
    throw error;
  }
}
