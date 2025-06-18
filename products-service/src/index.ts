import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { ServiceBusClient } from "@azure/service-bus";
import { errorHandler } from "./middleware/errorHandler";
import { PrismaClient } from "@prisma/client";
import { productRoutes } from "./routes/products";
import { setupServiceBus } from "./services/serviceBus";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Initialize Azure Service Bus
export const serviceBusClient = new ServiceBusClient(
  process.env.AZURE_SERVICE_BUS_CONNECTION_STRING!
);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", service: "products-service" });
});

// Routes
app.use("/api/products", productRoutes);

// Error handling middleware
app.use(errorHandler);

// Setup Service Bus listeners
setupServiceBus();

// Start server
async function startServer() {
  try {
    await prisma.$connect();
    console.log("Connected to database");

    app.listen(PORT, () => {
      console.log(`Products service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  await prisma.$disconnect();
  await serviceBusClient.close();
  process.exit(0);
});

startServer();
