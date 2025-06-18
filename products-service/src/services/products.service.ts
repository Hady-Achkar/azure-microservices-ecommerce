import { RequestHandler } from "express";
import z from "zod";
import { db } from "..";
import { products } from "../db/schema";
import { eq } from "drizzle-orm";
import { publishMessage } from "./serviceBus";

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Price must be a positive number",
  }),
  stock: z.number().int().min(0),
  category: z.string().min(1),
  imageUrl: z.string().url().optional(),
});

export const getProducts: RequestHandler = async (req, res, next) => {
  try {
    const productList = await db
      .select()
      .from(products)
      .where(eq(products.isActive, true));
    res.json(productList);
  } catch (error) {
    next(error);
  }
};

export const getProductById: RequestHandler = async (req, res, next) => {
  try {
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, req.params.id))
      .limit(1);

    if (product.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product[0]);
  } catch (error) {
    next(error);
  }
};

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    const validatedData = createProductSchema.parse(req.body);
    const [product] = await db
      .insert(products)
      .values({
        ...validatedData,
        price: validatedData.price,
      })
      .returning();

    // // Publish product created event
    // await publishMessage("product-created", {
    //   productId: product.id,
    //   name: product.name,
    //   price: product.price,
    //   stock: product.stock,
    // });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  try {
    const validatedData = createProductSchema.partial().parse(req.body);
    const [product] = await db
      .update(products)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(products.id, req.params.id))
      .returning();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Publish product updated event
    // await publishMessage("product-updated", {
    //   productId: product.id,
    //   name: product.name,
    //   price: product.price,
    //   stock: product.stock,
    // });

    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct: RequestHandler = async (req, res, next) => {
  try {
    const [product] = await db
      .update(products)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(products.id, req.params.id))
      .returning();

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Publish product deleted event
    // await publishMessage("product-deleted", {
    //   productId: product.id,
    // });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
