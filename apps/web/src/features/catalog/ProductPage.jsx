import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { recent } from '../../stores/ui.js';
import { Button, EmptyState, SkeletonLines } from '../../components/ui/index.jsx';
import { ProductDetail } from './ProductDetail.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api(`/products/${slug}`).then((r) => r.data),
  });
  useEffect(() => { if (product) { recent.push(product.id); document.title = `${product.name} – Monica's Interiors`; } }, [product]);

  return (
    <div className="container py-6 lg:py-10">
      <nav className="breadcrumb mb-6" aria-label="Breadcrumb">
        <ol><li><Link to="/">Home</Link></li><li><Link to="/products">Shop</Link></li>{product && <li aria-current="page">{product.name}</li>}</ol>
      </nav>
      {isLoading && <div className="grid gap-6 lg:grid-cols-2"><div className="skel img" /><SkeletonLines lines={5} /></div>}
      {error && <EmptyState icon="emptySearch" title="We couldn’t find that piece" action={<Button as={Link} to="/products" variant="primary">Browse all pieces</Button>}>{error.message}</EmptyState>}
      {product && <ProductDetail product={product} />}
    </div>
  );
}
