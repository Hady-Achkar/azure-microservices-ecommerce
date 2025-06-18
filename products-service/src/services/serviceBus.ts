import { serviceBusClient } from "../index";
import { handleOrderCreated, handleStockAdjustment } from "./messageHandlers";

export async function setupServiceBus() {
  try {
    // Subscribe to order-created messages with subscription
    const orderCreatedReceiver = serviceBusClient.createReceiver(
      "order-created",
      "products-service-subscription"
    );

    orderCreatedReceiver.subscribe({
      processMessage: handleOrderCreated,
      processError: async (args) => {
        console.error("Service Bus error for order-created:", args.error);
        console.error(
          "Error details:",
          args.errorSource,
          args.fullyQualifiedNamespace
        );
      },
    });

    console.log("Service Bus listeners setup complete for products-service");
  } catch (error) {
    console.error("Failed to setup Service Bus:", error);
    throw error;
  }
}

export async function publishMessage(topicName: string, message: any) {
  try {
    const sender = serviceBusClient.createSender(topicName);

    await sender.sendMessages({
      body: JSON.stringify(message),
      contentType: "application/json",
      messageId: `${topicName}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      timeToLive: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      subject: topicName,
    });

    await sender.close();
    console.log(`Message published successfully to topic: ${topicName}`);
  } catch (error) {
    console.error(`Failed to publish message to ${topicName}:`, error);
    throw error;
  }
}

// Graceful shutdown function
export async function closeServiceBus() {
  try {
    await serviceBusClient.close();
    console.log("Service Bus client closed successfully");
  } catch (error) {
    console.error("Error closing Service Bus client:", error);
  }
}
