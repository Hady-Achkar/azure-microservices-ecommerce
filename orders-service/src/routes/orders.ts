import { Router } from "express";
import {
  createOrder,
  getOrderById,
  getOrders,
} from "../services/orders.service";

const router: Router = Router();

// GET /api/orders
router.get("/", getOrders);

// GET /api/orders/:id
router.get("/:id", getOrderById);

// POST /api/orders
router.post("/", createOrder);

export { router as orderRoutes };
