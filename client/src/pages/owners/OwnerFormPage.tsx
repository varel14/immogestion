import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { ownersApi } from '../../api/owners.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Alert } from '../../components/ui/Alert.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { PersonFields, personFormToPayload, personSchema, type PersonFormValues } from '../../components/forms/PersonFields.js';

export function OwnerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existing = useAsync(
    (signal) => (id ? ownersApi.getById(id) : Promise.resolve(undefined)),
    [id],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema),
    defaultValues: { firstName: '', lastName: '', phone: '', email: '', address: '', identificationNumber: '', notes: '' },
  });

  useEffect(() => {
    if (isEdit && existing.data) {
      const o = existing.data;
      reset({
        firstName: o.firstName,
        lastName: o.lastName,
        phone: o.phone ?? '',
        email: o.email ?? '',
        address: o.address ?? '',
        identificationNumber: o.identificationNumber ?? '',
        notes: o.notes ?? '',
      });
    }
  }, [isEdit, existing.data, reset]);

  if (isEdit && existing.loading && !existing.data) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du propriétaire..." className="flex-col" />
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

  const onSubmit = async (values: PersonFormValues) => {
    setSubmitError(null);
    const payload = personFormToPayload(values);
    try {
      if (isEdit && id) {
        await ownersApi.update(id, payload);
        navigate(`/proprietaires/${id}`);
      } else {
        const created = await ownersApi.create(payload);
        navigate(`/proprietaires/${created.id}`);
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
          title={isEdit ? 'Modifier le propriétaire' : 'Nouveau propriétaire'}
          description={
            isEdit
              ? 'Mettez à jour les informations du propriétaire.'
              : "Enregistrez une personne possédant des biens gérés par l'agence."
          }
        />
      </div>

      {submitError && (
        <div className="mb-4">
          <Alert variant="error">{submitError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Informations personnelles</h2>
          <PersonFields register={register} errors={errors} />
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
            Annuler
          </Button>
          <Button type="submit" loading={isSubmitting} icon={<Save className="h-4 w-4" />}>
            {isEdit ? 'Enregistrer les modifications' : 'Créer le propriétaire'}
          </Button>
        </div>
      </form>
    </div>
  );
}
