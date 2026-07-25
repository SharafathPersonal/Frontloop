'use server';

import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';

/**
 * Server Action — Public Dead Stock Directory
 * ALL filtering, sorting, and pagination happens here via Prisma.
 * Never returns more rows than `limit`. No client-side filtering.
 */
function serializeProduct(p: any) {
  if (!p) return null;
  const clean = {
    ...p,
    original_price: p.original_price != null ? Number(p.original_price) : 0,
    clearance_price: p.clearance_price != null ? Number(p.clearance_price) : 0,
    discount_percentage: p.discount_percentage != null ? Number(p.discount_percentage) : 0,
    created_at: p.created_at instanceof Date ? p.created_at.toISOString() : p.created_at,
    updated_at: p.updated_at instanceof Date ? p.updated_at.toISOString() : p.updated_at,
  };

  if (clean.shop) {
    clean.shop = {
      ...clean.shop,
      latitude: clean.shop.latitude != null ? Number(clean.shop.latitude) : null,
      longitude: clean.shop.longitude != null ? Number(clean.shop.longitude) : null,
      created_at: clean.shop.created_at instanceof Date ? clean.shop.created_at.toISOString() : clean.shop.created_at,
    };
  }

  return JSON.parse(JSON.stringify(clean));
}

export async function getDeadStockProducts(
  shopId: string | null = null,
  category: string | null = null,
  searchQuery: string | null = null,
  page: number = 1,
  limit: number = 24,
  sortOrder: 'LOW_TO_HIGH' | 'HIGH_TO_LOW' = 'LOW_TO_HIGH'
) {
  try {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      is_cleared: false,
      shop: {
        is_blocked: false,
        marketplace_active: { not: false },
      },
    };

    if (shopId && shopId !== 'ALL') whereClause.shop_id = shopId;
    if (category && category !== 'ALL') whereClause.category = category;
    if (searchQuery && searchQuery.trim() !== '') {
      whereClause.OR = [
        { product_name: { contains: searchQuery.trim(), mode: 'insensitive' } },
        { description: { contains: searchQuery.trim(), mode: 'insensitive' } },
      ];
    }

    const [products, totalCount] = await Promise.all([
      prisma.deadStockProduct.findMany({
        where: whereClause,
        include: {
          shop: {
            select: {
              id: true,
              shop_name: true,
              contact_number: true,
              location_address: true,
              city: true,
              district: true,
              state: true,
              latitude: true,
              longitude: true,
              google_maps_url: true,
            },
          },
        },
        orderBy:
          sortOrder === 'LOW_TO_HIGH'
            ? { clearance_price: 'asc' }
            : { clearance_price: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deadStockProduct.count({ where: whereClause }),
    ]);

    return {
      products: products.map(serializeProduct),
      totalCount,
      hasMore: skip + limit < totalCount,
    };
  } catch (error) {
    console.error('Error fetching dead stock products:', error);
    return { products: [], totalCount: 0, hasMore: false };
  }
}

/**
 * Cached — category list changes infrequently; safe to cache for 1 hour.
 */
export const getCategories = unstable_cache(
  async () => {
    const products = await prisma.deadStockProduct.findMany({
      where: {
        is_cleared: false,
        shop: { marketplace_active: { not: false }, is_blocked: false },
      },
      select: { category: true },
      distinct: ['category'],
    });
    return products.map((p) => p.category);
  },
  ['dead-stock-categories'],
  { revalidate: 3600, tags: ['dead-stock'] }
);

/**
 * Cached — active shop list; revalidate every 5 minutes.
 */
export const getActiveShops = unstable_cache(
  async () => {
    try {
      const shops = await prisma.shop.findMany({
        where: {
          marketplace_active: { not: false },
          is_blocked: false,
          deadStockProducts: { some: { is_cleared: false } },
        },
        select: { id: true, shop_name: true, city: true },
        orderBy: { shop_name: 'asc' },
      });
      return shops;
    } catch (error) {
      console.error('Error fetching active shops:', error);
      return [];
    }
  },
  ['dead-stock-active-shops'],
  { revalidate: 300, tags: ['dead-stock'] }
);

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
            district: true,
            state: true,
            latitude: true,
            longitude: true,
            google_maps_url: true,
          },
        },
      },
    });
    if (!product) return null;
    return serializeProduct(product);
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
        id: { not: excludeProductId },
      },
      take: 5,
      orderBy: { created_at: 'desc' },
    });
    return products.map(serializeProduct);
  } catch (error) {
    console.error('Error fetching shop products:', error);
    return [];
  }
}
