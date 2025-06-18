import { serviceBusClient } from "../index";
import { handleProductUpdated } from "./messageHandlers";

export async function setupServiceBus() {
  try {
    // Subscribe to product-updated messages
    // const receiver = serviceBusClient.createReceiver("product-updated");

    // receiver.subscribe({
    //   processMessage: handleProductUpdated,
    //   processError: async (args) => {
    //     console.error("Service Bus error:", args.error);
    //   },
    // });

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
