import { RequestHandler } from "express";
import { db } from "..";
import { orders, orderItems } from "../db/schema";
import { eq } from "drizzle-orm";
import { publishMessage } from "./serviceBus";
import { z } from "zod";

const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z
        .string()
        .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
          message: "Price must be a positive number",
        }),
    })
  ),
});

export const getOrders: RequestHandler = async (req, res, next) => {
  try {
    const orderList = await db.query.orders.findMany({
      with: {
        items: true,
      },
    });
    res.json(orderList);
  } catch (error) {
    next(error);
  }
};

export const getOrderById: RequestHandler = async (req, res, next) => {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, req.params.id),
      with: {
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const createOrder: RequestHandler = async (req, res, next) => {
  try {
    const validatedData = createOrderSchema.parse(req.body);

    // Calculate total amount
    const totalAmount = validatedData.items
      .reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
      .toString();

    const result = await db.transaction(async (tx) => {
      // Create order
      const [order] = await tx
        .insert(orders)
        .values({
          userId: validatedData.userId,
          totalAmount,
        })
        .returning();

      // Create order items
      const items = await tx
        .insert(orderItems)
        .values(
          validatedData.items.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          }))
        )
        .returning();

      return { order, items };
    });

    // Publish order created event
    // await publishMessage("order-created", {
    //   orderId: result.order.id,
    //   userId: result.order.userId,
    //   totalAmount: result.order.totalAmount,
    //   items: result.items,
    // });

    res.status(201).json({ ...result.order, items: result.items });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus: RequestHandler = async (req, res, next) => {
  try {
    const { status } = req.body;
    const [order] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, req.params.id))
      .returning();

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Publish order status updated event
    // await publishMessage("order-status-updated", {
    //   orderId: order.id,
    //   status: order.status,
    // });

    res.json(order);
  } catch (error) {
    next(error);
  }
};
