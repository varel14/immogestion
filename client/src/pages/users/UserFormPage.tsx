import * as z from 'zod';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { usersApi } from '../../api/users.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Field, Input, Select } from '../../components/ui/Field.js';
import { Alert } from '../../components/ui/Alert.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { roleLabels } from '../../utils/labels.js';
import { ROLES } from '../../types/index.js';
import type { Role } from '../../types/index.js';

const userFormSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.').max(50),
    lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(50),
    email: z.email('Adresse email invalide.'),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[+0-9 ().-]{6,20}$/.test(v), 'Numéro de téléphone invalide.'),
    role: z.custom<Role>((v) => ROLES.includes(v as Role), 'Rôle invalide.'),
    isActive: z.boolean(),
    password: z.string().refine((v) => v === '' || v.length >= 8, {
      message: 'Le mot de passe doit contenir au moins 8 caractères.',
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === '' || data.password === data.confirmPassword, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

type UserFormValues = z.input<typeof userFormSchema>;

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existing = useAsync(
    (signal) => (id ? usersApi.getById(id) : Promise.resolve(undefined)),
    [id],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'AGENT',
      isActive: true,
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (isEdit && existing.data) {
      const u = existing.data;
      reset({
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone ?? '',
        role: u.role,
        isActive: u.isActive,
        password: '',
        confirmPassword: '',
      });
    }
  }, [isEdit, existing.data, reset]);

  if (isEdit && existing.loading && !existing.data) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement de l'utilisateur..." className="flex-col" />
      </div>
    );
  }

  if (isEdit && existing.error) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <ErrorState message={existing.error} onRetry={existing.reload} />
      </div>
    );
  }

  const onSubmit = async (values: UserFormValues) => {
    setSubmitError(null);
    try {
      if (isEdit && id) {
        await usersApi.update(id, {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim() === '' ? null : values.phone.trim(),
          role: values.role,
          isActive: values.isActive,
          password: values.password === '' ? undefined : values.password,
        });
        navigate(`/utilisateurs/${id}`);
      } else {
        await usersApi.create({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone.trim() === '' ? null : values.phone.trim(),
          role: values.role,
          isActive: values.isActive,
          password: values.password,
        });
        navigate('/utilisateurs');
      }
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    }
  };

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate(-1)}>
        Retour
      </Button>

      <div className="mt-3">
        <PageHeader
          title={isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
          description={
            isEdit
              ? 'Mettez à jour les informations, le rôle ou le statut du compte.'
              : "Créez un compte pour une personne autorisée à utiliser l'application."
          }
        />
      </div>

      {submitError && (
        <div className="mb-4">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Informations personnelles</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Prénom" required error={errors.firstName?.message}>
              <Input placeholder="Ex. : Sophie" error={errors.firstName?.message} {...register('firstName')} />
            </Field>
            <Field label="Nom" required error={errors.lastName?.message}>
              <Input placeholder="Ex. : Martin" error={errors.lastName?.message} {...register('lastName')} />
            </Field>
            <Field label="Email de connexion" required error={errors.email?.message}>
              <Input type="email" placeholder="Ex. : sophie.martin@agence.fr" error={errors.email?.message} {...register('email')} />
            </Field>
            <Field label="Téléphone" error={errors.phone?.message}>
              <Input type="tel" placeholder="Ex. : 06 12 34 56 78" error={errors.phone?.message} {...register('phone')} />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Rôle et accès</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field
              label="Rôle"
              required
              error={errors.role?.message}
              hint="L'administrateur gère les comptes ; agent et responsable gèrent les biens, propriétaires et clients."
            >
              <Select error={errors.role?.message} {...register('role')}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Statut du compte" error={errors.isActive?.message}>
              <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                  {...register('isActive')}
                />
                <span className="text-sm text-slate-700">Compte actif (connexion autorisée)</span>
              </label>
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Mot de passe</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field
              label={isEdit ? 'Nouveau mot de passe' : 'Mot de passe'}
              required={!isEdit}
              error={errors.password?.message}
              hint={isEdit ? 'Laissez vide pour conserver le mot de passe actuel.' : '8 caractères minimum.'}
            >
              <Input
                type="password"
                autoComplete={isEdit ? 'new-password' : 'new-password'}
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
            </Field>
            <Field
              label="Confirmation du mot de passe"
              required={!isEdit}
              error={errors.confirmPassword?.message}
            >
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" loading={isSubmitting} icon={<Save className="h-4 w-4" />}>
            {isEdit ? 'Enregistrer les modifications' : 'Créer le compte'}
          </Button>
        </div>
      </form>
    </div>
  );
}
