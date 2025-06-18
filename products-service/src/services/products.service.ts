import { RequestHandler } from "express";
import z from "zod";
import { prisma } from "..";
import { publishMessage } from "./serviceBus";

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export const getProducts: RequestHandler = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const getProductById: RequestHandler = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    const validatedData = createProductSchema.parse(req.body);
    const product = await prisma.product.create({
      data: validatedData,
    });
    // Publish product created event
    await publishMessage("product-created", {
      productId: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
    });
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  try {
    const validatedData = createProductSchema.partial().parse(req.body);
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: validatedData,
    });
    // Publish product updated event
    await publishMessage("product-updated", {
      productId: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
    });
    res.json(product);
  } catch (error) {
    next(error);
  }
};
