import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { loginSchema } from '@mi/shared';
import { Button, Field, Icon, IconButton } from '../../components/ui/index.jsx';
import { SceneArt } from '../../components/commerce/ProductArt.jsx';
import { toast } from '../../stores/toasts.js';
import { useLogin } from './useAuth.js';

/** Split-screen auth shell (design spec 4.1). */
export function AuthShell({ children }) {
  return (
    <div className="auth">
      <div className="auth-art">
        <SceneArt name="login" className="scene-fill" priority sizes="(min-width: 1024px) 50vw, 100vw" />
        <div className="brand-m">Monica's Interiors</div>
        <div className="quote"><p>Spaces that feel like you.</p></div>
      </div>
      <div className="auth-form-wrap">{children}</div>
    </div>
  );
}

export function PasswordField({ register, error, autoComplete = 'current-password', helper }) {
  const [shown, setShown] = useState(false);
  return (
    <Field
      label="Password" type={shown ? 'text' : 'password'} autoComplete={autoComplete} error={error} helper={helper}
      trailing={<IconButton icon={shown ? 'eyeOff' : 'eye'} label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown} onClick={() => setShown((s) => !s)} />}
      {...register('password')}
    />
  );
}

export default function LoginPage() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const navigate = useNavigate();
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema), mode: 'onBlur', reValidateMode: 'onBlur',
    defaultValues: { email: '', password: '', remember: true },
  });

  const onSubmit = (values) => login.mutate(values, {
    onSuccess: ({ data }) => {
      toast(`Welcome back, ${data.user.name.split(' ')[0]}`);
      navigate(next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    },
  });

  return (
    <AuthShell>
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Link className="wordmark" to="/" style={{ fontSize: '1.375rem' }}>Monica's <em>Interiors</em></Link>
        <div>
          <h1 className="text-[clamp(2rem,1.6rem+1.4vw,2.25rem)]">Welcome back</h1>
          <p className="muted mt-1.5">Sign in to see your orders and saved pieces.</p>
        </div>

        <AnimatePresence>
          {login.error && (
            <motion.div className="alert show" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Icon name="alert" size={18} /><span>{login.error.message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Field label="Email" type="email" inputMode="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordField register={register} error={errors.password?.message} />

        <div className="row">
          <label className="check"><input type="checkbox" {...register('remember')} /> Remember me</label>
          <button type="button" className="link-underline link-accent body-sm bg-transparent" onClick={() => toast('Password reset emails arrive once email is connected.', { type: 'info' })}>Forgot password?</button>
        </div>

        <Button type="submit" variant="primary" size="lg" block loading={login.isPending}>Sign in</Button>

        <div className="divider">or</div>
        <div className="flex flex-col gap-3">
          <Button block className="social-btn" onClick={() => toast('Google sign-in needs OAuth keys. Use email for now.', { type: 'info' })}><Icon name="google" size={18} />Continue with Google</Button>
          <Button block className="social-btn" onClick={() => toast('Apple sign-in needs OAuth keys. Use email for now.', { type: 'info' })}><Icon name="apple" size={18} />Continue with Apple</Button>
        </div>

        <p className="body-sm muted text-center">New to Monica's Interiors? <Link className="link-accent" to={`/register?next=${encodeURIComponent(next)}`}>Create account</Link></p>
        <p className="caption faint text-center">Demo account: monica@example.com · interiors123</p>
      </form>
    </AuthShell>
  );
}
