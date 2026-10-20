import { lazy } from 'react';
import { createBrowserRouter, Link } from 'react-router-dom';
import { AuthLayout, RequireAuth, RootLayout, ShopLayout } from '../components/layout/Layouts.jsx';
import { Button, EmptyState } from '../components/ui/index.jsx';

// Route code is split per page. Every importer is kept so all pages can be fetched in the background
// once the first page has rendered: later navigation is then instant (no loading skeleton flash).
const pages = {
  HomePage: () => import('../features/home/HomePage.jsx'),
  LoginPage: () => import('../features/auth/LoginPage.jsx'),
  RegisterPage: () => import('../features/auth/RegisterPage.jsx'),
  ProductsPage: () => import('../features/catalog/ProductsPage.jsx'),
  ProductPage: () => import('../features/catalog/ProductPage.jsx'),
  WishlistPage: () => import('../features/wishlist/WishlistPage.jsx'),
  OrdersPage: () => import('../features/orders/OrdersPage.jsx'),
  TrackingPage: () => import('../features/orders/TrackingPage.jsx'),
  CheckoutPage: () => import('../features/checkout/CheckoutPage.jsx'),
  AccountPage: () => import('../features/account/AccountPage.jsx'),
  AdminOrdersPage: () => import('../features/admin/AdminOrdersPage.jsx'),
};
const HomePage = lazy(pages.HomePage);
const LoginPage = lazy(pages.LoginPage);
const RegisterPage = lazy(pages.RegisterPage);
const ProductsPage = lazy(pages.ProductsPage);
const ProductPage = lazy(pages.ProductPage);
const WishlistPage = lazy(pages.WishlistPage);
const OrdersPage = lazy(pages.OrdersPage);
const TrackingPage = lazy(pages.TrackingPage);
const CheckoutPage = lazy(pages.CheckoutPage);
const AccountPage = lazy(pages.AccountPage);
const AdminOrdersPage = lazy(pages.AdminOrdersPage);

/** Fetch every page's code when the browser is idle (after the first page is interactive). */
export function prefetchAllPages() {
  const run = () => Object.values(pages).forEach((load) => load().catch(() => {}));
  if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2000);
}

function NotFound() {
  return (
    <div className="container">
      <EmptyState icon="emptySearch" title="We couldn’t find that page" action={<Button as={Link} to="/" variant="primary">Go home</Button>}>
        The link may be old, or the page has moved.
      </EmptyState>
    </div>
  );
}

function RouteError() {
  return (
    <div className="container">
      <EmptyState icon="emptyBox" title="Something went wrong" action={<Button variant="primary" onClick={() => window.location.reload()}>Reload</Button>}>
        This page hit an unexpected error. Reloading usually fixes it.
      </EmptyState>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/register', element: <RegisterPage /> },
        ],
      },
      {
        element: <ShopLayout />,
        errorElement: <RouteError />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/products', element: <ProductsPage /> },
          { path: '/products/:slug', element: <ProductPage /> },
          { path: '/wishlist', element: <WishlistPage /> },
          {
            element: <RequireAuth />,
            children: [
              { path: '/orders', element: <OrdersPage /> },
              { path: '/orders/:orderNumber', element: <TrackingPage /> },
              { path: '/checkout', element: <CheckoutPage /> },
              { path: '/account', element: <AccountPage /> },
            ],
          },
          { element: <RequireAuth roles={['staff', 'admin']} />, children: [{ path: '/admin/orders', element: <AdminOrdersPage /> }] },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
]);
