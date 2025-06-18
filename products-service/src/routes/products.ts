import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
} from "../services/products.service";

const router: Router = Router();

// GET /api/products
router.get("/", getProducts);

// GET /api/products/:id
router.get("/:id", getProductById);

// POST /api/products
router.post("/", createProduct);

// PUT /api/products/:id
router.put("/:id", updateProduct);

export { router as productRoutes };
