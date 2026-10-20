import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useSession } from '../../stores/session.js';
import { useUi } from '../../stores/ui.js';
import { toast } from '../../stores/toasts.js';
import { Badge, Button, Icon } from '../../components/ui/index.jsx';
import { useLogout } from '../auth/useAuth.js';

export default function AccountPage() {
  const user = useSession((s) => s.user);
  const { theme, toggleTheme } = useUi();
  const logout = useLogout();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const logoutAll = useMutation({
    mutationFn: () => api('/auth/logout-all', { method: 'POST' }),
    onSettled: () => { useSession.getState().clear(); qc.clear(); toast('Signed out on every device', { type: 'info' }); navigate('/'); },
  });

  return (
    <div className="container">
      <div className="title-row"><h1>Account</h1></div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel">
          <h3>Profile</h3>
          <p className="font-semibold">{user.name}</p>
          <p className="muted body-sm">{user.email}</p>
          <div className="mt-3 flex gap-2">
            <Badge tone={user.emailVerified ? 'success' : 'warning'} dot>{user.emailVerified ? 'Email verified' : 'Email not verified'}</Badge>
            {user.role !== 'customer' && <Badge tone="info" dot>{user.role}</Badge>}
          </div>
        </section>
        <section className="panel">
          <h3>Saved addresses</h3>
          {user.addresses?.length ? user.addresses.map((a) => (
            <p key={a._id} className="body-sm muted mb-2"><strong className="text-ink">{a.label}{a.isDefault ? ' · default' : ''}</strong><br />{a.line1}, {a.city} {a.pincode}</p>
          )) : <p className="body-sm muted">Addresses you use at checkout appear here.</p>}
        </section>
        <section className="panel">
          <h3>Preferences</h3>
          <Button onClick={toggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} />{theme === 'dark' ? 'Use light theme' : 'Use dark theme'}</Button>
        </section>
        <section className="panel">
          <h3>Sessions</h3>
          <div className="flex flex-wrap gap-2">
            <Button as={Link} to="/orders">Your orders</Button>
            <Button variant="tertiary" loading={logout.isPending} onClick={() => logout.mutate(undefined, { onSettled: () => navigate('/') })}>Sign out</Button>
            <Button variant="tertiary" loading={logoutAll.isPending} onClick={() => logoutAll.mutate()}>Sign out everywhere</Button>
          </div>
        </section>
      </div>
    </div>
  );
}
