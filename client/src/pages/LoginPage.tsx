import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Lock, Mail } from 'lucide-react';
import { useAuth } from '../auth/AuthContext.js';
import { getApiErrorMessage } from '../api/client.js';
import { Button } from '../components/ui/Button.js';
import { Field, Input } from '../components/ui/Field.js';
import { Alert } from '../components/ui/Alert.js';

const loginSchema = z.object({
  email: z.email('Adresse email invalide.'),
  password: z.string().min(1, 'Le mot de passe est obligatoire.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    setError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? '/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">ImmoGestion</h1>
          <p className="mt-1 text-sm text-slate-400">Connectez-vous pour accéder à votre espace de gestion</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-lg font-semibold text-slate-800">Connexion</h2>
          <p className="mt-0.5 mb-5 text-sm text-slate-500">Renseignez vos identifiants pour continuer.</p>

          {error && (
            <div className="mb-4">
              <Alert variant="error">{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Adresse email" required error={errors.email?.message}>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="vous@agence.fr"
                  className="pl-9"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
            </Field>

            <Field label="Mot de passe" required error={errors.password?.message}>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9"
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>
            </Field>

            <Button type="submit" loading={isSubmitting} className="w-full">
              Se connecter
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Application de gestion immobilière — accès réservé aux employés de l'agence.
        </p>
      </div>
    </div>
  );
}
