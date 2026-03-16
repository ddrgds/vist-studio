import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';

interface NavItem {
  icon: string;
  title: string;
  subtitle: string;
  path: string;
  isPlaceholder?: boolean;
}

const CREATE_ITEMS: NavItem[] = [
  { icon: '⊕', title: 'Subir Personaje',   subtitle: 'Crear / Importar',          path: '/studio?tool=create' },
  { icon: '◎', title: 'Sesión de Fotos',    subtitle: 'Photo Shoot',               path: '/studio?tool=session' },
  { icon: '✦', title: 'Editor IA',          subtitle: 'Relight · 360 · Swap',      path: '/studio' },
  { icon: '✧', title: 'Universo',           subtitle: 'World Building',            path: '/studio', isPlaceholder: true },
];

const MANAGE_ITEMS: NavItem[] = [
  { icon: '▦', title: 'Galería',            subtitle: 'Creaciones',                path: '/gallery' },
  { icon: '◈', title: 'Personajes',         subtitle: 'Colección',                 path: '/gallery?tab=characters' },
  { icon: '▣', title: 'Contenido',          subtitle: 'Calendario',                path: '#', isPlaceholder: true },
  { icon: '◇', title: 'Analytics',          subtitle: 'Métricas',                  path: '#', isPlaceholder: true },
];

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();
  const sub = useSubscription();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const planLabel = sub.plan ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1) : 'Starter';
  const initial = (profile?.displayName || user?.email || 'U').charAt(0).toUpperCase();

  const currentPath = location.pathname + location.search;

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    // For paths with query params, match exactly
    if (path.includes('?')) return currentPath === path;
    // For plain paths, match pathname exactly (but not if current has specific tool query)
    return location.pathname === path && !location.search;
  };

  const handleNav = (path: string) => {
    if (path === '#') return;
    navigate(path);
  };

  const renderNavButton = (item: NavItem) => {
    const active = isActive(item.path);
    const disabled = item.isPlaceholder;
    return (
      <button
        key={item.title}
        onClick={() => !disabled && handleNav(item.path)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-all duration-150 ${
          disabled
            ? 'opacity-40 cursor-default'
            : active
              ? 'bg-[rgba(240,104,72,0.1)] text-[var(--text-1)]'
              : 'text-[var(--text-2)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-1)]'
        } ${collapsed ? 'justify-center px-0' : ''}`}
        title={collapsed ? item.title : disabled ? 'Pr\u00f3ximamente' : undefined}
      >
        <span className="text-lg w-6 text-center shrink-0">{item.icon}</span>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold flex items-center gap-2">
              {item.title}
              {disabled && <span className="font-jet text-[8px] text-[var(--text-3)] uppercase tracking-wider">soon</span>}
            </div>
            <div className="text-[10px] text-[var(--text-3)]">{item.subtitle}</div>
          </div>
        )}
      </button>
    );
  };

  const renderSectionLabel = (label: string) => {
    if (collapsed) return <div className="my-2 mx-3 border-t border-[var(--border)]" />;
    return (
      <div className="font-jet text-[10px] uppercase tracking-[0.2em] text-[var(--text-3)] px-4 mt-4 mb-2">
        {label}
      </div>
    );
  };

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen bg-[var(--bg-1)] border-r border-[var(--border)] select-none transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-[240px]'
      }`}
    >
      {/* ── Logo ── */}
      <div className={`px-5 pt-5 pb-4 ${collapsed ? 'flex justify-center px-2' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[var(--accent)] to-[#E8396B] flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">V</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-[0.04em] text-[var(--text-1)]">
                VIST
              </span>
              <span className="font-jet text-[8px] text-[var(--text-3)] tracking-[0.2em] uppercase">
                ai studio
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto flex flex-col px-3">
        {/* Dashboard */}
        <div className="mb-2">
          {renderNavButton({ icon: '⬡', title: 'Dashboard', subtitle: 'Overview', path: '/' })}
        </div>

        {/* CREAR section */}
        {renderSectionLabel('Crear')}
        {CREATE_ITEMS.map(renderNavButton)}

        {/* GESTIONAR section */}
        {renderSectionLabel('Gestionar')}
        {MANAGE_ITEMS.map(renderNavButton)}
      </nav>

      {/* ── Collapse Button ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center gap-2 px-4 py-2.5 text-[var(--text-3)] text-xs hover:text-[var(--text-2)] transition-colors w-full"
      >
        <span className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
          ‹
        </span>
        {!collapsed && <span>Colapsar</span>}
      </button>

      {/* ── User Footer ── */}
      <div className={`border-t border-[var(--border)] px-4 py-3 flex items-center gap-3 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#C040C0] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs">{initial}</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[var(--text-1)] truncate">
              {profile?.displayName || 'Creator'}
            </div>
            <div className="text-[10px] text-[var(--accent)] font-jet">
              {planLabel}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
