import { ServiceBusReceivedMessage } from '@azure/service-bus';
import { prisma } from '../index';

export async function handleOrderCreated(message: ServiceBusReceivedMessage) {
  try {
    const orderData = JSON.parse(message.body);
    console.log('Received order created event:', orderData);
    
    // Update product stock based on order
    for (const item of orderData.items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity
          }
        }
      });
    }
    
    console.log('Product stock updated for order:', orderData.orderId);
  } catch (error) {
    console.error('Error handling order created message:', error);
    throw error;
  }
}