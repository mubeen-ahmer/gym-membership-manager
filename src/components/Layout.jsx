import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnline } from '../contexts/OnlineContext';
import QRScanner from './QRScanner';
import {
  IconDashboard, IconUsers, IconCheckCircle, IconClipboard,
  IconWarning, IconDocument, IconDumbbell, IconSignOut, IconSync, IconCurrency, IconMenu, IconX,
} from './Icons';

const NAV_SECTIONS = [
  {
    label: 'Daily',
    items: [
      { to: '/attendance', icon: IconCheckCircle, label: 'Attendance' },
      { to: '/members',    icon: IconUsers,        label: 'Members' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/plans',    icon: IconClipboard, label: 'Plans' },
      { to: '/payments', icon: IconCurrency,  label: 'Payments' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/dashboard',  icon: IconDashboard, label: 'Analytics' },
      { to: '/violations', icon: IconWarning,   label: 'Violations' },
      { to: '/audit-log',  icon: IconDocument,  label: 'Audit Log' },
    ],
  },
];

const PAGE_TITLES = {
  '/attendance': 'Attendance Register',
  '/members':    'Members',
  '/dashboard':  'Analytics',
  '/plans':      'Membership Plans',
  '/payments':   'Payments',
  '/violations': 'Violations',
  '/audit-log':  'Audit Log',
};

function getInitials(email = '') {
  return email.slice(0, 2).toUpperCase();
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const { isOnline, isSyncing, pendingCount, sync } = useOnline();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const pageTitle = PAGE_TITLES[location.pathname] || 'Gym System';

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const NavItem = ({ item, mobile = false }) => (
    <NavLink
      to={item.to}
      onClick={() => mobile && setMobileOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
          isActive
            ? 'bg-indigo-600/25 text-indigo-300 border border-indigo-500/25'
            : 'text-slate-400 hover:bg-[#1f2235] hover:text-slate-200 border border-transparent'
        }`
      }
    >
      <item.icon className="w-[17px] h-[17px] shrink-0" />
      {item.label}
    </NavLink>
  );

  const SidebarContent = ({ mobile = false }) => (
    <>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-[#252840]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <IconDumbbell className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-bold text-white tracking-widest uppercase">Gym System</h1>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-3 px-2.5 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1 text-[10px] uppercase tracking-widest font-semibold text-slate-600">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} mobile={mobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#252840] space-y-2">
        {/* Online status */}
        <div className="flex items-center justify-between px-1 py-1">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-[11px] text-slate-500">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          {pendingCount > 0 && (
            <span className="bg-amber-500/20 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-semibold">
              {pendingCount} pending
            </span>
          )}
        </div>

        {/* Sync button */}
        {isOnline && pendingCount > 0 && (
          <button
            onClick={sync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 text-[11px] bg-indigo-600/15 text-indigo-400 py-1.5 rounded-lg hover:bg-indigo-600/25 disabled:opacity-50 transition-colors border border-indigo-500/20"
          >
            <IconSync className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}

        {/* User + sign out */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-7 h-7 rounded-full bg-indigo-700/60 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-indigo-200">{getInitials(user?.email)}</span>
          </div>
          <span className="text-[11px] text-slate-500 flex-1 truncate">{user?.email?.split('@')[0]}</span>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <IconSignOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[#0d0f18]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-[#151826] border-r border-[#252840] flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}
      {/* Mobile drawer */}
      <aside className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#151826] border-r border-[#252840] flex flex-col transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-3 right-3">
          <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-[#1f2235]">
            <IconX className="w-4 h-4" />
          </button>
        </div>
        <SidebarContent mobile />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-[#0d0f18]/90 backdrop-blur border-b border-[#252840] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-[#1f2235]"
          >
            <IconMenu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">{pageTitle}</h2>
          </div>
          {/* Online dot on desktop */}
          <div className="hidden md:flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-[11px] text-slate-500">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <QRScanner />
    </div>
  );
}

