'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getMerchantShops() {
  try {
    // In a real app, this would filter by the logged-in user's ID
    const shops = await prisma.shop.findMany({
      take: 5,
      orderBy: { created_at: 'desc' }
    });
    return shops;
  } catch (error) {
    console.error('Error fetching merchant shops:', error);
    return [];
  }
}

export async function getDashboardInventory(shopId: string) {
  try {
    const products = await prisma.deadStockProduct.findMany({
      where: { shop_id: shopId },
      orderBy: { created_at: 'desc' }
    });
    return products;
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
}

export async function toggleProductClearedStatus(productId: string, isCleared: boolean) {
  try {
    const updated = await prisma.deadStockProduct.update({
      where: { id: productId },
      data: { is_cleared: isCleared }
    });
    revalidatePath('/dashboard/dead-stock');
    revalidatePath('/broadcast/dead-stock');
    return { success: true, product: updated };
  } catch (error) {
    console.error('Error toggling clear status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}
