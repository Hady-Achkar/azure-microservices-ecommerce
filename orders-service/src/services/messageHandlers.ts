import { ServiceBusReceivedMessage } from "@azure/service-bus";
import { db } from "../index";
import { orders } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { publishMessage } from "./serviceBus";

// Schema validation for incoming message data
const productUpdatedSchema = z.object({
  productId: z.string(),
  name: z.string().optional(),
  price: z.string().optional(),
  stock: z.number().optional(),
});

const productDeletedSchema = z.object({
  productId: z.string(),
});

export async function handleProductUpdated(message: ServiceBusReceivedMessage) {
  try {
    const productData = productUpdatedSchema.parse(JSON.parse(message.body));
    console.log("Received product updated event:", productData);

    // Handle product updates - check if there are pending orders for this product
    const pendingOrders = await db.query.orders.findMany({
      where: eq(orders.status, "PENDING"),
      with: {
        items: true,
      },
    });

    // Filter orders that contain the updated product
    const affectedOrders = pendingOrders.filter((order) =>
      order.items.some((item) => item.productId === productData.productId)
    );

    // If price changed, you might want to notify customers or update order totals
    if (productData.price && affectedOrders.length > 0) {
      console.log(
        `Price changed for product ${productData.productId}, ${affectedOrders.length} pending orders affected`
      );

      // Publish event for price change notifications
      await publishMessage("product-price-changed", {
        productId: productData.productId,
        newPrice: productData.price,
        affectedOrderCount: affectedOrders.length,
      });
    }

    // If stock is low, you might want to alert for pending orders
    if (productData.stock !== undefined && productData.stock < 10) {
      const ordersWithProduct = affectedOrders.filter((order) =>
        order.items.some((item) => item.productId === productData.productId)
      );

      if (ordersWithProduct.length > 0) {
        console.warn(
          `Low stock (${productData.stock}) for product ${productData.productId} with ${ordersWithProduct.length} pending orders`
        );

        await publishMessage("low-stock-alert", {
          productId: productData.productId,
          currentStock: productData.stock,
          pendingOrderCount: ordersWithProduct.length,
        });
      }
    }
  } catch (error) {
    console.error("Error handling product updated message:", error);
    throw error;
  }
}

export async function handleProductDeleted(message: ServiceBusReceivedMessage) {
  try {
    const productData = productDeletedSchema.parse(JSON.parse(message.body));
    console.log("Received product deleted event:", productData);

    // Check for pending orders with this product
    const pendingOrdersWithProduct = await db.query.orders.findMany({
      where: eq(orders.status, "PENDING"),
      with: {
        items: true,
      },
    });

    const affectedOrders = pendingOrdersWithProduct.filter((order) =>
      order.items.some((item) => item.productId === productData.productId)
    );

    if (affectedOrders.length > 0) {
      console.warn(
        `Product ${productData.productId} deleted but has ${affectedOrders.length} pending orders`
      );

      // You might want to cancel these orders or contact customers
      await publishMessage("product-deleted-with-pending-orders", {
        productId: productData.productId,
        affectedOrders: affectedOrders.map((order) => ({
          orderId: order.id,
          userId: order.userId,
        })),
      });
    }
  } catch (error) {
    console.error("Error handling product deleted message:", error);
    throw error;
  }
}

// Handler for inventory reconciliation events
export async function handleInventoryReconciliation(
  message: ServiceBusReceivedMessage
) {
  try {
    const inventoryData = z
      .object({
        productId: z.string(),
        actualStock: z.number().int().min(0),
        systemStock: z.number().int().min(0),
      })
      .parse(JSON.parse(message.body));

    console.log("Received inventory reconciliation event:", inventoryData);

    if (inventoryData.actualStock !== inventoryData.systemStock) {
      // Check if this affects any pending orders
      const pendingOrdersWithProduct = await db.query.orders.findMany({
        where: eq(orders.status, "PENDING"),
        with: {
          items: true,
        },
      });

      const affectedOrders = pendingOrdersWithProduct.filter((order) =>
        order.items.some((item) => item.productId === inventoryData.productId)
      );

      if (
        affectedOrders.length > 0 &&
        inventoryData.actualStock < inventoryData.systemStock
      ) {
        console.warn(
          `Inventory discrepancy for product ${inventoryData.productId}: actual=${inventoryData.actualStock}, system=${inventoryData.systemStock}`
        );

        await publishMessage("inventory-discrepancy-alert", {
          productId: inventoryData.productId,
          actualStock: inventoryData.actualStock,
          systemStock: inventoryData.systemStock,
          affectedOrderCount: affectedOrders.length,
        });
      }
    }
  } catch (error) {
    console.error("Error handling inventory reconciliation message:", error);
    throw error;
  }
}
