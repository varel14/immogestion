import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.js';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-800">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="mt-6">
        <Button>Retour au tableau de bord</Button>
      </Link>
    </div>
  );
}
