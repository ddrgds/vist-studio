import React, { useState } from 'react'

export interface InspirationIdea {
  id: string;
  title: string;
  prompt: string;
  category: string;
  tags: string[];
  thumbnail?: string; // emoji placeholder
}

interface InspirationBoardProps {
  onSelectIdea: (idea: InspirationIdea) => void;
  onClose: () => void;
}

// ─── Hardcoded Inspiration Data ──────────────────────────

const CATEGORIES = ['Todas', 'Fashion', 'Lifestyle', 'Travel', 'Beauty', 'Fitness', 'Food', 'Tech'] as const

const GRADIENTS: Record<string, string> = {
  Fashion:   'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
  Lifestyle: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)',
  Travel:    'linear-gradient(135deg, #F59E0B 0%, #6366F1 100%)',
  Beauty:    'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  Fitness:   'linear-gradient(135deg, #10B981 0%, #6366F1 100%)',
  Food:      'linear-gradient(135deg, #F97316 0%, #EF4444 100%)',
  Tech:      'linear-gradient(135deg, #6366F1 0%, #3B82F6 100%)',
}

const IDEAS: InspirationIdea[] = [
  // Fashion
  {
    id: 'f1', title: 'Street Style OOTD in Tokyo',
    prompt: 'Street style photo in Tokyo, outfit of the day, Harajuku district background, neon signs, confident pose walking on crosswalk, fashion editorial style, vibrant colors, full body shot',
    category: 'Fashion', tags: ['street', 'tokyo', 'ootd'], thumbnail: '\uD83C\uDDEF\uD83C\uDDF5',
  },
  {
    id: 'f2', title: 'Magazine Cover Editorial',
    prompt: 'High fashion magazine cover shot, dramatic studio lighting, elegant pose, professional makeup, designer outfit, clean minimal background, editorial photography, Vogue style, upper body portrait',
    category: 'Fashion', tags: ['editorial', 'magazine', 'luxury'], thumbnail: '\uD83D\uDCF0',
  },
  {
    id: 'f3', title: 'Casual Coffee Shop Look',
    prompt: 'Casual aesthetic coffee shop photo, cozy outfit with oversized sweater, holding latte, warm tones, bokeh background, natural light through window, candid feel, Instagram aesthetic',
    category: 'Fashion', tags: ['casual', 'cozy', 'coffee'], thumbnail: '\u2615',
  },
  {
    id: 'f4', title: 'Red Carpet Evening Gown',
    prompt: 'Red carpet event photo, elegant evening gown, glamorous pose, professional flash photography, step-and-repeat background, luxury jewelry, confident expression, full body shot',
    category: 'Fashion', tags: ['gala', 'luxury', 'evening'], thumbnail: '\uD83C\uDF1F',
  },
  {
    id: 'f5', title: 'Athleisure Workout Fit',
    prompt: 'Sporty athleisure outfit photo, stylish activewear, urban park setting, dynamic confident pose, morning golden light, fitness fashion editorial, full body shot',
    category: 'Fashion', tags: ['sporty', 'athleisure', 'active'], thumbnail: '\uD83D\uDC5F',
  },

  // Lifestyle
  {
    id: 'l1', title: 'Morning Routine Flatlay',
    prompt: 'Aesthetic morning routine flat lay photo from above, skincare products, coffee cup, journal, flowers, marble surface, soft natural light, organized layout, lifestyle blogger style',
    category: 'Lifestyle', tags: ['morning', 'flatlay', 'aesthetic'], thumbnail: '\uD83C\uDF1E',
  },
  {
    id: 'l2', title: 'Cozy Reading Nook',
    prompt: 'Cozy reading scene, sitting in comfortable chair with book, warm lighting, blanket, indoor plants, bohemian decor, relaxed candid expression, warm tones, lifestyle photography',
    category: 'Lifestyle', tags: ['cozy', 'reading', 'home'], thumbnail: '\uD83D\uDCDA',
  },
  {
    id: 'l3', title: 'Workspace Desk Setup',
    prompt: 'Aesthetic workspace setup photo, minimal desk with laptop, coffee, plants, organized stationery, soft ambient lighting, clean modern interior, productivity vibes, overhead angle',
    category: 'Lifestyle', tags: ['desk', 'workspace', 'minimal'], thumbnail: '\uD83D\uDCBB',
  },
  {
    id: 'l4', title: 'Weekend Brunch Aesthetic',
    prompt: 'Weekend brunch scene at trendy restaurant, beautiful food presentation, natural light, relaxed smile, aesthetic table setting, avocado toast, fresh juice, lifestyle influencer style',
    category: 'Lifestyle', tags: ['brunch', 'food', 'weekend'], thumbnail: '\uD83E\uDD5E',
  },

  // Travel
  {
    id: 't1', title: 'Golden Hour at Santorini',
    prompt: 'Golden hour photo in Santorini Greece, white and blue buildings backdrop, stunning sunset, flowing dress, overlooking the Aegean sea, travel influencer pose, warm golden light, cinematic',
    category: 'Travel', tags: ['santorini', 'sunset', 'greece'], thumbnail: '\uD83C\uDDEC\uD83C\uDDF7',
  },
  {
    id: 't2', title: 'NYC Street Crossing',
    prompt: 'Walking across a busy New York City street, yellow taxi cabs in background, confident stride, urban fashion, Empire State Building visible, street photography style, daytime, full body',
    category: 'Travel', tags: ['nyc', 'urban', 'street'], thumbnail: '\uD83D\uDDFD',
  },
  {
    id: 't3', title: 'Beach Sunset Silhouette',
    prompt: 'Dramatic silhouette photo on tropical beach at sunset, standing at water edge, vibrant orange and purple sky, waves, peaceful pose with arms slightly spread, cinematic wide shot',
    category: 'Travel', tags: ['beach', 'sunset', 'tropical'], thumbnail: '\uD83C\uDFD6\uFE0F',
  },
  {
    id: 't4', title: 'Mountain Hiking Trail',
    prompt: 'Hiking photo on scenic mountain trail, outdoor adventure gear, breathtaking mountain view background, morning mist, looking at horizon, adventure travel photography, wide landscape',
    category: 'Travel', tags: ['hiking', 'mountain', 'adventure'], thumbnail: '\u26F0\uFE0F',
  },

  // Beauty
  {
    id: 'b1', title: 'Skincare Routine Close-up',
    prompt: 'Close-up beauty shot, applying skincare serum, dewy glowing skin, soft ring light, clean minimal background, fresh natural look, beauty influencer style, head and shoulders',
    category: 'Beauty', tags: ['skincare', 'glow', 'closeup'], thumbnail: '\u2728',
  },
  {
    id: 'b2', title: 'Bold Makeup Editorial',
    prompt: 'Bold creative makeup editorial photo, dramatic eye makeup with vibrant colors, studio lighting with color gels, artistic beauty photography, close-up face shot, high fashion beauty',
    category: 'Beauty', tags: ['makeup', 'bold', 'editorial'], thumbnail: '\uD83D\uDC84',
  },
  {
    id: 'b3', title: 'Natural No-Makeup Look',
    prompt: 'Natural beauty portrait, fresh no-makeup look, soft natural sunlight, freckles visible, genuine smile, minimal retouching aesthetic, clean skin, outdoor setting, head and shoulders',
    category: 'Beauty', tags: ['natural', 'fresh', 'minimal'], thumbnail: '\uD83C\uDF3F',
  },

  // Fitness
  {
    id: 'fi1', title: 'Yoga Pose at Sunrise',
    prompt: 'Yoga pose photo at sunrise, outdoor rooftop or beach setting, warrior pose or tree pose, activewear, golden morning light, peaceful expression, fitness wellness photography, full body',
    category: 'Fitness', tags: ['yoga', 'sunrise', 'wellness'], thumbnail: '\uD83E\uDDD8',
  },
  {
    id: 'fi2', title: 'Gym Mirror Selfie',
    prompt: 'Gym mirror selfie, fitted workout outfit, post-workout glow, modern gym background with equipment, confident pose flexing, good gym lighting, fitness influencer style, full body mirror shot',
    category: 'Fitness', tags: ['gym', 'selfie', 'workout'], thumbnail: '\uD83D\uDCAA',
  },
  {
    id: 'fi3', title: 'Running in the Park',
    prompt: 'Dynamic running photo in a scenic park, athletic outfit, mid-stride action shot, tree-lined path, morning light, motion blur background, sporty and energetic, fitness photography',
    category: 'Fitness', tags: ['running', 'park', 'active'], thumbnail: '\uD83C\uDFC3',
  },

  // Food
  {
    id: 'fo1', title: 'Aesthetic Latte Art',
    prompt: 'Holding a beautiful latte art coffee, close-up hands and cup, aesthetic cafe background, warm tones, steam rising, cozy atmosphere, food blogger photography style, overhead slight angle',
    category: 'Food', tags: ['coffee', 'latte', 'cafe'], thumbnail: '\u2615',
  },
  {
    id: 'fo2', title: 'Healthy Bowl Presentation',
    prompt: 'Colorful healthy acai bowl or smoothie bowl, beautiful food styling with fresh fruits and toppings, marble table, natural light from side, minimal props, food photography, top-down angle',
    category: 'Food', tags: ['healthy', 'bowl', 'colorful'], thumbnail: '\uD83E\uDD57',
  },

  // Tech
  {
    id: 'te1', title: 'Unboxing New Gadget',
    prompt: 'Tech unboxing scene, opening sleek new gadget box, clean desk setup, excited expression, soft studio lighting, tech reviewer aesthetic, modern minimal background, hands visible, medium shot',
    category: 'Tech', tags: ['unboxing', 'gadget', 'review'], thumbnail: '\uD83D\uDCE6',
  },
  {
    id: 'te2', title: 'Setup Tour RGB',
    prompt: 'RGB gaming and content creator setup tour, dual monitors with colorful wallpapers, LED strip lighting, mechanical keyboard, modern desk, purple and blue ambient glow, wide angle room shot',
    category: 'Tech', tags: ['setup', 'rgb', 'gaming'], thumbnail: '\uD83D\uDDA5\uFE0F',
  },
]

export function InspirationBoard({ onSelectIdea, onClose }: InspirationBoardProps) {
  const [activeCategory, setActiveCategory] = useState<string>('Todas')

  const filtered = activeCategory === 'Todas'
    ? IDEAS
    : IDEAS.filter(idea => idea.category === activeCategory)

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-[90vw] max-w-[900px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'var(--joi-bg-1)',
          border: '1px solid rgba(255,255,255,.06)',
          boxShadow: '0 24px 80px rgba(0,0,0,.6), 0 0 60px rgba(99,102,241,.05)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--joi-text-1)' }}>
              Tablero de <span style={{ color: 'var(--joi-pink)' }}>Inspiración</span>
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--joi-text-3)' }}>
              Haz clic en una idea para enviarla al Director con un prompt listo para usar
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/[.05]"
            style={{ color: 'var(--joi-text-3)' }}
          >
            {'\u2715'}
          </button>
        </div>

        {/* Category filter chips */}
        <div className="shrink-0 flex items-center gap-2 px-6 py-3 overflow-x-auto"
          style={{ borderBottom: '1px solid rgba(255,255,255,.03)' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap shrink-0"
              style={{
                background: activeCategory === cat ? 'rgba(99,102,241,.12)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${activeCategory === cat ? 'rgba(99,102,241,.25)' : 'rgba(255,255,255,.06)'}`,
                color: activeCategory === cat ? 'var(--joi-pink)' : 'var(--joi-text-2)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Masonry grid */}
        <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: 'thin' }}>
          <div style={{ columns: 3, columnGap: 12 }}>
            {filtered.map((idea, i) => (
              <button
                key={idea.id}
                onClick={() => onSelectIdea(idea)}
                className="w-full mb-3 rounded-xl overflow-hidden text-left transition-all hover:scale-[1.02] hover:shadow-lg group"
                style={{
                  breakInside: 'avoid',
                  display: 'inline-block',
                  border: '1px solid rgba(255,255,255,.06)',
                }}
              >
                {/* Gradient thumbnail */}
                <div
                  className="flex items-center justify-center relative"
                  style={{
                    background: GRADIENTS[idea.category] || GRADIENTS.Fashion,
                    height: i % 3 === 0 ? 140 : i % 3 === 1 ? 110 : 100,
                    opacity: 0.85,
                  }}
                >
                  <span className="text-3xl drop-shadow-lg">{idea.thumbnail || '\u2728'}</span>
                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,.4)' }}
                  >
                    <span className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                      style={{
                        background: 'rgba(99,102,241,.9)',
                        color: '#fff',
                      }}>
                      Usar esta idea
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="px-3.5 py-3" style={{ background: 'var(--joi-bg-2)' }}>
                  <div className="text-[12px] font-semibold mb-1.5 leading-snug" style={{ color: 'var(--joi-text-1)' }}>
                    {idea.title}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: 'rgba(99,102,241,.08)',
                        color: 'var(--joi-pink)',
                        border: '1px solid rgba(99,102,241,.15)',
                      }}>
                      {idea.category}
                    </span>
                    {idea.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'rgba(255,255,255,.03)',
                          color: 'var(--joi-text-3)',
                          border: '1px solid rgba(255,255,255,.05)',
                        }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12" style={{ color: 'var(--joi-text-3)' }}>
              <p className="text-sm">No hay ideas en esta categoría todavía.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InspirationBoard
