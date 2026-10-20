import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@mi/shared';
import { Button, Field, Icon } from '../../components/ui/index.jsx';
import { toast } from '../../stores/toasts.js';
import { useRegister } from './useAuth.js';
import { AuthShell, PasswordField } from './LoginPage.jsx';

export default function RegisterPage() {
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const navigate = useNavigate();
  const signup = useRegister();
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema), mode: 'onBlur', reValidateMode: 'onBlur',
    defaultValues: { name: '', email: '', password: '' },
  });

  // Server field errors (e.g. email taken) go under the input
  useEffect(() => {
    Object.entries(signup.error?.fields ?? {}).forEach(([k, message]) => setError(k, { message }));
  }, [signup.error, setError]);

  const onSubmit = (values) => signup.mutate(values, {
    onSuccess: ({ data }) => {
      toast(`Welcome, ${data.user.name.split(' ')[0]}. Your account is ready.`);
      navigate(next.startsWith('/') && !next.startsWith('//') ? next : '/', { replace: true });
    },
  });

  return (
    <AuthShell>
      <form className="auth-form" noValidate onSubmit={handleSubmit(onSubmit)}>
        <Link className="wordmark" to="/" style={{ fontSize: '1.375rem' }}>Monica's <em>Interiors</em></Link>
        <div>
          <h1 className="text-[clamp(2rem,1.6rem+1.4vw,2.25rem)]">Create your account</h1>
          <p className="muted mt-1.5">Save pieces, check out faster and track every delivery.</p>
        </div>
        {signup.error && !signup.error.fields && (
          <div className="alert show" role="alert"><Icon name="alert" size={18} /><span>{signup.error.message}</span></div>
        )}
        <Field label="Full name" autoComplete="name" error={errors.name?.message} {...register('name')} />
        <Field label="Email" type="email" inputMode="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordField register={register} error={errors.password?.message} autoComplete="new-password" helper="At least 8 characters." />
        <Button type="submit" variant="primary" size="lg" block loading={signup.isPending}>Create account</Button>
        <p className="body-sm muted text-center">Already have an account? <Link className="link-accent" to={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
