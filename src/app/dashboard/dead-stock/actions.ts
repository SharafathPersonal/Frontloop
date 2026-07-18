'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ─────────────────────────────────────────────────────────────────────────────
// READ — Paginated, filtered, sorted inventory for the merchant dashboard.
// ALL filtering happens server-side via Prisma — no client-side slice.
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardInventory(
  shopId: string,
  options: {
    searchQuery?: string;
    statusFilter?: 'all' | 'live' | 'cleared';
    sortOrder?: 'desc' | 'asc';
    page?: number;
    limit?: number;
  } = {}
) {
  const {
    searchQuery = '',
    statusFilter = 'all',
    sortOrder = 'desc',
    page = 1,
    limit = 30,
  } = options;

  try {
    const skip = (page - 1) * limit;

    const whereClause: any = { shop_id: shopId };

    // Status filter
    if (statusFilter === 'live') whereClause.is_cleared = false;
    else if (statusFilter === 'cleared') whereClause.is_cleared = true;

    // Full-text search via Prisma (case-insensitive)
    if (searchQuery.trim() !== '') {
      whereClause.OR = [
        { product_name: { contains: searchQuery.trim(), mode: 'insensitive' } },
        { category: { contains: searchQuery.trim(), mode: 'insensitive' } },
      ];
    }

    const [products, totalCount] = await Promise.all([
      prisma.deadStockProduct.findMany({
        where: whereClause,
        orderBy: { created_at: sortOrder },
        skip,
        take: limit,
      }),
      prisma.deadStockProduct.count({ where: whereClause }),
    ]);

    return {
      products: products.map((p) => ({
        ...p,
        original_price: Number(p.original_price),
        clearance_price: Number(p.clearance_price),
      })),
      totalCount,
      hasMore: skip + limit < totalCount,
    };
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return { products: [], totalCount: 0, hasMore: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight stats — unfiltered count for the hub page
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardInventoryStats(shopId: string) {
  try {
    const [liveCount, clearedCount, liquidationAgg] = await Promise.all([
      prisma.deadStockProduct.count({ where: { shop_id: shopId, is_cleared: false } }),
      prisma.deadStockProduct.count({ where: { shop_id: shopId, is_cleared: true } }),
      prisma.deadStockProduct.aggregate({
        where: { shop_id: shopId, is_cleared: false },
        _sum: { clearance_price: true },
      }),
    ]);
    return {
      liveCount,
      clearedCount,
      totalLiquidationValue: Number(liquidationAgg._sum.clearance_price ?? 0),
    };
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return { liveCount: 0, clearedCount: 0, totalLiquidationValue: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Latest N items for hub preview (unfiltered, just newest)
// ─────────────────────────────────────────────────────────────────────────────

export async function getLatestInventoryItems(shopId: string, limit = 5) {
  try {
    const products = await prisma.deadStockProduct.findMany({
      where: { shop_id: shopId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
    return products.map((p) => ({
      ...p,
      original_price: Number(p.original_price),
      clearance_price: Number(p.clearance_price),
    }));
  } catch (error) {
    console.error('Error fetching latest items:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function toggleProductClearedStatus(productId: string, isCleared: boolean) {
  try {
    const updated = await prisma.deadStockProduct.update({
      where: { id: productId },
      data: { is_cleared: isCleared },
    });
    revalidatePath('/dashboard/dead-stock');
    revalidatePath('/broadcast/dead-stock');
    return {
      success: true,
      product: {
        ...updated,
        original_price: Number(updated.original_price),
        clearance_price: Number(updated.clearance_price),
      },
    };
  } catch (error) {
    console.error('Error toggling clear status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}

export async function deleteProduct(productId: string) {
  try {
    await prisma.deadStockProduct.delete({ where: { id: productId } });
    revalidatePath('/dashboard/dead-stock/manage');
    revalidatePath('/dashboard/dead-stock');
    revalidatePath('/broadcast/dead-stock');
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: 'Failed to delete product' };
  }
}

export async function updateProduct(productId: string, data: any) {
  try {
    const updated = await prisma.deadStockProduct.update({
      where: { id: productId },
      data,
    });
    revalidatePath('/dashboard/dead-stock/manage');
    revalidatePath(`/dashboard/dead-stock/manage/${productId}`);
    revalidatePath('/dashboard/dead-stock');
    revalidatePath('/broadcast/dead-stock');
    return {
      success: true,
      product: {
        ...updated,
        original_price: Number(updated.original_price),
        clearance_price: Number(updated.clearance_price),
      },
    };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: 'Failed to update product' };
  }
}

export async function bulkToggleProductClearedStatus(productIds: string[], isCleared: boolean) {
  try {
    await prisma.deadStockProduct.updateMany({
      where: { id: { in: productIds } },
      data: { is_cleared: isCleared },
    });
    revalidatePath('/dashboard/dead-stock/manage');
    revalidatePath('/dashboard/dead-stock');
    revalidatePath('/broadcast/dead-stock');
    return { success: true };
  } catch (error) {
    console.error('Error in bulk toggle:', error);
    return { success: false, error: 'Failed to bulk update status' };
  }
}

export async function createProduct(data: any) {
  try {
    const created = await prisma.deadStockProduct.create({ data });
    revalidatePath('/dashboard/dead-stock/manage');
    revalidatePath('/dashboard/dead-stock');
    revalidatePath('/broadcast/dead-stock');
    return { success: true, product: created };
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, error: 'Failed to create product' };
  }
}
