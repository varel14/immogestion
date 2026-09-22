import * as z from 'zod';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import { Field, Input, Textarea } from '../ui/Field.js';

/** Schéma partagé des champs « personne » (propriétaires et clients). */
export const personSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom doit contenir au moins 2 caractères.').max(50),
  lastName: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères.').max(50),
  phone: z
    .string()
    .trim()
    .refine((v) => v === '' || /^[+0-9 ().-]{6,20}$/.test(v), 'Numéro de téléphone invalide.'),
  email: z
    .string()
    .trim()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Adresse email invalide.'),
  address: z.string().trim().max(255, "L'adresse ne peut pas dépasser 255 caractères."),
  identificationNumber: z
    .string()
    .trim()
    .max(50, "Le numéro d'identification ne peut pas dépasser 50 caractères."),
  notes: z.string().trim().max(2000, 'Les notes ne peuvent pas dépasser 2000 caractères.'),
});

export type PersonFormValues = z.input<typeof personSchema>;

/** Champs communs aux formulaires propriétaire et client. */
export function PersonFields({
  register,
  errors,
}: {
  register: UseFormRegister<PersonFormValues>;
  errors: FieldErrors<PersonFormValues>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
      <Field label="Prénom" required error={errors.firstName?.message}>
        <Input placeholder="Ex. : Marie" error={errors.firstName?.message} {...register('firstName')} />
      </Field>
      <Field label="Nom" required error={errors.lastName?.message}>
        <Input placeholder="Ex. : Dupont" error={errors.lastName?.message} {...register('lastName')} />
      </Field>
      <Field label="Téléphone" error={errors.phone?.message}>
        <Input type="tel" placeholder="Ex. : 06 12 34 56 78" error={errors.phone?.message} {...register('phone')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" placeholder="Ex. : marie.dupont@email.fr" error={errors.email?.message} {...register('email')} />
      </Field>
      <Field label="Adresse" error={errors.address?.message} className="sm:col-span-2">
        <Input placeholder="Ex. : 5 avenue de la Gare" error={errors.address?.message} {...register('address')} />
      </Field>
      <Field
        label="N° d'identification"
        error={errors.identificationNumber?.message}
        hint="CIN, passeport ou tout autre document d'identité."
      >
        <Input placeholder="Ex. : AB123456" error={errors.identificationNumber?.message} {...register('identificationNumber')} />
      </Field>
      <div className="hidden sm:block" />
      <Field label="Notes" error={errors.notes?.message} className="sm:col-span-2">
        <Textarea rows={4} placeholder="Informations complémentaires..." error={errors.notes?.message} {...register('notes')} />
      </Field>
    </div>
  );
}

/** Convertit les valeurs du formulaire en payload API (chaînes vides → null). */
export function personFormToPayload(values: PersonFormValues) {
  const trimOrNull = (value: string) => {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    phone: trimOrNull(values.phone),
    email: values.email.trim() === '' ? null : values.email.trim().toLowerCase(),
    address: trimOrNull(values.address),
    identificationNumber: trimOrNull(values.identificationNumber),
    notes: trimOrNull(values.notes),
  };
}
