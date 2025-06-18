import { ServiceBusReceivedMessage } from '@azure/service-bus';

export async function handleProductUpdated(message: ServiceBusReceivedMessage) {
  try {
    const productData = JSON.parse(message.body);
    console.log('Received product updated event:', productData);
    
    // Handle product updates (e.g., price changes, stock updates)
    // You might want to validate existing orders or notify customers
    
  } catch (error) {
    console.error('Error handling product updated message:', error);
    throw error;
  }
}