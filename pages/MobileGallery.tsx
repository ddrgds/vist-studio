/**
 * MobileGallery — Native-feel archive of every generated photo, edit, and reel.
 *
 *   Roster: date-grouped 3-col grid (Hoy / Ayer / Esta semana / [mes año]).
 *   Filters: type pills + per-character chips + workflow status row.
 *   Multi-select: long-press to enter, bulk fav / delete with confirm.
 *   Lightbox: swipe-down to close, sticky action sheet with edit / share /
 *             cycle status / assign character / delete.
 *
 * Mood: Atelier (cream + terracotta + clay) — same family as Personajes.
 * "Editar" hands off via `pipelineStore.setHeroShot(url)` → MobileEditor reads
 * `heroShotUrl` on mount and auto-loads it as the base for editing.
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Star, Edit2, Share2, Trash2, X, Check, Image as ImageIcon, Film, Sparkles,
  Tag,
} from 'lucide-react';
import type { Page } from '../App';
import { useGalleryStore, type GalleryItem } from '../stores/galleryStore';
import { useCharacterStore, type SavedCharacter } from '../stores/characterStore';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { usePipelineStore } from '../stores/pipelineStore';
import {
  hapticLight, hapticMedium, hapticSuccess, hapticError, sharePhoto,
} from '../services/nativeService';
import { AppTopBar, AppEmptyState, type AppMood } from '../components/apps/_shared';

const ATELIER_MOOD: AppMood = {
  bg0: '#F5EBDB',
  bgCard: '#FFFCF5',
  paper: '#F8EFDD',
  ink0: '#1F1A14',
  ink1: '#3D332A',
  ink2: '#6F5E4C',
  ink3: '#A8957D',
  line: 'rgba(31, 26, 20, 0.10)',
  accent: '#C9785C',
  accentDeep: '#8E5640',
  gold: '#D4A85F',
};

interface Props {
  onNav: (p: Page) => void;
}

type TypeFilter = 'all' | 'create' | 'edit' | 'session' | 'video';

const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
  { id: 'all',     label: 'Todas' },
  { id: 'create',  label: 'Creaciones' },
  { id: 'edit',    label: 'Ediciones' },
  { id: 'session', label: 'Sesiones' },
  { id: 'video',   label: 'Reels' },
];

const STATUSES = [
  { id: 'borrador',   label: 'Borrador',  color: '#A8957D' },
  { id: 'editado',    label: 'Editado',   color: '#D4A85F' },
  { id: 'aprobado',   label: 'Aprobado',  color: '#7DA66B' },
  { id: 'publicado',  label: 'Publicado', color: '#C9785C' },
] as const;
type StatusId = typeof STATUSES[number]['id'];

// ─── Date grouping ──────────────────────────────────────────

const MONTH_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function groupByDate(items: GalleryItem[]): { label: string; items: GalleryItem[] }[] {
  if (items.length === 0) return [];
  const sorted = [...items].sort((a, b) => b.timestamp - a.timestamp);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;
  const currentYear = now.getFullYear();

  const groups = new Map<string, GalleryItem[]>();
  const order: string[] = [];

  for (const it of sorted) {
    let key: string;
    if (it.timestamp >= today) key = 'Hoy';
    else if (it.timestamp >= yesterday) key = 'Ayer';
    else if (it.timestamp >= weekAgo) key = 'Esta semana';
    else {
      const d = new Date(it.timestamp);
      const m = MONTH_ES[d.getMonth()];
      key = d.getFullYear() === currentYear ? capitalize(m) : `${capitalize(m)} ${d.getFullYear()}`;
    }
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push(it);
  }
  return order.map(label => ({ label, items: groups.get(label)! }));
}

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── Component ──────────────────────────────────────────────

export default function MobileGallery({ onNav }: Props) {
  const items = useGalleryStore(s => s.items);
  const removeItems = useGalleryStore(s => s.removeItems);
  const toggleFavorite = useGalleryStore(s => s.toggleFavorite);
  const updateItem = useGalleryStore(s => s.updateItem);
  const characters = useCharacterStore(s => s.characters);
  const { profile } = useProfile();
  const toast = useToast();
  const setHeroShot = usePipelineStore(s => s.setHeroShot);

  const credits = profile?.creditsRemaining ?? 0;

  // Hide character sheets from gallery — they are roster artifacts, not content.
  const visible = useMemo(() => items.filter(i => !i.tags?.includes('sheet')), [items]);

  // ─── Filters ──────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [charFilter, setCharFilter] = useState<string | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusId | null>(null);

  // ─── Multi-select ────────────────────────────────
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ─── Lightbox / modals ───────────────────────────
  const [lightboxItem, setLightboxItem] = useState<GalleryItem | null>(null);
  const [showAssignChar, setShowAssignChar] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // ─── Long-press detection ────────────────────────
  const pressTimerRef = useRef<number | null>(null);
  const pressedIdRef = useRef<string | null>(null);

  // ─── Pipeline ────────────────────────────────────
  const filtered = useMemo(() => {
    let out = visible;
    if (typeFilter !== 'all') out = out.filter(i => i.type === typeFilter);
    if (charFilter !== 'all') out = out.filter(i => i.characterId === charFilter);
    if (statusFilter) out = out.filter(i => i.workflowStatus === statusFilter);
    return out;
  }, [visible, typeFilter, charFilter, statusFilter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  // ─── Long-press handlers ─────────────────────────
  const startPress = (id: string) => {
    cancelPress();
    pressedIdRef.current = id;
    pressTimerRef.current = window.setTimeout(() => {
      if (pressedIdRef.current !== id) return;
      hapticMedium();
      setSelectMode(true);
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }, 380);
  };
  const cancelPress = () => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    pressedIdRef.current = null;
  };

  // ─── Tile tap ────────────────────────────────────
  const onTileTap = (item: GalleryItem) => {
    if (selectMode) {
      hapticLight();
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
      return;
    }
    hapticLight();
    setLightboxItem(item);
  };

  // ─── Bulk actions ────────────────────────────────
  const clearSelection = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };
  const performBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    removeItems(ids);
    hapticSuccess();
    toast.success(`${ids.length} ${ids.length === 1 ? 'foto eliminada' : 'fotos eliminadas'}`);
    clearSelection();
    setShowConfirmDelete(false);
  };

  // ─── Single-item actions ─────────────────────────
  const editItem = (item: GalleryItem) => {
    setLightboxItem(null);
    setHeroShot(item.url);
    hapticMedium();
    onNav('editor');
  };
  const shareItem = async (item: GalleryItem) => {
    hapticLight();
    try {
      const ok = await sharePhoto({
        url: item.url,
        filename: `vist-${item.id.slice(0, 8)}.jpg`,
        title: 'Compartir',
        text: 'Hecho con VIST',
      });
      if (!ok) {
        // Fall back to <a download>
        const a = document.createElement('a');
        a.href = item.url;
        a.download = `vist-${item.id.slice(0, 8)}.jpg`;
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
      }
    } catch {
      toast.error('No se pudo compartir');
    }
  };
  const cycleStatusForItem = (item: GalleryItem) => {
    const cur = item.workflowStatus ?? 'borrador';
    const idx = STATUSES.findIndex(s => s.id === cur);
    const next = STATUSES[(idx + 1) % STATUSES.length].id;
    updateItem(item.id, { workflowStatus: next });
    hapticLight();
    setLightboxItem(prev => prev ? { ...prev, workflowStatus: next } : prev);
    toast.success(`Estado: ${STATUSES.find(s => s.id === next)?.label}`);
  };
  const assignCharacter = (item: GalleryItem, characterId: string | null) => {
    updateItem(item.id, { characterId: characterId ?? undefined });
    setLightboxItem(prev => prev ? { ...prev, characterId: characterId ?? undefined } : prev);
    setShowAssignChar(false);
    hapticSuccess();
    if (characterId) {
      const c = characters.find(c => c.id === characterId);
      toast.success(`Asignada a ${c?.name ?? 'personaje'}`);
    } else {
      toast.success('Personaje removido');
    }
  };

  // ─── EMPTY GLOBAL STATE ──────────────────────────
  if (visible.length === 0) {
    return (
      <div className="mg-shell">
        <style>{MG_STYLES}</style>
        <AppTopBar
          mood={ATELIER_MOOD}
          title="Galería · Atelier"
          credits={credits}
          onBack={() => onNav('home' as Page)}
        />
        <AppEmptyState
          mood={ATELIER_MOOD}
          icon={<ImageIcon size={28} />}
          title={<>Tu galería está <em>vacía</em></>}
          sub="Genera tu primera foto en Headshot Pro o en Sesión de Fotos. Todo lo que crees se archiva aquí."
          ctas={[
            { label: 'Probar Headshot', icon: <Sparkles size={14} />, onClick: () => onNav('headshot'), variant: 'primary' },
            { label: 'Sesión de fotos', onClick: () => onNav('sesion'), variant: 'ghost' },
          ]}
        />
      </div>
    );
  }

  // ─── Character chips: only chars that have items assigned ─
  const usedCharIds = new Set<string>();
  visible.forEach(i => { if (i.characterId) usedCharIds.add(i.characterId); });
  const activeCharacters = characters.filter(c => usedCharIds.has(c.id));

  return (
    <div className="mg-shell">
      <style>{MG_STYLES}</style>

      {/* Top bar — swaps to selection bar when in select mode */}
      {selectMode ? (
        <div className="mg-select-bar">
          <button className="mg-select-cancel" onClick={() => { hapticLight(); clearSelection(); }} aria-label="Cancelar">
            <X size={18} />
          </button>
          <span className="mg-select-count">
            {selectedIds.size} {selectedIds.size === 1 ? 'seleccionada' : 'seleccionadas'}
          </span>
          <div className="mg-select-actions">
            <button
              className="mg-select-btn"
              disabled={selectedIds.size === 0}
              onClick={() => {
                hapticLight();
                selectedIds.forEach(id => toggleFavorite(id));
                toast.success(`${selectedIds.size} actualizadas`);
                clearSelection();
              }}
              aria-label="Marcar favoritas"
            >
              <Star size={16} />
            </button>
            <button
              className="mg-select-btn mg-danger"
              disabled={selectedIds.size === 0}
              onClick={() => { hapticError(); setShowConfirmDelete(true); }}
              aria-label="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <AppTopBar
          mood={ATELIER_MOOD}
          title="Galería · Atelier"
          credits={credits}
          onBack={() => onNav('home' as Page)}
        />
      )}

      {/* Hero */}
      {!selectMode && (
        <section className="mg-hero">
          <div className="mg-hero-eyebrow">
            {filtered.length} {filtered.length === 1 ? 'foto' : 'fotos'}
            {statusFilter ? ` · ${STATUSES.find(s => s.id === statusFilter)?.label}` : ''}
            {charFilter !== 'all' ? ` · ${characters.find(c => c.id === charFilter)?.name}` : ''}
          </div>
          <h1 className="mg-hero-title">Tu <em>archivo</em> visual.</h1>
        </section>
      )}

      {/* Type filter pills */}
      <div className="mg-filters">
        {TYPE_FILTERS.map(f => {
          const count = f.id === 'all'
            ? visible.length
            : visible.filter(i => i.type === f.id).length;
          if (f.id !== 'all' && count === 0) return null;
          return (
            <button
              key={f.id}
              className={`mg-filter ${typeFilter === f.id ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setTypeFilter(f.id); }}
            >
              {f.label}
              {count > 0 && f.id !== 'all' && <span className="mg-filter-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Character filter row — only if 2+ characters have content */}
      {activeCharacters.length > 1 && (
        <div className="mg-chars">
          <button
            className={`mg-char-chip ${charFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => { hapticLight(); setCharFilter('all'); }}
          >
            <span className="mg-char-all-dot" />
            <span>Todos</span>
          </button>
          {activeCharacters.map(c => (
            <button
              key={c.id}
              className={`mg-char-chip ${charFilter === c.id ? 'is-active' : ''}`}
              onClick={() => { hapticLight(); setCharFilter(c.id); }}
            >
              <span
                className="mg-char-avatar"
                style={c.thumbnail ? { backgroundImage: `url(${c.thumbnail})` } : undefined}
              />
              <span className="mg-char-name">{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Status filter row — only if any item has a status */}
      {visible.some(i => i.workflowStatus) && (
        <div className="mg-statuses">
          <button
            className={`mg-status-chip ${!statusFilter ? 'is-active' : ''}`}
            onClick={() => { hapticLight(); setStatusFilter(null); }}
          >
            Todos
          </button>
          {STATUSES.map(s => {
            const c = visible.filter(i => i.workflowStatus === s.id).length;
            if (c === 0) return null;
            return (
              <button
                key={s.id}
                className={`mg-status-chip ${statusFilter === s.id ? 'is-active' : ''}`}
                onClick={() => { hapticLight(); setStatusFilter(s.id); }}
                style={{ '--status-color': s.color } as React.CSSProperties}
              >
                <span className="mg-status-dot" />
                <span>{s.label}</span>
                <span className="mg-status-count">{c}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Date-grouped grid */}
      <section className="mg-content">
        {groups.length === 0 ? (
          <div className="mg-empty-filter">
            <p>Sin resultados con este filtro.</p>
            <button
              className="mg-empty-clear"
              onClick={() => { hapticLight(); setTypeFilter('all'); setCharFilter('all'); setStatusFilter(null); }}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          groups.map(g => (
            <div key={g.label} className="mg-group">
              <div className="mg-group-label">
                <span>{g.label}</span>
                <span className="mg-group-count">{g.items.length}</span>
              </div>
              <div className="mg-grid">
                {g.items.map(it => {
                  const isSelected = selectedIds.has(it.id);
                  const status = it.workflowStatus;
                  const statusColor = STATUSES.find(s => s.id === status)?.color;
                  return (
                    <button
                      key={it.id}
                      className={`mg-tile ${isSelected ? 'is-selected' : ''}`}
                      onTouchStart={() => startPress(it.id)}
                      onTouchEnd={cancelPress}
                      onTouchCancel={cancelPress}
                      onTouchMove={cancelPress}
                      onMouseDown={() => startPress(it.id)}
                      onMouseUp={cancelPress}
                      onMouseLeave={cancelPress}
                      onClick={() => onTileTap(it)}
                    >
                      <img src={it.url} alt={it.prompt || ''} loading="lazy" draggable={false} />
                      {it.type === 'video' && (
                        <span className="mg-tile-badge mg-tile-video">
                          <Film size={11} />
                        </span>
                      )}
                      {it.favorite && (
                        <span className="mg-tile-fav">
                          <Star size={11} fill="currentColor" />
                        </span>
                      )}
                      {status && statusColor && (
                        <span className="mg-tile-status" style={{ background: statusColor }} />
                      )}
                      {selectMode && (
                        <span className={`mg-tile-check ${isSelected ? 'is-on' : ''}`}>
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div className="mg-bottom-pad" />
      </section>

      {/* Lightbox */}
      {lightboxItem && (
        <Lightbox
          item={lightboxItem}
          characters={characters}
          onClose={() => setLightboxItem(null)}
          onEdit={() => editItem(lightboxItem)}
          onFavorite={() => {
            toggleFavorite(lightboxItem.id);
            hapticLight();
            setLightboxItem(prev => prev ? { ...prev, favorite: !prev.favorite } : prev);
          }}
          onShare={() => shareItem(lightboxItem)}
          onCycleStatus={() => cycleStatusForItem(lightboxItem)}
          onAssign={() => setShowAssignChar(true)}
          onDelete={() => {
            removeItems([lightboxItem.id]);
            setLightboxItem(null);
            hapticSuccess();
            toast.success('Foto eliminada');
          }}
        />
      )}

      {/* Assign character modal */}
      {showAssignChar && lightboxItem && (
        <div className="mg-modal-backdrop" onClick={() => setShowAssignChar(false)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()}>
            <div className="mg-modal-head">
              <h3>Asignar a personaje</h3>
              <button onClick={() => setShowAssignChar(false)} aria-label="Cerrar"><X size={16} /></button>
            </div>
            <div className="mg-modal-body">
              <button className="mg-char-row" onClick={() => assignCharacter(lightboxItem, null)}>
                <div className="mg-char-row-avatar mg-char-row-none"><X size={14} /></div>
                <span>Sin personaje</span>
                {!lightboxItem.characterId && <Check size={14} />}
              </button>
              {characters.length === 0 && (
                <div className="mg-modal-empty">
                  No tienes personajes. Crea uno primero.
                </div>
              )}
              {characters.map(c => (
                <button key={c.id} className="mg-char-row" onClick={() => assignCharacter(lightboxItem, c.id)}>
                  <div
                    className="mg-char-row-avatar"
                    style={c.thumbnail ? { backgroundImage: `url(${c.thumbnail})` } : undefined}
                  />
                  <span>{c.name}</span>
                  {lightboxItem.characterId === c.id && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm bulk delete */}
      {showConfirmDelete && (
        <div className="mg-modal-backdrop" onClick={() => setShowConfirmDelete(false)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()}>
            <div className="mg-modal-head">
              <h3>Eliminar fotos</h3>
            </div>
            <div className="mg-modal-body">
              <p className="mg-modal-text">
                ¿Eliminar {selectedIds.size} {selectedIds.size === 1 ? 'foto' : 'fotos'}? Esta acción no se puede deshacer.
              </p>
              <div className="mg-modal-actions">
                <button className="mg-modal-cancel" onClick={() => setShowConfirmDelete(false)}>Cancelar</button>
                <button className="mg-modal-danger" onClick={performBulkDelete}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────

interface LightboxProps {
  item: GalleryItem;
  characters: SavedCharacter[];
  onClose: () => void;
  onEdit: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onCycleStatus: () => void;
  onAssign: () => void;
  onDelete: () => void;
}

function Lightbox({
  item, characters, onClose, onEdit, onFavorite, onShare, onCycleStatus, onAssign, onDelete,
}: LightboxProps) {
  const touchStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  // Hide the global bottom nav while the lightbox is open. Two signals — a
  // body data-attribute (CSS) and a window event (React state in MobileApp).
  // Either alone failed on some iOS Safari builds due to stacking-context
  // weirdness with the nav's backdrop-filter. Both together cover all paths.
  useEffect(() => {
    document.body.dataset.modalOpen = 'gallery-lightbox';
    window.dispatchEvent(new CustomEvent('vist:modal-open'));
    return () => {
      delete document.body.dataset.modalOpen;
      window.dispatchEvent(new CustomEvent('vist:modal-close'));
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (dy > 0) setDragY(dy);
  };
  const onTouchEnd = () => {
    if (dragY > 120) onClose();
    setDragY(0);
    touchStartY.current = null;
  };

  const assignedChar = characters.find(c => c.id === item.characterId);
  const status = item.workflowStatus ?? 'borrador';
  const statusColor = STATUSES.find(s => s.id === status)?.color ?? '#A8957D';
  const statusLabel = STATUSES.find(s => s.id === status)?.label ?? 'Borrador';

  return (
    <div className="mg-lightbox" onClick={onClose}>
      <style>{LIGHTBOX_STYLES}</style>
      <div
        className="mg-lightbox-img-wrap"
        style={{
          transform: `translateY(${dragY}px)`,
          opacity: 1 - Math.min(dragY / 400, 0.5),
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={e => e.stopPropagation()}
      >
        <button className="mg-lightbox-close" onClick={onClose} aria-label="Cerrar">
          <X size={18} />
        </button>
        <img src={item.url} alt={item.prompt || ''} draggable={false} />
      </div>

      {/* Bottom action sheet */}
      <div className="mg-lightbox-sheet" onClick={e => e.stopPropagation()}>
        <div className="mg-sheet-handle" />

        {assignedChar && (
          <div className="mg-sheet-char">
            <span
              className="mg-sheet-char-avatar"
              style={assignedChar.thumbnail ? { backgroundImage: `url(${assignedChar.thumbnail})` } : undefined}
            />
            <span className="mg-sheet-char-name">{assignedChar.name}</span>
          </div>
        )}

        <div className="mg-sheet-actions">
          <button className="mg-sheet-btn" onClick={onFavorite}>
            <Star size={18} fill={item.favorite ? 'currentColor' : 'none'} />
            <span>{item.favorite ? 'Favorita' : 'Favorito'}</span>
          </button>
          <button className="mg-sheet-btn mg-sheet-btn-primary" onClick={onEdit}>
            <Edit2 size={18} />
            <span>Editar</span>
          </button>
          <button className="mg-sheet-btn" onClick={onShare}>
            <Share2 size={18} />
            <span>Compartir</span>
          </button>
        </div>

        <div className="mg-sheet-actions-sec">
          <button className="mg-sheet-row" onClick={onCycleStatus}>
            <span className="mg-sheet-row-dot" style={{ background: statusColor }} />
            <span className="mg-sheet-row-text">
              Estado · <strong>{statusLabel}</strong>
            </span>
            <span className="mg-sheet-row-arrow">→</span>
          </button>
          <button className="mg-sheet-row" onClick={onAssign}>
            <Tag size={14} />
            <span className="mg-sheet-row-text">
              {assignedChar ? `Asignada a ${assignedChar.name}` : 'Asignar a personaje'}
            </span>
            <span className="mg-sheet-row-arrow">→</span>
          </button>
          <button className="mg-sheet-row mg-sheet-row-danger" onClick={onDelete}>
            <Trash2 size={14} />
            <span className="mg-sheet-row-text">Eliminar foto</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const MG_STYLES = `
.mg-shell {
  --mg-bg-0: #F5EBDB;
  --mg-bg-card: #FFFCF5;
  --mg-paper: #F8EFDD;
  --mg-ink-0: #1F1A14;
  --mg-ink-1: #3D332A;
  --mg-ink-2: #6F5E4C;
  --mg-ink-3: #A8957D;
  --mg-line: rgba(31, 26, 20, 0.10);
  --mg-accent: #C9785C;
  --mg-accent-deep: #8E5640;
  --mg-gold: #D4A85F;
  --mg-rose: #B86060;
  --mg-ease: cubic-bezier(0.32, 0.72, 0, 1);

  min-height: 100%;
  background: var(--mg-bg-0);
  color: var(--mg-ink-0);
  font-family: 'DM Sans', sans-serif;
  padding-bottom: 96px;
  background-image:
    radial-gradient(circle at 30% 12%, rgba(31,26,20,0.022) 1px, transparent 1px),
    radial-gradient(circle at 75% 55%, rgba(31,26,20,0.018) 1px, transparent 1px);
  background-size: 30px 30px, 48px 48px;
}

/* Select bar */
.mg-shell .mg-select-bar {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; gap: 10px;
  padding: max(14px, env(safe-area-inset-top)) 16px 12px;
  background: var(--mg-ink-0);
  color: var(--mg-bg-card);
  -webkit-tap-highlight-color: transparent;
}
.mg-shell .mg-select-cancel {
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.18);
  background: transparent;
  color: var(--mg-bg-card);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
}
.mg-shell .mg-select-count {
  flex: 1;
  font-size: 13px; font-weight: 600;
  letter-spacing: 0.01em;
}
.mg-shell .mg-select-actions { display: flex; gap: 8px; }
.mg-shell .mg-select-btn {
  width: 36px; height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.08);
  color: var(--mg-bg-card);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: transform 0.2s var(--mg-ease);
}
.mg-shell .mg-select-btn:active { transform: scale(0.92); }
.mg-shell .mg-select-btn:disabled { opacity: 0.4; }
.mg-shell .mg-select-btn.mg-danger { background: var(--mg-rose); border-color: var(--mg-rose); }

/* Hero */
.mg-shell .mg-hero {
  padding: 12px 20px 0;
}
.mg-shell .mg-hero-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--mg-ink-3);
  margin-bottom: 6px;
}
.mg-shell .mg-hero-title {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 34px; line-height: 0.96;
  letter-spacing: -0.02em;
  font-weight: 400;
  color: var(--mg-ink-0);
  margin: 0;
}
.mg-shell .mg-hero-title em { font-style: italic; color: var(--mg-accent); }

/* Filter pills */
.mg-shell .mg-filters {
  display: flex; gap: 8px;
  padding: 16px 20px 4px;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.mg-shell .mg-filters::-webkit-scrollbar { display: none; }
.mg-shell .mg-filter {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: var(--mg-bg-card);
  border: 1px solid var(--mg-line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 500;
  color: var(--mg-ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.2s var(--mg-ease), color 0.2s var(--mg-ease);
}
.mg-shell .mg-filter.is-active {
  background: var(--mg-ink-0);
  border-color: var(--mg-ink-0);
  color: var(--mg-bg-card);
}
.mg-shell .mg-filter-count {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  opacity: 0.7;
}

/* Character chips */
.mg-shell .mg-chars {
  display: flex; gap: 8px;
  padding: 8px 20px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.mg-shell .mg-chars::-webkit-scrollbar { display: none; }
.mg-shell .mg-char-chip {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 12px 5px 5px;
  background: var(--mg-bg-card);
  border: 1px solid var(--mg-line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 500;
  color: var(--mg-ink-1);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mg-shell .mg-char-chip.is-active {
  background: var(--mg-ink-0);
  border-color: var(--mg-ink-0);
  color: var(--mg-bg-card);
}
.mg-shell .mg-char-chip .mg-char-avatar {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--mg-paper);
  background-size: cover; background-position: center;
  flex-shrink: 0;
}
.mg-shell .mg-char-chip .mg-char-all-dot {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: var(--mg-paper);
  border: 1px dashed var(--mg-line);
  flex-shrink: 0;
}
.mg-shell .mg-char-chip.is-active .mg-char-all-dot {
  background: rgba(255,255,255,0.12);
  border-color: rgba(255,255,255,0.3);
}
.mg-shell .mg-char-chip .mg-char-name {
  white-space: nowrap;
}

/* Status chips */
.mg-shell .mg-statuses {
  display: flex; gap: 6px;
  padding: 6px 20px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}
.mg-shell .mg-statuses::-webkit-scrollbar { display: none; }
.mg-shell .mg-status-chip {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 11px;
  background: transparent;
  border: 1px solid var(--mg-line);
  border-radius: 999px;
  font-family: inherit;
  font-size: 11px; font-weight: 500;
  color: var(--mg-ink-2);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.mg-shell .mg-status-chip.is-active {
  background: var(--mg-bg-card);
  border-color: var(--mg-ink-0);
  color: var(--mg-ink-0);
}
.mg-shell .mg-status-chip .mg-status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--status-color, var(--mg-ink-3));
}
.mg-shell .mg-status-chip .mg-status-count {
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--mg-ink-3);
}

/* Content */
.mg-shell .mg-content {
  padding: 20px 12px 0;
}
.mg-shell .mg-empty-filter {
  text-align: center;
  padding: 40px 20px;
  color: var(--mg-ink-2);
  font-size: 13px;
}
.mg-shell .mg-empty-clear {
  margin-top: 12px;
  padding: 9px 16px;
  background: var(--mg-ink-0);
  color: var(--mg-bg-card);
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 12px; font-weight: 600;
  cursor: pointer;
}

/* Date groups */
.mg-shell .mg-group {
  margin-bottom: 22px;
}
.mg-shell .mg-group-label {
  display: flex; align-items: baseline; gap: 8px;
  padding: 0 8px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--mg-ink-2);
}
.mg-shell .mg-group-count {
  color: var(--mg-ink-3);
  font-size: 9px;
}

/* Grid */
.mg-shell .mg-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
}
.mg-shell .mg-tile {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--mg-paper);
  border: none;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  border-radius: 4px;
  -webkit-tap-highlight-color: transparent;
  -webkit-touch-callout: none;
  user-select: none;
  transition: transform 0.2s var(--mg-ease);
}
.mg-shell .mg-tile:active { transform: scale(0.97); }
.mg-shell .mg-tile img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
}
.mg-shell .mg-tile.is-selected {
  outline: 3px solid var(--mg-accent);
  outline-offset: -3px;
}
.mg-shell .mg-tile.is-selected img {
  opacity: 0.85;
}

/* Tile badges */
.mg-shell .mg-tile-badge {
  position: absolute; top: 6px; left: 6px;
  display: inline-flex; align-items: center;
  padding: 3px 5px;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(6px);
  border-radius: 6px;
  color: rgba(255, 252, 245, 0.95);
}
.mg-shell .mg-tile-fav {
  position: absolute; top: 6px; right: 6px;
  display: inline-flex;
  padding: 3px;
  background: rgba(20, 16, 14, 0.7);
  backdrop-filter: blur(6px);
  border-radius: 50%;
  color: var(--mg-gold);
}
.mg-shell .mg-tile-status {
  position: absolute; bottom: 6px; right: 6px;
  width: 8px; height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 0 1.5px rgba(255, 252, 245, 0.9);
}
.mg-shell .mg-tile-check {
  position: absolute; top: 6px; right: 6px;
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 252, 245, 0.92);
  background: rgba(20, 16, 14, 0.4);
  display: flex; align-items: center; justify-content: center;
  color: var(--mg-bg-card);
  backdrop-filter: blur(4px);
}
.mg-shell .mg-tile-check.is-on {
  background: var(--mg-accent);
  border-color: var(--mg-accent);
}

.mg-shell .mg-bottom-pad { height: 20px; }

/* Modal */
.mg-shell .mg-modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(20, 16, 14, 0.55);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex; align-items: flex-end;
  animation: mg-fade-in 0.2s var(--mg-ease);
}
.mg-shell .mg-modal {
  width: 100%;
  background: var(--mg-bg-card);
  border-radius: 22px 22px 0 0;
  padding: max(8px, env(safe-area-inset-bottom)) 0 max(20px, env(safe-area-inset-bottom));
  animation: mg-slide-up 0.25s var(--mg-ease);
  max-height: 80vh;
  overflow-y: auto;
}
.mg-shell .mg-modal::before {
  content: '';
  display: block;
  width: 36px; height: 4px;
  margin: 10px auto 14px;
  background: var(--mg-line);
  border-radius: 999px;
}
.mg-shell .mg-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px 14px;
}
.mg-shell .mg-modal-head h3 {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 400;
  margin: 0;
  color: var(--mg-ink-0);
}
.mg-shell .mg-modal-head button {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--mg-paper);
  border: 1px solid var(--mg-line);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  color: var(--mg-ink-1);
}
.mg-shell .mg-modal-body { padding: 0 12px; }
.mg-shell .mg-modal-empty {
  padding: 24px;
  text-align: center;
  color: var(--mg-ink-2);
  font-size: 13px;
}
.mg-shell .mg-modal-text {
  padding: 4px 20px 0;
  color: var(--mg-ink-1);
  font-size: 14px;
  line-height: 1.5;
}
.mg-shell .mg-modal-actions {
  display: flex; gap: 8px;
  padding: 16px 20px 4px;
}
.mg-shell .mg-modal-cancel,
.mg-shell .mg-modal-danger {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-family: inherit;
  font-size: 14px; font-weight: 600;
  cursor: pointer;
}
.mg-shell .mg-modal-cancel {
  background: var(--mg-paper);
  color: var(--mg-ink-1);
  border: 1px solid var(--mg-line);
}
.mg-shell .mg-modal-danger {
  background: var(--mg-rose);
  color: var(--mg-bg-card);
}

/* Character rows in modal */
.mg-shell .mg-char-row {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px; font-weight: 500;
  color: var(--mg-ink-1);
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.mg-shell .mg-char-row:active { background: var(--mg-paper); }
.mg-shell .mg-char-row-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--mg-paper);
  background-size: cover; background-position: center;
  flex-shrink: 0;
}
.mg-shell .mg-char-row-none {
  display: flex; align-items: center; justify-content: center;
  color: var(--mg-ink-3);
  border: 1px dashed var(--mg-line);
}
.mg-shell .mg-char-row > span:nth-child(2) { flex: 1; }

@keyframes mg-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes mg-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
`;

const LIGHTBOX_STYLES = `
.mg-lightbox {
  position: fixed; inset: 0;
  /* 100dvh keeps the lightbox glued to the dynamic viewport on iOS — without
   * it, the URL-bar showing/hiding caused a few pixels of nav to bleed under. */
  height: 100dvh;
  background: rgba(8, 6, 5, 0.94);
  z-index: 9999;
  display: flex; flex-direction: column;
  animation: mg-fade-in 0.18s var(--mg-ease);
  -webkit-tap-highlight-color: transparent;
}
.mg-lightbox .mg-lightbox-img-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(16px, env(safe-area-inset-top)) 12px 12px;
  position: relative;
  transition: opacity 0.18s ease-out;
}
.mg-lightbox .mg-lightbox-img-wrap img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 10px;
  user-select: none;
  -webkit-user-drag: none;
  pointer-events: none;
}
.mg-lightbox .mg-lightbox-close {
  position: absolute;
  top: max(20px, env(safe-area-inset-top));
  right: 16px;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: rgba(255, 252, 245, 0.16);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 252, 245, 0.12);
  color: rgba(255, 252, 245, 0.95);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  z-index: 5;
}

/* Bottom sheet */
.mg-lightbox .mg-lightbox-sheet {
  flex-shrink: 0;
  background: #FFFCF5;
  border-radius: 22px 22px 0 0;
  padding: 10px 20px max(20px, env(safe-area-inset-bottom));
  animation: mg-slide-up 0.25s cubic-bezier(0.32, 0.72, 0, 1);
  color: #1F1A14;
}
.mg-lightbox .mg-sheet-handle {
  width: 36px; height: 4px;
  margin: 0 auto 14px;
  background: rgba(31, 26, 20, 0.15);
  border-radius: 999px;
}
.mg-lightbox .mg-sheet-char {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 12px;
  padding: 9px 14px;
  background: #F8EFDD;
  border-radius: 12px;
  border: 1px solid rgba(31, 26, 20, 0.06);
}
.mg-lightbox .mg-sheet-char-avatar {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: #F4EDE0;
  background-size: cover; background-position: center;
  flex-shrink: 0;
}
.mg-lightbox .mg-sheet-char-name {
  font-family: 'Instrument Serif', 'Playfair Display', serif;
  font-size: 15px;
  font-weight: 500;
  color: #1F1A14;
}
.mg-lightbox .mg-sheet-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.mg-lightbox .mg-sheet-btn {
  display: flex; flex-direction: column;
  align-items: center; gap: 6px;
  padding: 14px 8px;
  background: #F8EFDD;
  border: 1px solid rgba(31, 26, 20, 0.06);
  border-radius: 14px;
  font-family: 'DM Sans', sans-serif;
  font-size: 11px; font-weight: 600;
  color: #3D332A;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.2s cubic-bezier(0.32, 0.72, 0, 1);
}
.mg-lightbox .mg-sheet-btn:active { transform: scale(0.96); }
.mg-lightbox .mg-sheet-btn-primary {
  background: #1F1A14;
  color: #FFFCF5;
  border-color: #1F1A14;
}
.mg-lightbox .mg-sheet-actions-sec {
  display: flex; flex-direction: column;
  gap: 2px;
  margin-top: 6px;
}
.mg-lightbox .mg-sheet-row {
  display: flex; align-items: center; gap: 12px;
  width: 100%;
  padding: 13px 14px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-family: 'DM Sans', sans-serif;
  font-size: 13px;
  color: #3D332A;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}
.mg-lightbox .mg-sheet-row:active { background: #F8EFDD; }
.mg-lightbox .mg-sheet-row strong { font-weight: 600; color: #1F1A14; }
.mg-lightbox .mg-sheet-row-text { flex: 1; }
.mg-lightbox .mg-sheet-row-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.mg-lightbox .mg-sheet-row-arrow {
  color: #A8957D;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
}
.mg-lightbox .mg-sheet-row-danger { color: #B86060; }
.mg-lightbox .mg-sheet-row-danger:active { background: rgba(184, 96, 96, 0.08); }
`;
