import { notFound } from 'next/navigation';
import { getProductDetails, getShopProducts } from '../actions';
import { ProductClientView } from './product-client';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const { id } = params;

  const product = await getProductDetails(id);

  if (!product || product.is_cleared) {
    notFound();
  }

  const similarProducts = await getShopProducts(product.shop_id, id);

  return (
    <ProductClientView product={product} similarProducts={similarProducts} />
  );
}
