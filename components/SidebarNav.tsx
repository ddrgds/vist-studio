import React from 'react';
import {
  LayoutDashboard,
  Sparkles,
  Camera,
  PenTool,
  Images,
  CreditCard,
  Settings,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';

export type AppPage = 'dashboard' | 'create' | 'session' | 'studio' | 'gallery' | 'pricing' | 'profile';

interface SidebarNavProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const NAV_ITEMS: { page: AppPage; icon: React.ElementType; label: string; tip: string }[] = [
  { page: 'dashboard', icon: LayoutDashboard, label: 'Dashboard', tip: 'Home & overview' },
  { page: 'create', icon: Sparkles, label: 'Create Character', tip: 'Character builder wizard' },
  { page: 'studio', icon: PenTool, label: 'Studio Editor', tip: 'Pose, relight, camera & more' },
  { page: 'session', icon: Camera, label: 'Photo Session', tip: 'Multi-angle photo shoots' },
  { page: 'gallery', icon: Images, label: 'Gallery', tip: 'Characters & generated images' },
];

const SidebarNav: React.FC<SidebarNavProps> = ({ activePage, onNavigate }) => {
  const { profile } = useProfile();
  const sub = useSubscription();
  const { user, signOut } = useAuth();

  const displayCredits = sub.isUnlimited
    ? '∞'
    : sub.profileLoaded
      ? sub.credits.toLocaleString('en-US')
      : '…';

  const planLabel = sub.plan
    ? sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)
    : 'Starter';

  return (
    <aside
      className="hidden lg:flex flex-col h-screen shrink-0 select-none"
      style={{
        width: 240,
        background: '#0D0A0A',
        borderRight: '1px solid #1A1210',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: '1px solid #1A1210' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #FF5C35, #FF8A65)' }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-extrabold tracking-tight" style={{ color: '#F5EDE8', fontFamily: 'var(--font-display)' }}>
            VIST
          </span>
          <span className="text-sm font-light ml-1" style={{ color: '#6B5A56' }}>
            Studio
          </span>
        </div>
        <ChevronRight className="w-3.5 h-3.5 ml-auto" style={{ color: '#4A3A36' }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ page, icon: Icon, label, tip }) => {
          const isActive = activePage === page;
          return (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={{
                background: isActive ? 'rgba(255,92,53,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #FF5C35' : '3px solid transparent',
                color: isActive ? '#F5EDE8' : '#6B5A56',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLElement).style.color = '#B8A9A5';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#6B5A56';
                }
              }}
              title={tip}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" style={{ color: isActive ? '#FF5C35' : undefined }} />
              <span className="text-[13px] font-semibold tracking-wide">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Plan badge */}
      <div className="mx-3 mb-3">
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: '#0F0C0C', border: '1px solid #1A1210' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-3.5 h-3.5" style={{ color: '#FF5C35' }} />
            <span className="text-xs font-bold" style={{ color: '#FF5C35' }}>
              {planLabel} Plan
            </span>
          </div>
          <div className="text-[11px] mb-2.5" style={{ color: '#6B5A56' }}>
            <span style={{ color: '#FFB347' }}>⚡</span> {displayCredits} credits remaining
          </div>
          <button
            onClick={() => onNavigate('pricing')}
            className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: 'linear-gradient(135deg, #FF5C35, #FF8A65)' }}
          >
            Upgrade
          </button>
        </div>
      </div>

      {/* Profile footer */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderTop: '1px solid #1A1210' }}
      >
        {/* Avatar */}
        <button
          onClick={() => onNavigate('profile')}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{
            background: '#1E1614',
            border: activePage === 'profile' ? '1.5px solid #FF5C35' : '1px solid #2A1F1C',
          }}
        >
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold" style={{ color: '#FF5C35' }}>
              {(profile?.displayName || user?.email || 'U')
                .split(/[\s@]/).filter(Boolean).map(s => s[0].toUpperCase()).slice(0, 2).join('')}
            </span>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate" style={{ color: '#F5EDE8' }}>
            {profile?.displayName || 'Creator'}
          </div>
          <div className="text-[10px]" style={{ color: '#4A3A36' }}>
            {planLabel} Member
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onNavigate('profile')}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#4A3A36' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#B8A9A5'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#4A3A36'; }}
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
