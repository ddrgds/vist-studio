import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { loadCommunityFeed, CommunityShare } from '../services/supabaseService';

interface CommunityFeedProps {
  onNavigate: (workspace: string, mode?: string) => void;
}

const CommunityFeed: React.FC<CommunityFeedProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<CommunityShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

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

  // Don't render the section at all if empty and not loading
  if (!loading && items.length === 0) return null;

  return (
    <section className="px-4 sm:px-8 pt-10 pb-12 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between mb-6">
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#4A3A36' }} />
        </div>
      ) : (
        <>
          <div className="columns-2 md:columns-3 lg:columns-4 gap-2">
            {items.map((item) => (
              <CommunityCard key={item.id} item={item} />
            ))}
          </div>

          {hasMore && (
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
