import * as z from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Save, UserRound } from 'lucide-react';
import { authApi } from '../../api/auth.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Card } from '../../components/ui/Card.js';
import { Field, Input } from '../../components/ui/Field.js';
import { Button } from '../../components/ui/Button.js';
import { Alert } from '../../components/ui/Alert.js';
import { Badge } from '../../components/ui/Badge.js';
import { initials } from '../../utils/format.js';
import { roleBadgeClass, roleLabels } from '../../utils/labels.js';

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.').max(50),
  lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(50),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[+0-9 ().-]{6,20}$/.test(v), 'Numéro de téléphone invalide.'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est obligatoire.'),
    newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères.').max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les deux mots de passe ne correspondent pas.',
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onProfileSubmit = async (values: ProfileForm) => {
    setProfileMessage(null);
    setProfileError(null);
    try {
      await authApi.updateProfile({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        phone: values.phone.trim() === '' ? null : values.phone.trim(),
      });
      await refreshUser();
      setProfileMessage('Profil mis à jour avec succès.');
    } catch (err) {
      setProfileError(getApiErrorMessage(err));
    }
  };

  const onPasswordSubmit = async (values: PasswordForm) => {
    setPasswordMessage(null);
    setPasswordError(null);
    try {
      await authApi.changePassword(values);
      passwordForm.reset();
      setPasswordMessage('Mot de passe modifié avec succès.');
    } catch (err) {
      setPasswordError(getApiErrorMessage(err));
    }
  };

  if (!user) return null;

  return (
    <div>
      <PageHeader title="Mon profil" description="Consultez et modifiez vos informations personnelles." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Carte identité */}
        <Card className="h-fit p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
            {initials(user)}
          </span>
          <p className="mt-3 font-semibold text-slate-800">
            {user.firstName} {user.lastName}
          </p>
          <p className="mt-1 mb-2 text-sm break-all text-slate-500">{user.email}</p>
          <Badge className={roleBadgeClass[user.role]}>{roleLabels[user.role]}</Badge>
        </Card>

        {/* Informations personnelles */}
        <Card className="lg:col-span-2">
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
            <UserRound className="h-4 w-4" />
            Informations personnelles
          </h2>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
              <Field label="Email de connexion" hint="L'email de connexion ne peut pas être modifié ici.">
                <Input value={user.email} disabled />
              </Field>
              <Field label="Téléphone" error={profileForm.formState.errors.phone?.message}>
                <Input type="tel" placeholder="Ex. : 06 12 34 56 78" {...profileForm.register('phone')} />
              </Field>
              <Field label="Prénom" required error={profileForm.formState.errors.firstName?.message}>
                <Input {...profileForm.register('firstName')} />
              </Field>
              <Field label="Nom" required error={profileForm.formState.errors.lastName?.message}>
                <Input {...profileForm.register('lastName')} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
              {profileMessage && <Alert variant="success">{profileMessage}</Alert>}
              {profileError && <Alert variant="error">{profileError}</Alert>}
              <Button type="submit" loading={profileForm.formState.isSubmitting} icon={<Save className="h-4 w-4" />}>
                Enregistrer
              </Button>
            </div>
          </form>
        </Card>

        {/* Changement de mot de passe */}
        <Card className="lg:col-span-3">
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">
            <KeyRound className="h-4 w-4" />
            Changer mon mot de passe
          </h2>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate>
            <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
              <Field label="Mot de passe actuel" required error={passwordForm.formState.errors.currentPassword?.message}>
                <Input type="password" autoComplete="current-password" {...passwordForm.register('currentPassword')} />
              </Field>
              <Field label="Nouveau mot de passe" required error={passwordForm.formState.errors.newPassword?.message} hint="8 caractères minimum.">
                <Input type="password" autoComplete="new-password" {...passwordForm.register('newPassword')} />
              </Field>
              <Field label="Confirmer le nouveau mot de passe" required error={passwordForm.formState.errors.confirmPassword?.message}>
                <Input type="password" autoComplete="new-password" {...passwordForm.register('confirmPassword')} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-5 py-3">
              {passwordMessage && <Alert variant="success">{passwordMessage}</Alert>}
              {passwordError && <Alert variant="error">{passwordError}</Alert>}
              <Button type="submit" loading={passwordForm.formState.isSubmitting} icon={<KeyRound className="h-4 w-4" />}>
                Modifier le mot de passe
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
