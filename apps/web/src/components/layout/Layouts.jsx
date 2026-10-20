import { Suspense, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from '../../stores/session.js';
import { page } from '../../lib/motion.js';
import { Toaster, ProductSkeletons } from '../ui/index.jsx';
import { Navbar } from './Navbar.jsx';
import { Footer, MobileDrawer, TabBar } from './Chrome.jsx';

function PageFallback() {
  return (
    <div className="container page-loading py-10">
      <div className="skel line mb-6" style={{ width: 240, height: 32 }} />
      <div className="product-grid"><ProductSkeletons count={3} /></div>
    </div>
  );
}

/** Page transition (design spec §5): enter 320ms ease-out from 8px below, exit 160ms fade. */
function AnimatedOutlet() {
  const location = useLocation();
  const mainRef = useRef(null);
  const outlet = useOutlet();
  // Move focus to the new page's h1 for screen readers, and scroll to top
  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => {
      const h1 = mainRef.current?.querySelector('h1');
      if (!h1 || mainRef.current.contains(document.activeElement)) return;
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }, 350);
    return () => clearTimeout(t);
  }, [location.pathname]);
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main id="main" ref={mainRef} key={location.pathname} tabIndex={-1} {...page} className="outline-none [&_h1]:outline-none">
        <Suspense fallback={<PageFallback />}>{outlet}</Suspense>
      </motion.main>
    </AnimatePresence>
  );
}

export function RootLayout() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Outlet />
      <Toaster />
    </>
  );
}

export function ShopLayout() {
  return (
    <div className="has-tabbar">
      <Navbar />
      <MobileDrawer />
      <AnimatedOutlet />
      <Footer />
      <TabBar />
    </div>
  );
}

export function AuthLayout() {
  return <AnimatedOutlet />;
}

/** Guarded routes: skeleton while the session restores, else redirect to /login?next= */
export function RequireAuth({ roles }) {
  const { status, user } = useSession();
  const location = useLocation();
  if (status === 'loading') return <PageFallback />;
  if (status === 'anonymous') return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
