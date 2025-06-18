import { serviceBusClient } from "../index";
import { handleOrderCreated } from "./messageHandlers";

export async function setupServiceBus() {
  try {
    // Subscribe to order-created messages
    const receiver = serviceBusClient.createReceiver("order-created");

    receiver.subscribe({
      processMessage: handleOrderCreated,
      processError: async (args) => {
        console.error("Service Bus error:", args.error);
      },
    });

    console.log("Service Bus listeners setup complete");
  } catch (error) {
    console.error("Failed to setup Service Bus:", error);
  }
}

export async function publishMessage(topicName: string, message: any) {
  try {
    const sender = serviceBusClient.createSender(topicName);
    await sender.sendMessages({
      body: message,
      contentType: "application/json",
    });
    await sender.close();
  } catch (error) {
    console.error("Failed to publish message:", error);
    throw error;
  }
}
