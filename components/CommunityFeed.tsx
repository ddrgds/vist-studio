import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowRight, Loader2, Users, Trophy } from 'lucide-react';
import { loadCommunityFeed, CommunityShare } from '../services/supabaseService';

interface CommunityFeedProps {
  onNavigate: (workspace: string, mode?: string) => void;
}

type SortMode = 'recent' | 'popular';

const STYLE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'editorial', label: 'Editorial' },
  { id: 'street', label: 'Street' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'nightlife', label: 'Nightlife' },
] as const;

type StyleFilter = (typeof STYLE_FILTERS)[number]['id'];

// Keywords per style for client-side classification from captions/display_name
const STYLE_KEYWORDS: Record<Exclude<StyleFilter, 'all'>, string[]> = {
  editorial: ['editorial', 'magazine', 'fashion', 'vogue', 'studio', 'campaign', 'haute', 'couture', 'high fashion'],
  street: ['street', 'urban', 'city', 'neon', 'graffiti', 'tokyo', 'nyc', 'cyberpunk', 'gritty'],
  fantasy: ['fantasy', 'dragon', 'magic', 'enchanted', 'mystical', 'fairy', 'elf', 'medieval', 'warrior', 'cinematic'],
  lifestyle: ['lifestyle', 'cafe', 'coffee', 'park', 'home', 'casual', 'everyday', 'cozy', 'morning', 'beach', 'tropical'],
  portrait: ['portrait', 'close-up', 'headshot', 'face', 'bokeh', '85mm', 'eyes', 'beauty'],
  fitness: ['fitness', 'gym', 'athletic', 'workout', 'muscle', 'sport', 'running', 'yoga'],
  nightlife: ['night', 'neon', 'club', 'bar', 'party', 'cocktail', 'glamour', 'evening', 'rooftop'],
};

function classifyItem(item: CommunityShare): StyleFilter[] {
  const text = `${item.caption} ${item.display_name}`.toLowerCase();
  const matches: StyleFilter[] = [];
  for (const [style, keywords] of Object.entries(STYLE_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      matches.push(style as StyleFilter);
    }
  }
  return matches;
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<CommunityShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('all');

  const PAGE_SIZE = 20;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadCommunityFeed(PAGE_SIZE, 0);
        if (!cancelled) {
          setItems(data);
          setHasMore(data.length >= PAGE_SIZE);
        }
      } catch {
        // Silent — community feed is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await loadCommunityFeed(PAGE_SIZE, items.length);
      setItems(prev => [...prev, ...data]);
      setHasMore(data.length >= PAGE_SIZE);
    } catch { /* silent */ }
    setLoadingMore(false);
  }, [items.length, loadingMore, hasMore]);

  // Filter + sort items
  const displayItems = useMemo(() => {
    let filtered = items;
    if (styleFilter !== 'all') {
      filtered = items.filter(item => classifyItem(item).includes(styleFilter));
    }
    if (sortMode === 'popular') {
      // Trending: prefer items shared more recently with shorter display names (proxy for engagement)
      // and spread by user to surface variety
      return [...filtered].sort((a, b) => {
        const aAge = (Date.now() - new Date(a.shared_at).getTime()) / 3_600_000; // hours
        const bAge = (Date.now() - new Date(b.shared_at).getTime()) / 3_600_000;
        // Wilson-style score: newer items with captions score higher
        const aScore = (a.caption.length > 0 ? 2 : 1) / (1 + aAge * 0.1);
        const bScore = (b.caption.length > 0 ? 2 : 1) / (1 + bAge * 0.1);
        return bScore - aScore;
      });
    }
    return filtered;
  }, [items, sortMode, styleFilter]);

  return (
    <section className="px-4 sm:px-8 pt-10 pb-12 max-w-[1400px] mx-auto">
      {/* Contest / Featured banner */}
      <div
        className="mb-6 rounded-2xl px-5 py-4 flex items-center gap-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(255,92,53,0.08) 0%, rgba(255,179,71,0.06) 100%)',
          border: '1px solid rgba(255,92,53,0.15)',
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,92,53,0.12)' }}
        >
          <Trophy className="w-5 h-5" style={{ color: '#FF5C35' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold font-display" style={{ color: '#F5EDE8' }}>
            Weekly Showcase
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: '#8C7570' }}>
            Share your best creation and get featured. Top picks are highlighted every week.
          </p>
        </div>
        <button
          onClick={() => onNavigate('director', 'create')}
          className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all hover:scale-[1.02] active:scale-95"
          style={{ background: 'linear-gradient(135deg,#FF5C35,#FFB347)', color: '#fff' }}
        >
          Enter
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div className="flex items-end gap-4">
          <div>
            <h2
              className="text-[11px] font-black tracking-widest uppercase font-display"
              style={{ color: '#FF5C35' }}
            >
              Community
            </h2>
            <p className="text-xs mt-1" style={{ color: '#6B5A56' }}>
              See what others are creating
            </p>
          </div>
          {/* Sort tabs */}
          <div className="flex gap-1 mb-0.5">
            {([['recent', 'Recent'], ['popular', 'Trending']] as const).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className="text-[10px] px-2.5 py-1 rounded-full transition-all font-jet"
                style={sortMode === mode
                  ? { background: '#FF5C35', color: '#fff' }
                  : { background: 'transparent', color: '#6B5A56', border: '1px solid #2A1F1C' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => onNavigate('generate', 'create')}
          className="flex items-center gap-1 text-xs transition-colors rounded-full px-3 py-1.5"
          style={{ color: '#6B5A56', border: '1px solid #2A1F1C' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = '#FF5C35';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.4)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = '#6B5A56';
            (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C';
          }}
        >
          Create yours
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Style filter chips */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 custom-scrollbar">
        {STYLE_FILTERS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setStyleFilter(id)}
            className="text-[10px] px-3 py-1.5 rounded-full transition-all font-jet whitespace-nowrap"
            style={styleFilter === id
              ? { background: 'rgba(255,92,53,0.15)', border: '1px solid #FF5C35', color: '#FFB347' }
              : { background: 'transparent', color: '#6B5A56', border: '1px solid #2A1F1C' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        /* Skeleton grid instead of spinner */
        <div className="columns-2 md:columns-3 lg:columns-4 gap-2">
          {[200, 260, 180, 240, 220, 190, 250, 170].map((h, i) => (
            <div key={i} className="mb-2 rounded-xl skeleton-shimmer" style={{ height: h }} />
          ))}
        </div>
      ) : displayItems.length === 0 && items.length === 0 ? (
        /* Empty state — no community shares yet */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,92,53,0.06)' }}>
            <Users className="w-6 h-6" style={{ color: '#FF5C35', opacity: 0.4 }} />
          </div>
          <h3 className="text-sm font-bold font-display mb-1" style={{ color: '#F5EDE8' }}>
            Community gallery
          </h3>
          <p className="text-xs mb-5 max-w-xs" style={{ color: '#4A3A36' }}>
            Be the first to share your creations with the community. Open any image and tap "Share".
          </p>
          <button
            onClick={() => onNavigate('generate', 'create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.97]"
            style={{ background: 'rgba(255,92,53,0.1)', border: '1px solid rgba(255,92,53,0.2)', color: '#FF5C35' }}
          >
            Start creating
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : displayItems.length === 0 ? (
        /* Filter matches nothing */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm font-display mb-1" style={{ color: '#B8A9A5' }}>No results for this style</p>
          <p className="text-xs mb-4" style={{ color: '#4A3A36' }}>Try a different filter or share your own creation.</p>
          <button
            onClick={() => setStyleFilter('all')}
            className="text-[11px] px-4 py-2 rounded-full font-jet transition-all"
            style={{ color: '#FF5C35', border: '1px solid rgba(255,92,53,0.25)' }}
          >
            Show all
          </button>
        </div>
      ) : (
        <>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-2">
            {displayItems.map((item) => (
              <CommunityCard key={item.id} item={item} />
            ))}
          </div>

          {hasMore && styleFilter === 'all' && (
            <div className="flex justify-center mt-8">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 text-xs font-semibold transition-colors rounded-full px-5 py-2"
                style={{ color: '#6B5A56', border: '1px solid #2A1F1C' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.color = '#FF5C35';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,92,53,0.4)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.color = '#6B5A56';
                  (e.currentTarget as HTMLElement).style.borderColor = '#2A1F1C';
                }}
              >
                {loadingMore ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

// ─── Community Card ─────────────────────────────────────────────────────────

const CommunityCard: React.FC<{ item: CommunityShare }> = ({ item }) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) return null;

  const timeAgo = getTimeAgo(item.shared_at);

  return (
    <div className="block w-full mb-2 break-inside-avoid overflow-hidden rounded-xl group relative">
      <img
        src={item.image_url}
        alt=""
        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        loading="lazy"
        onError={() => setImgError(true)}
      />
      {/* Hover overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)' }}
      >
        <div className="flex items-center gap-2 w-full">
          {item.avatar_url ? (
            <img src={item.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold"
              style={{ background: 'rgba(255,92,53,0.2)', color: '#FF5C35' }}
            >
              {item.display_name[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-[11px] font-medium text-white truncate">{item.display_name}</span>
          <span className="text-[9px] font-jet ml-auto flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Time ago helper ─────────────────────────────────────────────────────────

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export default CommunityFeed;
