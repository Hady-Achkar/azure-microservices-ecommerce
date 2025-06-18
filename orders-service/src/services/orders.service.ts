import { RequestHandler } from "express";
import { prisma } from "..";
import { publishMessage } from "./serviceBus";
import { z } from "zod";

const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ),
});

export const getOrders: RequestHandler = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: true },
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrderById: RequestHandler = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
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
    const totalAmount = validatedData.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const order = await prisma.order.create({
      data: {
        userId: validatedData.userId,
        totalAmount,
        items: {
          create: validatedData.items,
        },
      },
      include: { items: true },
    });
    // Publish order created event
    await publishMessage("order-created", {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
    });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};
