import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PenTool, Camera, Images, User, ImageIcon } from 'lucide-react';
import { useCharacterStore } from '../stores/characterStore';
import { useGalleryStore } from '../stores/galleryStore';
import Button from '../ui/Button';
import Input from '../ui/Input';

type Tab = 'characters' | 'images';

const Gallery: React.FC = () => {
  const navigate = useNavigate();
  const { characters } = useCharacterStore();
  const { items: galleryItems } = useGalleryStore();
  const [activeTab, setActiveTab] = useState<Tab>('characters');
  const [search, setSearch] = useState('');

  const filteredChars = characters.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredImages = galleryItems.filter(item =>
    item.prompt?.toLowerCase().includes(search.toLowerCase()) || !search
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar" style={{ background: 'var(--bg-0)' }}>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 style={{ fontSize: 28, lineHeight: 1.1 }}>
              <span style={{ fontFamily: "'Instrument Serif', serif", color: 'var(--text-1)' }}>Galería</span>
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 6 }}>
              {characters.length} personajes &middot; {galleryItems.length} imágenes
            </p>
          </div>
          <Button onClick={() => navigate('/studio?tool=create')} icon={<Plus size={16} />}>
            New Character
          </Button>
        </div>

        {/* ── Tabs + Search ── */}
        <div className="flex items-center gap-4 mb-6">
          <div className="inline-flex rounded-xl overflow-hidden" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
            {(['characters', 'images'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-5 py-2 text-sm font-semibold transition-all duration-150 capitalize cursor-pointer"
                style={{
                  background: activeTab === tab ? 'var(--accent)' : 'transparent',
                  color: activeTab === tab ? '#fff' : 'var(--text-3)',
                }}
              >
                {tab === 'characters' ? 'Personajes' : 'Imágenes'}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
            />
          </div>
        </div>

        {/* ── Characters Grid ── */}
        {activeTab === 'characters' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredChars.map(char => (
                <div
                  key={char.id}
                  className="card rounded-xl overflow-hidden group cursor-pointer"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {char.thumbnail ? (
                    <img
                      src={char.thumbnail}
                      alt={char.name}
                      className="w-full h-[220px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-[220px] flex items-center justify-center" style={{ background: 'var(--bg-3)' }}>
                      <User className="w-10 h-10" style={{ color: 'var(--text-3)' }} />
                    </div>
                  )}
                  <div className="p-3" style={{ background: 'var(--bg-2)' }}>
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                      {char.name}
                    </div>
                    <div className="text-[11px] mb-2" style={{ color: 'var(--text-3)' }}>
                      {char.modelImageBlobs.length} fotos &middot; usado {char.usageCount}x
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => navigate(`/studio?character=${char.id}`)}
                        icon={<PenTool size={12} />}
                      >
                        Studio
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/studio?tool=session&character=${char.id}`)}
                        icon={<Camera size={12} />}
                      >
                        Shoot
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredChars.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-20 px-4 col-span-full">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-3)' }}>
                  <Images className="w-7 h-7" style={{ color: 'var(--text-3)' }} />
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                  {search ? 'No se encontraron personajes' : 'Aún no tienes personajes'}
                </p>
                {!search && (
                  <Button
                    onClick={() => navigate('/studio?tool=create')}
                    icon={<Plus size={14} />}
                    size="sm"
                  >
                    Create Character
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Images Grid ── */}
        {activeTab === 'images' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredImages.map(item => (
                <div
                  key={item.id}
                  className="card group relative rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <img
                    src={item.url}
                    alt=""
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="text-[11px] truncate" style={{ color: 'var(--text-2)' }}>
                      {item.prompt || item.type}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                      {item.model || 'Modelo desconocido'} &middot; {new Date(item.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredImages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center py-20 px-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-3)' }}>
                  <ImageIcon className="w-7 h-7" style={{ color: 'var(--text-3)' }} />
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                  {search ? 'No se encontraron imágenes' : 'Aún no tienes imágenes. ¡Genera algunas en el Studio!'}
                </p>
                {!search && (
                  <Button
                    onClick={() => navigate('/studio')}
                    icon={<Plus size={14} />}
                    size="sm"
                  >
                    Open Studio
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Gallery;
