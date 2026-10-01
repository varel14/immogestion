import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Building2, KeyRound, UserRound } from 'lucide-react';
import { useClientAuth } from '../../auth/ClientAuthContext.js';
import { cn } from '../../utils/cn.js';

/** Ramène la fenêtre en haut de page à chaque navigation. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function HeaderLink({ to, end, children }: { to: string; end?: boolean; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'rounded-[8px] px-3 py-2 text-sm font-medium transition-colors duration-150',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
          isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )
      }
    >
      {children}
    </NavLink>
  );
}

function PublicHeader() {
  const { client } = useClientAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="LocalBridge — accueil">
          <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-brand text-white">
            <Building2 className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold text-slate-900">LocalBridge</span>
            <span className="hidden text-xs text-slate-500 sm:block">Logements à louer</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Navigation du site">
          <HeaderLink to="/" end>
            <span className="hidden sm:inline">Logements</span>
            <span className="sm:hidden">Logements</span>
          </HeaderLink>
          <HeaderLink to="/mon-compte">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-4 w-4" strokeWidth={1.8} />
              {client ? (
                <span className="max-w-[10rem] truncate">
                  {client.firstName} {client.lastName.charAt(0)}.
                </span>
              ) : (
                'Mon compte'
              )}
            </span>
          </HeaderLink>
          <Link
            to="/connexion"
            className="hidden items-center gap-1.5 rounded-[8px] border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-150 hover:bg-slate-100 md:inline-flex"
          >
            <KeyRound className="h-4 w-4" strokeWidth={1.8} />
            Espace agence
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
        <p>
          <span className="font-display font-semibold text-slate-700">LocalBridge</span> — portail de location géré par l'agence.
        </p>
        <p className="flex items-center gap-4">
          <Link to="/" className="transition-colors hover:text-slate-800">Logements</Link>
          <Link to="/mon-compte" className="transition-colors hover:text-slate-800">Mon compte</Link>
          <Link to="/connexion" className="transition-colors hover:text-slate-800">Espace agence</Link>
        </p>
      </div>
    </footer>
  );
}

/** Gabarit du site public : en-tête, contenu, pied de page. */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ScrollToTop />
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
