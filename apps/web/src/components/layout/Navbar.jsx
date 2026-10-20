import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSession } from '../../stores/session.js';
import { useUi } from '../../stores/ui.js';
import { toast } from '../../stores/toasts.js';
import { useWishlistIds } from '../../features/wishlist/useWishlist.js';
import { useCart } from '../../features/cart/useCart.js';
import { useLogout } from '../../features/auth/useAuth.js';
import { dur, ease } from '../../lib/motion.js';
import { Button, Icon, IconButton } from '../ui/index.jsx';

export const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Shop' },
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/orders', label: 'Orders' },
];

/** Count badge that pops (scale 1→1.3→1, spring) whenever the number changes. */
export function CountBadge({ count }) {
  const reduce = useReducedMotion();
  if (!count) return null;
  return (
    <motion.span
      key={count} className="count-badge" aria-hidden="true"
      initial={reduce ? false : { scale: 1 }} animate={{ scale: [1, 1.3, 1] }}
      transition={{ duration: dur.moderate, ease: ease.spring, delay: 0.2 }}
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}

export function useCounts() {
  const wish = useWishlistIds().size;
  const { data: cart } = useCart();
  return { wish, cart: cart?.count ?? 0 };
}

export function Wordmark({ className = '' }) {
  return <Link to="/" className={`wordmark ${className}`}>Monica's <em>Interiors</em></Link>;
}

export function Navbar() {
  const { user, status } = useSession();
  const { theme, toggleTheme, setDrawer } = useUi();
  const { wish, cart } = useCounts();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef(null);
  const logout = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  // Shadow after 8px; hide on scroll-down past 200px on mobile (design spec 3.1)
  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      setHidden(window.innerWidth < 1024 && !reduce && y > 200 && y > last);
      last = y;
    };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [reduce]);

  useEffect(() => {
    if (!menu) return undefined;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);
  useEffect(() => setMenu(false), [location.pathname]);

  const initials = user?.name?.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  const signOut = () => logout.mutate(undefined, { onSettled: () => { toast('You’re signed out', { type: 'info' }); navigate('/'); } });

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''} ${hidden ? 'hidden' : ''}`}>
      <div className="container navbar-inner">
        <IconButton icon="menu" label="Open menu" className="menu-btn" onClick={() => setDrawer(true)} />
        <Wordmark />
        <nav aria-label="Main">
          <ul className="nav-links">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.end}>
                  {({ isActive }) => (
                    <>
                      {n.label}
                      {isActive && (
                        <motion.span
                          layoutId="nav-underline" className="absolute -bottom-px left-0 right-0 h-0.5 bg-accent"
                          transition={{ duration: dur.moderate, ease: ease.standard }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-actions">
          <Link className="icon-btn desktop-only" to="/products?focus=search" aria-label="Search products"><Icon name="search" size={22} /></Link>
          <Link className="icon-btn" to="/wishlist" aria-label={`Wishlist, ${wish} item${wish === 1 ? '' : 's'}`}>
            <Icon name="heartNav" size={22} /><CountBadge count={wish} />
          </Link>
          <Link className="icon-btn" to="/checkout" aria-label={`Cart, ${cart} item${cart === 1 ? '' : 's'}`}>
            <Icon name="bag" size={22} /><CountBadge count={cart} />
          </Link>
          <IconButton icon={theme === 'dark' ? 'sun' : 'moon'} label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} className="desktop-only" onClick={toggleTheme} />
          {status === 'authenticated' ? (
            <div className="menu-wrap desktop-only" ref={menuRef}>
              <button type="button" className="icon-btn" aria-haspopup="true" aria-expanded={menu} aria-label="Account menu" onClick={() => setMenu((m) => !m)}>
                <span className="avatar" aria-hidden="true">{initials}</span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div
                    className="dropdown open" role="menu" style={{ transition: 'none' }}
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0, transition: { duration: dur.base, ease: ease.out } }}
                    exit={{ opacity: 0, y: -4, transition: { duration: dur.fast, ease: ease.in } }}
                    onKeyDown={(e) => {
                      const items = [...e.currentTarget.querySelectorAll('[role=menuitem]')];
                      const i = items.indexOf(document.activeElement);
                      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
                      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
                      if (e.key === 'Escape') setMenu(false);
                    }}
                  >
                    <div className="dd-head"><div className="font-semibold">{user.name}</div><div className="body-sm faint">{user.email}</div></div>
                    <Link role="menuitem" to="/orders"><Icon name="box" />Orders</Link>
                    <Link role="menuitem" to="/wishlist"><Icon name="heartNav" />Wishlist</Link>
                    <Link role="menuitem" to="/account"><Icon name="user" />Account</Link>
                    {['staff', 'admin'].includes(user.role) && <Link role="menuitem" to="/admin/orders"><Icon name="truck" />Manage orders</Link>}
                    <button type="button" role="menuitem" onClick={signOut}><Icon name="logout" />Sign out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Button as={Link} to={`/login?next=${encodeURIComponent(location.pathname)}`} size="sm" className="desktop-only ml-2">Sign in</Button>
          )}
        </div>
      </div>
    </header>
  );
}
