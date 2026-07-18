'use server';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getDeadStockProducts(shopId?: string) {
  try {
    const whereClause = {
      is_cleared: false,
      marketplace_active: true, // Assuming we only show active ones, but we check shop.marketplace_active
      ...(shopId ? { shop_id: shopId } : {})
    };

    const products = await prisma.deadStockProduct.findMany({
      where: {
        is_cleared: false,
        ...(shopId ? { shop_id: shopId } : {}),
        shop: {
          marketplace_active: true,
          is_blocked: false
        }
      },
      include: {
        shop: {
          select: {
            id: true,
            shop_name: true,
            contact_number: true,
            location_address: true,
            city: true,
            district: true,
            google_maps_url: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return products;
  } catch (error) {
    console.error('Error fetching dead stock products:', error);
    return [];
  }
}

export async function getActiveShops() {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        marketplace_active: true,
        is_blocked: false,
        deadStockProducts: {
          some: {
            is_cleared: false
          }
        }
      },
      select: {
        id: true,
        shop_name: true,
        city: true
      },
      orderBy: {
        shop_name: 'asc'
      }
    });
    return shops;
  } catch (error) {
    console.error('Error fetching active shops:', error);
    return [];
  }
}

export async function getProductDetails(id: string) {
  try {
    const product = await prisma.deadStockProduct.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            shop_name: true,
            contact_number: true,
            location_address: true,
            city: true,
            google_maps_url: true,
          }
        }
      }
    });
    return product;
  } catch (error) {
    console.error('Error fetching product details:', error);
    return null;
  }
}

export async function getShopProducts(shopId: string, excludeProductId: string) {
  try {
    const products = await prisma.deadStockProduct.findMany({
      where: {
        shop_id: shopId,
        is_cleared: false,
        id: { not: excludeProductId }
      },
      take: 5,
      orderBy: { created_at: 'desc' }
    });
    return products;
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return [];
  }
}

