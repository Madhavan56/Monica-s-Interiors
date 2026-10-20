import { useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from '../../stores/session.js';
import { useUi } from '../../stores/ui.js';
import { toast } from '../../stores/toasts.js';
import { useLogout } from '../../features/auth/useAuth.js';
import { dur, ease } from '../../lib/motion.js';
import { Button, Icon, IconButton } from '../ui/index.jsx';
import { CountBadge, NAV, useCounts, Wordmark } from './Navbar.jsx';

/** Mobile left drawer (design spec 3.1). */
export function MobileDrawer() {
  const { drawerOpen, setDrawer, theme, toggleTheme } = useUi();
  const { user, status } = useSession();
  const location = useLocation();
  const logout = useLogout();
  const navigate = useNavigate();

  useEffect(() => setDrawer(false), [location.pathname, setDrawer]);
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setDrawer(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [drawerOpen, setDrawer]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            className="drawer-scrim open" style={{ transition: 'none' }} onClick={() => setDrawer(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur.base }}
          />
          <motion.aside
            className="drawer open" aria-label="Menu" style={{ transition: 'none' }}
            initial={{ x: '-100%' }} animate={{ x: 0, transition: { duration: dur.moderate, ease: ease.out } }}
            exit={{ x: '-100%', transition: { duration: dur.base, ease: ease.in } }}
          >
            <div className="mb-2 flex items-center justify-between">
              <Wordmark />
              <IconButton icon="close" label="Close menu" onClick={() => setDrawer(false)} autoFocus />
            </div>
            <nav aria-label="Mobile">
              {NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
              {status === 'authenticated' && <NavLink to="/account">Account</NavLink>}
              {['staff', 'admin'].includes(user?.role) && <NavLink to="/admin/orders">Manage orders</NavLink>}
            </nav>
            <div className="mt-auto flex flex-col gap-2">
              <Button block onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} />{theme === 'dark' ? 'Light theme' : 'Dark theme'}</Button>
              {status === 'authenticated' ? (
                <Button variant="tertiary" block onClick={() => logout.mutate(undefined, { onSettled: () => { toast('You’re signed out', { type: 'info' }); navigate('/'); } })}>
                  <Icon name="logout" /> Sign out {user.name.split(' ')[0]}
                </Button>
              ) : (
                <Button as={Link} to="/login" variant="primary" block>Sign in</Button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Mobile bottom tab bar. */
export function TabBar() {
  const { wish } = useCounts();
  const status = useSession((s) => s.status);
  const tab = (to, icon, label, extra, end) => (
    <NavLink to={to} end={end}>{icon && <Icon name={icon} size={24} />}<span>{label}</span>{extra}</NavLink>
  );
  return (
    <nav className="tabbar" aria-label="Quick">
      {tab('/', 'home', 'Home', null, true)}
      {tab('/products', 'grid', 'Shop')}
      {tab('/wishlist', 'heartNav', 'Wishlist', <CountBadge count={wish} />)}
      {tab('/orders', 'box', 'Orders')}
      {tab(status === 'authenticated' ? '/account' : '/login', 'user', status === 'authenticated' ? 'Account' : 'Sign in')}
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="flex max-w-[34ch] flex-col gap-3">
            <span className="wordmark" style={{ fontSize: '1.5rem' }}>Monica's <em>Interiors</em></span>
            <p className="muted body-sm">Handcrafted furniture and quiet, considered décor. Designed in Bengaluru, delivered across India.</p>
          </div>
          <div><h4>Shop</h4><ul>
            {['Sofas', 'Chairs', 'Lighting', 'Décor'].map((c) => <li key={c}><Link to={`/products?category=${encodeURIComponent(c)}`}>{c}</Link></li>)}
          </ul></div>
          <div><h4>Help</h4><ul>
            <li><Link to="/orders">Track an order</Link></li><li><a href="#returns">Returns</a></li><li><a href="#delivery">Delivery & assembly</a></li><li><a href="#care">Care guides</a></li>
          </ul></div>
          <div><h4>Studio</h4><ul>
            <li><a href="#consult">Design consult</a></li><li><a href="#makers">Our makers</a></li><li><a href="#journal">Journal</a></li><li><a href="#contact">Contact</a></li>
          </ul></div>
        </div>
        <div className="footer-legal"><span>© 2026 Monica's Interiors</span><span>Privacy · Terms · Accessibility</span></div>
      </div>
    </footer>
  );
}
