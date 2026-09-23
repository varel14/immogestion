import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, CalendarDays, ClipboardList, FileSignature, HandCoins, KeyRound, LayoutDashboard, Lock, LogOut, Menu, ReceiptText, UserCog, Users, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.js';
import { initials } from '../../utils/format.js';
import { roleLabels } from '../../utils/labels.js';
import { cn } from '../../utils/cn.js';
import { Badge } from '../ui/Badge.js';
import { Toaster } from '../ui/Toaster.js';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  section?: string;
}

const navigation: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/biens', label: 'Biens', icon: Building2 },
  { to: '/proprietaires', label: 'Propriétaires', icon: KeyRound },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/visites', label: 'Visites', icon: CalendarDays, section: 'Suivi commercial' },
  { to: '/visites/calendrier', label: 'Calendrier', icon: CalendarDays, section: 'Suivi commercial' },
  { to: '/demandes', label: 'Demandes', icon: ClipboardList, section: 'Suivi commercial' },
  { to: '/reservations', label: 'Réservations', icon: Lock, section: 'Suivi commercial' },
  { to: '/ventes', label: 'Ventes', icon: HandCoins, section: 'Transactions' },
  { to: '/contrats', label: 'Locations', icon: FileSignature, section: 'Transactions' },
  { to: '/paiements', label: 'Paiements', icon: ReceiptText, section: 'Transactions' },
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
    <div className="flex h-full flex-col bg-brand">
      {/* Marque */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-white/10 text-white">
          <Building2 className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <div>
          <p className="font-display text-lg leading-tight font-semibold text-white">ImmoGestion</p>
          <p className="text-xs text-slate-400">Gestion immobilière</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
        {items.map((item, index) => {
          const showSection = item.section && items[index - 1]?.section !== item.section;
          return (
            <div key={item.to}>
              {showSection && (
                <p className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:mt-0">
                  {item.section}
                </p>
              )}
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-slate-100 text-brand'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Utilisateur connecté */}
      {user && (
        <div className="border-t border-white/10 p-3">
          <NavLink
            to="/profil"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-[8px] px-2 py-2 transition-colors duration-150 hover:bg-white/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-slate-100">
              {initials(user)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {user.firstName} {user.lastName}
              </span>
              <span className="block text-xs text-slate-400">{roleLabels[user.role]}</span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-[8px] border border-white/25 px-3 py-2 text-[13.5px] font-semibold text-slate-200 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.8} />
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
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-brand text-white">
              <Building2 className="h-4 w-4" strokeWidth={1.8} />
            </div>
            <span className="font-display text-lg font-semibold text-slate-900">ImmoGestion</span>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
}
