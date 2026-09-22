import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, Pencil, Phone, ShieldCheck } from 'lucide-react';
import { usersApi } from '../../api/users.js';
import { useAsync } from '../../hooks/useAsync.js';
import { PageHeader } from '../../components/ui/PageHeader.js';
import { Button } from '../../components/ui/Button.js';
import { Card } from '../../components/ui/Card.js';
import { Spinner } from '../../components/ui/Spinner.js';
import { ErrorState } from '../../components/ui/ErrorState.js';
import { Badge } from '../../components/ui/Badge.js';
import { formatDateTime, fullName, initials } from '../../utils/format.js';
import { roleBadgeClass, roleLabels } from '../../utils/labels.js';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user, loading, error, reload } = useAsync((signal) => usersApi.getById(id!), [id]);

  if (loading && !user) {
    return (
      <div className="py-20">
        <Spinner size="lg" label="Chargement de l'utilisateur..." className="flex-col" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/utilisateurs')}>
          Retour à la liste
        </Button>
        <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <ErrorState message={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <Button variant="ghost" size="sm" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/utilisateurs')}>
        Retour à la liste
      </Button>

      <div className="mt-3">
        <PageHeader
          title={fullName(user)}
          description={`Compte créé le ${formatDateTime(user.createdAt)}`}
          actions={
            <button
              type="button"
              onClick={() => navigate(`/utilisateurs/${user.id}/modifier`)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-600">
              {initials(user)}
            </span>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{fullName(user)}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={roleBadgeClass[user.role]}>{roleLabels[user.role]}</Badge>
                {user.isActive ? (
                  <Badge className="bg-emerald-100 text-emerald-700 ring-emerald-600/20">Actif</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700 ring-red-600/20">Désactivé</Badge>
                )}
              </div>
            </div>
          </div>
          <dl className="space-y-3 px-5 py-4 text-sm">
            <div className="flex items-start gap-2.5">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Email de connexion</dt>
                <dd className="break-all text-slate-700">{user.email}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <dt className="text-xs text-slate-400">Téléphone</dt>
                <dd className="text-slate-700">{user.phone ?? 'Non renseigné'}</dd>
              </div>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-800">Accès à l'application</h2>
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <p className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                {user.isActive
                  ? 'Ce compte est actif : la personne peut se connecter à l\'application.'
                  : 'Ce compte est désactivé : la personne ne peut plus se connecter. Réactivez-le depuis la liste ou le formulaire.'}
              </span>
            </p>
            <p className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Le rôle détermine les droits : seul un <strong>Administrateur</strong> peut gérer les comptes
              utilisateurs. Les rôles et le statut se modifient via le bouton « Modifier ».
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
