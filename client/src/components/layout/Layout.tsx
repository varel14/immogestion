import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, KeyRound, LayoutDashboard, LogOut, Menu, UserCog, Users, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.js';
import { initials } from '../../utils/format.js';
import { roleLabels, roleBadgeClass } from '../../utils/labels.js';
import { cn } from '../../utils/cn.js';
import { Badge } from '../ui/Badge.js';

const navigation = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/biens', label: 'Biens', icon: Building2 },
  { to: '/proprietaires', label: 'Propriétaires', icon: KeyRound },
  { to: '/clients', label: 'Clients', icon: Users },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/connexion');
  };

  const items = user?.role === 'ADMIN' ? [...navigation, { to: '/utilisateurs', label: 'Utilisateurs', icon: UserCog }] : navigation;

  return (
    <div className="flex h-full flex-col bg-slate-900">
      {/* Marque */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-base leading-tight font-bold text-white">ImmoGestion</p>
          <p className="text-xs text-slate-400">Gestion immobilière</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Navigation principale">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Utilisateur connecté */}
      {user && (
        <div className="border-t border-slate-800 p-3">
          <NavLink
            to="/profil"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-800"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-sm font-semibold text-blue-300">
              {initials(user)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {user.firstName} {user.lastName}
              </span>
              <Badge className={cn('mt-0.5', roleBadgeClass[user.role])}>{roleLabels[user.role]}</Badge>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}

/** Layout principal : barre latérale fixe + zone de contenu. */
export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Barre latérale bureau */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent />
      </aside>

      {/* Tiroir mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 w-64">
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 rounded-lg bg-white/10 p-2 text-white"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Barre supérieure mobile */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-900">ImmoGestion</span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
