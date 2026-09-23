import * as z from 'zod';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { ownersApi } from '../../api/owners.js';
import { propertiesApi } from '../../api/properties.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Field, Input, Select, Textarea } from '../../components/ui/Field.js';
import { Alert } from '../../components/ui/Alert.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { fullName } from '../../utils/format.js';
import {
  propertyStatusLabels,
  propertyTypeLabels,
  transactionTypeLabels,
} from '../../utils/labels.js';
import { PROPERTY_STATUSES, PROPERTY_TYPES, TRANSACTION_TYPES } from '../../types/index.js';
import type { PropertyInput } from '../../api/types.js';

/** Champ numérique optionnel sous forme de chaîne (« » = non renseigné).
 *  Les schémas restent en chaînes (même forme que le formulaire) et la
 *  conversion en nombres est faite à la construction du payload, ce qui
 *  évite tout écart entre z.input et z.output avec zodResolver. */
const optionalNumberText = (label: string) =>
  z.string().refine((v) => v === '' || (/^-?\d+(\.\d+)?$/.test(v.trim()) && Number(v) >= 0), {
    message: `${label} doit être un nombre positif.`,
  });

const optionalIntText = (label: string) =>
  z.string().refine((v) => v === '' || (/^\d+$/.test(v.trim()) && Number(v) >= 0), {
    message: `${label} doit être un nombre entier positif.`,
  });

const optionalText = (max: number, label: string) =>
  z.string().max(max, `${label} ne peut pas dépasser ${max} caractères.`);

const propertyFormSchema = z
  .object({
    title: z.string().trim().min(3, 'Le titre doit contenir au moins 3 caractères.').max(150, 'Le titre ne peut pas dépasser 150 caractères.'),
    description: optionalText(5000, 'La description'),
    propertyType: z.enum(PROPERTY_TYPES, { message: 'Sélectionnez un type de bien.' }),
    transactionType: z.enum(TRANSACTION_TYPES, { message: 'Sélectionnez un type de transaction.' }),
    status: z.enum(PROPERTY_STATUSES),
    price: optionalNumberText('Le prix de vente'),
    rentPrice: optionalNumberText('Le loyer mensuel'),
    address: optionalText(255, "L'adresse"),
    city: optionalText(100, 'La ville'),
    district: optionalText(100, 'Le quartier'),
    surfaceArea: optionalNumberText('La surface'),
    bedrooms: optionalIntText('Le nombre de chambres'),
    bathrooms: optionalIntText('Le nombre de salles de bain'),
    ownerId: z.string(),
  })
  .refine((data) => data.price.trim() !== '' || !['SALE', 'SALE_AND_RENT'].includes(data.transactionType), {
    message: 'Le prix de vente est obligatoire pour une vente.',
    path: ['price'],
  })
  .refine((data) => data.rentPrice.trim() !== '' || !['RENT', 'SALE_AND_RENT'].includes(data.transactionType), {
    message: 'Le loyer mensuel est obligatoire pour une location.',
    path: ['rentPrice'],
  });

type PropertyForm = z.infer<typeof propertyFormSchema>;

/** Convertit les valeurs textuelles du formulaire en payload API. */
function formToPayload(values: PropertyForm): PropertyInput {
  const numberOrNull = (value: string): number | null => {
    const trimmed = value.trim();
    return trimmed === '' ? null : Number(trimmed);
  };
  const textOrNull = (value: string): string | null => {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  };
  return {
    title: values.title.trim(),
    description: textOrNull(values.description),
    propertyType: values.propertyType,
    transactionType: values.transactionType,
    status: values.status,
    price: numberOrNull(values.price),
    rentPrice: numberOrNull(values.rentPrice),
    address: textOrNull(values.address),
    city: textOrNull(values.city),
    district: textOrNull(values.district),
    surfaceArea: numberOrNull(values.surfaceArea),
    bedrooms: numberOrNull(values.bedrooms),
    bathrooms: numberOrNull(values.bathrooms),
    ownerId: values.ownerId.trim() === '' ? null : values.ownerId.trim(),
  };
}

export function PropertyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const owners = useAsync(
    (signal) => ownersApi.list({ pageSize: 100 }),
    [],
  );

  const existing = useAsync(
    (signal) => (id ? propertiesApi.getById(id) : Promise.resolve(undefined)),
    [id],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PropertyForm>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      title: '',
      description: '',
      propertyType: 'APARTMENT',
      transactionType: 'SALE',
      status: 'AVAILABLE',
      price: '',
      rentPrice: '',
      address: '',
      city: '',
      district: '',
      surfaceArea: '',
      bedrooms: '',
      bathrooms: '',
      ownerId: '',
    },
  });

  // Pré-remplissage du formulaire en mode modification.
  useEffect(() => {
    if (isEdit && existing.data) {
      const p = existing.data;
      reset({
        title: p.title,
        description: p.description ?? '',
        propertyType: p.propertyType,
        transactionType: p.transactionType,
        status: p.status,
        price: p.price !== null ? String(p.price) : '',
        rentPrice: p.rentPrice !== null ? String(p.rentPrice) : '',
        address: p.address ?? '',
        city: p.city ?? '',
        district: p.district ?? '',
        surfaceArea: p.surfaceArea !== null ? String(p.surfaceArea) : '',
        bedrooms: p.bedrooms !== null ? String(p.bedrooms) : '',
        bathrooms: p.bathrooms !== null ? String(p.bathrooms) : '',
        ownerId: p.ownerId ?? '',
      });
    }
  }, [isEdit, existing.data, reset]);

  const transactionType = watch('transactionType');
  const showSalePrice = transactionType === 'SALE' || transactionType === 'SALE_AND_RENT';
  const showRentPrice = transactionType === 'RENT' || transactionType === 'SALE_AND_RENT';

  if (isEdit && existing.loading && !existing.data) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du bien..." className="flex-col" />
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

  const onSubmit = async (values: PropertyForm) => {
    setSubmitError(null);
    const payload = formToPayload(values);
    try {
      if (isEdit && id) {
        await propertiesApi.update(id, payload);
        navigate(`/biens/${id}`);
      } else {
        const created = await propertiesApi.create(payload);
        navigate(`/biens/${created.id}`);
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
          title={isEdit ? 'Modifier le bien' : 'Nouveau bien'}
          description={
            isEdit
              ? 'Mettez à jour les informations du bien immobilier.'
              : 'La référence du bien sera générée automatiquement à la création.'
          }
        />
      </div>

      {submitError && (
        <div className="mb-4">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* Informations générales */}
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Informations générales</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Titre du bien" required error={errors.title?.message} className="sm:col-span-2">
              <Input placeholder="Ex. : Appartement lumineux avec balcon" error={errors.title?.message} {...register('title')} />
            </Field>
            <Field label="Type de bien" required error={errors.propertyType?.message}>
              <Select error={errors.propertyType?.message} {...register('propertyType')}>
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>{propertyTypeLabels[type]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Type de transaction" required error={errors.transactionType?.message}>
              <Select error={errors.transactionType?.message} {...register('transactionType')}>
                {TRANSACTION_TYPES.map((type) => (
                  <option key={type} value={type}>{transactionTypeLabels[type]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Statut" error={errors.status?.message} hint="Définit la disponibilité actuelle du bien.">
              <Select error={errors.status?.message} {...register('status')}>
                {PROPERTY_STATUSES.map((status) => (
                  <option key={status} value={status}>{propertyStatusLabels[status]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Propriétaire" error={errors.ownerId?.message}>
              <Select error={errors.ownerId?.message} {...register('ownerId')}>
                <option value="">— Aucun propriétaire —</option>
                {(owners.data?.data ?? []).map((owner) => (
                  <option key={owner.id} value={owner.id}>{fullName(owner)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Description" error={errors.description?.message} className="sm:col-span-2">
              <Textarea rows={5} placeholder="Décrivez le bien : atouts, environnement, prestations..." error={errors.description?.message} {...register('description')} />
            </Field>
          </div>
        </Card>

        {/* Prix */}
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Prix</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            {showSalePrice && (
              <Field label="Prix de vente (FCFA)" required error={errors.price?.message}>
                <Input type="number" min="0" step="any" placeholder="Ex. : 25000000" error={errors.price?.message} {...register('price')} />
              </Field>
            )}
            {showRentPrice && (
              <Field label="Loyer mensuel (FCFA)" required error={errors.rentPrice?.message}>
                <Input type="number" min="0" step="any" placeholder="Ex. : 150000" error={errors.rentPrice?.message} {...register('rentPrice')} />
              </Field>
            )}
            {!showSalePrice && !showRentPrice && (
              <p className="text-sm text-slate-400">Sélectionnez un type de transaction pour renseigner le prix.</p>
            )}
          </div>
        </Card>

        {/* Localisation */}
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Localisation</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Adresse" error={errors.address?.message} className="sm:col-span-2">
              <Input placeholder="Ex. : 12 rue des Lilas" error={errors.address?.message} {...register('address')} />
            </Field>
            <Field label="Ville" error={errors.city?.message}>
              <Input placeholder="Ex. : Lyon" error={errors.city?.message} {...register('city')} />
            </Field>
            <Field label="Quartier" error={errors.district?.message}>
              <Input placeholder="Ex. : Croix-Rousse" error={errors.district?.message} {...register('district')} />
            </Field>
          </div>
        </Card>

        {/* Caractéristiques */}
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Caractéristiques</h2>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Surface (m²)" error={errors.surfaceArea?.message}>
              <Input type="number" min="0" step="any" placeholder="Ex. : 75" error={errors.surfaceArea?.message} {...register('surfaceArea')} />
            </Field>
            <Field label="Chambres" error={errors.bedrooms?.message}>
              <Input type="number" min="0" step="1" placeholder="Ex. : 3" error={errors.bedrooms?.message} {...register('bedrooms')} />
            </Field>
            <Field label="Salles de bain" error={errors.bathrooms?.message}>
              <Input type="number" min="0" step="1" placeholder="Ex. : 1" error={errors.bathrooms?.message} {...register('bathrooms')} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" loading={isSubmitting} icon={<Save className="h-4 w-4" />}>
            {isEdit ? 'Enregistrer les modifications' : 'Créer le bien'}
          </Button>
        </div>
      </form>
    </div>
  );
}
