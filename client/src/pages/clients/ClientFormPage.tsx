import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { clientsApi } from '../../api/clients.js';
import { getApiErrorMessage } from '../../api/client.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Alert } from '../../components/ui/Alert.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { PersonFields, personFormToPayload, personSchema, type PersonFormValues } from '../../components/forms/PersonFields.js';

export function ClientFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const existing = useAsync(
    (signal) => (id ? clientsApi.getById(id) : Promise.resolve(undefined)),
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
      const c = existing.data;
      reset({
        firstName: c.firstName,
        lastName: c.lastName,
        phone: c.phone ?? '',
        email: c.email ?? '',
        address: c.address ?? '',
        identificationNumber: c.identificationNumber ?? '',
        notes: c.notes ?? '',
      });
    }
  }, [isEdit, existing.data, reset]);

  if (isEdit && existing.loading && !existing.data) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement du client..." className="flex-col" />
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
        await clientsApi.update(id, payload);
        navigate(`/clients/${id}`);
      } else {
        const created = await clientsApi.create(payload);
        navigate(`/clients/${created.id}`);
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
          title={isEdit ? 'Modifier le client' : 'Nouveau client'}
          description={
            isEdit
              ? 'Mettez à jour les informations du client.'
              : "Enregistrez une personne intéressée par un achat ou une location. Aucune catégorie n'est imposée : un même client pourra réaliser plusieurs types d'opérations."
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
            {isEdit ? 'Enregistrer les modifications' : 'Créer le client'}
          </Button>
        </div>
      </form>
    </div>
  );
}
