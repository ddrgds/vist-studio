import React from 'react';
import {
  Sparkles,
  Play,
  Users,
  Zap,
  TrendingUp,
  Star,
  Camera,
  Repeat2,
  Sun,
  ScanFace,
  Box,
  Mountain,
  ArrowRight,
} from 'lucide-react';
import { useCharacterLibrary } from '../contexts/CharacterLibraryContext';
import { useGallery } from '../contexts/GalleryContext';
import type { AppPage } from './SidebarNav';

interface DashboardPageProps {
  onNavigate: (page: AppPage) => void;
}

const QUICK_TOOLS = [
  { icon: Camera, label: 'Pose Editor', tip: 'Change character poses', page: 'studio' as AppPage },
  { icon: ScanFace, label: 'Face Swap', tip: 'Swap faces between photos', page: 'studio' as AppPage },
  { icon: Sun, label: 'Relight', tip: 'AI relighting & ambient', page: 'studio' as AppPage },
  { icon: Camera, label: 'Camera', tip: 'Lens & angle controls', page: 'studio' as AppPage },
  { icon: Box, label: 'Objects', tip: 'Add accessories & props', page: 'studio' as AppPage },
  { icon: Mountain, label: 'Scenes', tip: 'Backgrounds & environments', page: 'studio' as AppPage },
];

const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const charLib = useCharacterLibrary();
  const gallery = useGallery();

  const characterCount = charLib.savedCharacters.length;
  const renderCount = gallery.generatedHistory.length;
  const recentCharacters = charLib.savedCharacters
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#0D0A0A' }}>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {/* Hero Section */}
        <section>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
            style={{ background: 'rgba(255,92,53,0.1)', color: '#FF5C35' }}
          >
            <Sparkles className="w-3 h-3" />
            AI-Powered Studio
          </div>
          <h1
            className="text-3xl font-black tracking-tight mb-3"
            style={{ color: '#F5EDE8', fontFamily: 'var(--font-display)' }}
          >
            Welcome to the Studio
          </h1>
          <p className="text-sm max-w-lg mb-6" style={{ color: '#6B5A56' }}>
            Create, edit and manage your virtual influencers with artificial intelligence.
            From unique characters to complete campaigns.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('create')}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #FF5C35, #FF8A65)', boxShadow: '0 4px 20px rgba(255,92,53,0.3)' }}
            >
              <Sparkles className="w-4 h-4" />
              New AI Character
              <span className="text-[10px] opacity-60">Generate with prompt</span>
            </button>
            <button
              onClick={() => onNavigate('studio')}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-95"
              style={{ background: 'rgba(255,92,53,0.08)', color: '#FF5C35', border: '1px solid rgba(255,92,53,0.2)' }}
            >
              <Play className="w-4 h-4" />
              Open Studio
              <span className="text-[10px] opacity-60">Edit your influencer</span>
            </button>
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, value: characterCount, label: 'Characters Created', color: '#FF5C35' },
            { icon: Zap, value: renderCount, label: 'Renders Generated', color: '#FFB347' },
            { icon: TrendingUp, value: '—', label: 'Avg Engagement', color: '#22D3EE' },
            { icon: Star, value: recentCharacters.filter(c => c.loraTrainingStatus === 'ready').length, label: 'Trained Models', color: '#FF8A65' },
          ].map(({ icon: Icon, value, label, color }, i) => (
            <div
              key={i}
              className="rounded-xl px-5 py-4"
              style={{ background: '#0F0C0C', border: '1px solid #1A1210' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="text-2xl font-black tracking-tight" style={{ color: '#F5EDE8' }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: '#6B5A56' }}>{label}</div>
            </div>
          ))}
        </section>

        {/* Recent Projects */}
        {recentCharacters.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold tracking-tight" style={{ color: '#F5EDE8', fontFamily: 'var(--font-display)' }}>
                Recent Projects
              </h2>
              <button
                onClick={() => onNavigate('gallery')}
                className="flex items-center gap-1 text-xs font-semibold transition-colors"
                style={{ color: '#FF5C35' }}
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentCharacters.map(char => (
                <div
                  key={char.id}
                  className="group rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
                  style={{ background: '#0F0C0C', border: '1px solid #1A1210' }}
                  onClick={() => onNavigate('studio')}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
                >
                  {/* Thumbnail */}
                  <div className="aspect-[4/3] bg-black/30 relative overflow-hidden">
                    {char.thumbnail ? (
                      <img src={char.thumbnail} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: '#161110' }}>
                        <Users className="w-8 h-8" style={{ color: '#2A1F1C' }} />
                      </div>
                    )}
                    {/* Status badge */}
                    <div
                      className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: char.loraTrainingStatus === 'ready' ? 'rgba(34,197,94,0.2)' : 'rgba(255,179,71,0.2)',
                        color: char.loraTrainingStatus === 'ready' ? '#22C55E' : '#FFB347',
                      }}
                    >
                      {char.loraTrainingStatus === 'ready' ? 'Trained' : 'Active'}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="px-4 py-3">
                    <div className="text-sm font-bold" style={{ color: '#F5EDE8' }}>{char.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#6B5A56' }}>
                      {char.characteristics?.slice(0, 40) || 'No description'}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-[10px]" style={{ color: '#4A3A36' }}>
                        Used {char.usageCount}× · {new Date(char.updatedAt).toLocaleDateString()}
                      </div>
                      <span
                        className="text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        style={{ color: '#FF5C35' }}
                      >
                        Edit <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Studio Tools */}
        <section>
          <h2 className="text-lg font-bold tracking-tight mb-4" style={{ color: '#F5EDE8', fontFamily: 'var(--font-display)' }}>
            Studio Tools
          </h2>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_TOOLS.map(({ icon: Icon, label, tip, page }, i) => (
              <button
                key={i}
                onClick={() => onNavigate(page)}
                className="group flex flex-col items-center gap-2 rounded-xl px-4 py-5 transition-all duration-200"
                style={{ background: '#0F0C0C', border: '1px solid #1A1210' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1A1210'; }}
                title={tip}
              >
                <Icon className="w-6 h-6 transition-colors" style={{ color: '#6B5A56' }} />
                <span className="text-[11px] font-semibold" style={{ color: '#B8A9A5' }}>{label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
