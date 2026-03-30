// data/characterChips.ts

export interface ChipOption {
  id: string
  label: string
  emoji: string
  promptText: string
  color?: string   // hex — renders as color swatch instead of emoji
}

export interface ChipCategory {
  id: string
  label: string
  options: ChipOption[]
  maxSelect?: number
}

// ─── Ethnicity / Origin ──────────────────────────────────────────────
export const ETHNICITIES: ChipOption[] = [
  { id: 'latina',        label: 'Latina',           emoji: '🌺', promptText: 'Latina Hispanic, warm brown skin, dark expressive eyes, full lips, strong cheekbones' },
  { id: 'mediterranean', label: 'Mediterránea',     emoji: '🫒', promptText: 'Mediterranean European, olive warm skin, almond dark eyes, defined nose, dark wavy hair' },
  { id: 'east-asian',    label: 'Asiática (Este)',  emoji: '🌸', promptText: 'East Asian, smooth light skin, monolid almond eyes, straight black hair, delicate features' },
  { id: 'south-asian',   label: 'Asiática (Sur)',   emoji: '🪷', promptText: 'South Asian, medium-dark skin, large expressive eyes, high cheekbones, dark lush hair' },
  { id: 'mena',          label: 'Árabe / MENA',     emoji: '🌙', promptText: 'Middle Eastern, olive amber skin, deep almond eyes, strong defined nose, dark arched eyebrows' },
  { id: 'west-african',  label: 'Africana',         emoji: '✨', promptText: 'West African, deep rich melanin skin, wide almond eyes, broad nose, full lips, high cheekbones' },
  { id: 'east-african',  label: 'África del Este',  emoji: '🦁', promptText: 'East African, deep brown elongated features, high cheekbones, almond eyes, tall slender frame' },
  { id: 'north-european',label: 'Nórdica',          emoji: '❄️', promptText: 'Northern European, very fair porcelain skin, light blue or gray eyes, light blonde or red hair' },
  { id: 'east-european', label: 'Eslava',           emoji: '🌻', promptText: 'Eastern European Slavic, fair skin, wide cheekbones, light-colored eyes, strong features' },
  { id: 'indian',        label: 'India',            emoji: '🪔', promptText: 'Indian subcontinent, warm caramel skin, large almond eyes, dark thick eyebrows, high cheekbones' },
  { id: 'indigenous',    label: 'Indígena',         emoji: '🌿', promptText: 'Indigenous Native, warm copper-brown skin, dark deep-set eyes, high prominent cheekbones' },
  { id: 'brazilian',     label: 'Brasileña',        emoji: '🌴', promptText: 'Brazilian mixed heritage, warm golden-brown skin, green or amber eyes, mixed curly-wavy hair' },
  { id: 'caribbean',     label: 'Caribeña',         emoji: '🐚', promptText: 'Caribbean heritage, warm brown skin, wide almond eyes, full lips, natural coily or wavy hair' },
  { id: 'japanese',      label: 'Japonesa',         emoji: '🗻', promptText: 'Japanese, very smooth fair skin, narrow almond eyes, straight black hair, delicate refined features' },
  { id: 'korean',        label: 'Coreana',          emoji: '🌟', promptText: 'Korean, fair smooth skin, double eyelid or monolid, straight fine hair, slim oval face' },
  { id: 'mixed',         label: 'Mixta',            emoji: '🌈', promptText: 'mixed heritage, unique blend of features, multicultural beauty' },
]

// ─── Hair Styles ─────────────────────────────────────────────────────
export const HAIR_STYLES: ChipOption[] = [
  { id: 'long-straight', label: 'Liso largo',     emoji: '💇', promptText: 'long straight hair falling past shoulders' },
  { id: 'long-wavy',     label: 'Ondulado largo', emoji: '🌊', promptText: 'long wavy flowing hair' },
  { id: 'long-curly',    label: 'Rizado largo',   emoji: '➰', promptText: 'long voluminous curly hair' },
  { id: 'medium-straight',label:'Liso medio',     emoji: '💇', promptText: 'medium-length straight hair shoulder-length' },
  { id: 'medium-wavy',   label: 'Ondulado medio', emoji: '🌊', promptText: 'medium-length wavy hair' },
  { id: 'bob',           label: 'Bob',             emoji: '💁', promptText: 'sleek bob haircut at chin length' },
  { id: 'lob',           label: 'Lob',             emoji: '💁', promptText: 'long bob (lob) hairstyle' },
  { id: 'pixie',         label: 'Pixie',           emoji: '✂️', promptText: 'pixie cut, very short hair' },
  { id: 'buzz',          label: 'Buzz cut',        emoji: '💈', promptText: 'buzz cut, closely cropped' },
  { id: 'braids',        label: 'Trenzas',         emoji: '🎀', promptText: 'braided hairstyle, neat braids' },
  { id: 'box-braids',    label: 'Box braids',      emoji: '🎀', promptText: 'box braids hairstyle' },
  { id: 'afro',          label: 'Afro',            emoji: '🌀', promptText: 'natural afro hairstyle, full round' },
  { id: 'coils',         label: 'Coils / 4C',      emoji: '🔘', promptText: 'tight natural coils 4C hair texture' },
  { id: 'dreadlocks',    label: 'Dreadlocks',      emoji: '🦁', promptText: 'long dreadlocks hairstyle' },
  { id: 'undercut',      label: 'Undercut',        emoji: '💎', promptText: 'undercut hairstyle, shaved sides with longer top' },
  { id: 'mohawk',        label: 'Mohawk',          emoji: '🦅', promptText: 'mohawk hairstyle' },
  { id: 'ponytail',      label: 'Cola alta',       emoji: '🎗️', promptText: 'high ponytail' },
  { id: 'bun',           label: 'Moño',            emoji: '🪮', promptText: 'hair in a bun, elegant updo' },
  { id: 'half-up',       label: 'Semi recogido',   emoji: '🌸', promptText: 'half-up half-down hairstyle' },
  { id: 'space-buns',    label: 'Space buns',      emoji: '🪐', promptText: 'space buns hairstyle' },
  { id: 'shaggy',        label: 'Shaggy',          emoji: '🐕', promptText: 'shaggy layered textured hair' },
  { id: 'curtain-bangs', label: 'Fleco cortina',   emoji: '🖼️', promptText: 'hair with curtain bangs, parted in the middle' },
  { id: 'side-swept',    label: 'A un lado',       emoji: '💨', promptText: 'side-swept hair, swept to one side' },
  { id: 'wolf-cut',      label: 'Wolf cut',        emoji: '🐺', promptText: 'wolf cut hairstyle, layered with volume at crown' },
  { id: 'bald',          label: 'Calvo',           emoji: '🌕', promptText: 'bald head, no hair' },
  { id: 'twin-tails',    label: 'Twin tails',      emoji: '🎀', promptText: 'twin tails pigtails' },
]

// ─── Hair Colors ─────────────────────────────────────────────────────
export const HAIR_COLORS: ChipOption[] = [
  { id: 'jet-black',    label: 'Negro azabache',   emoji: '⬛', color: '#0A0A14', promptText: 'jet black hair with blue-black sheen' },
  { id: 'dark-brown',   label: 'Castaño oscuro',   emoji: '🟫', color: '#3B1F0F', promptText: 'dark espresso brown hair' },
  { id: 'brown',        label: 'Castaño',          emoji: '🟫', color: '#6B3D1E', promptText: 'medium warm brown hair' },
  { id: 'light-brown',  label: 'Castaño claro',    emoji: '🟫', color: '#9B6B3A', promptText: 'light warm brown hair' },
  { id: 'chestnut',     label: 'Castaño rojizo',   emoji: '🍂', color: '#7B3F2A', promptText: 'chestnut warm reddish-brown hair' },
  { id: 'auburn',       label: 'Cobrizo',          emoji: '🍂', color: '#922B21', promptText: 'auburn copper-red hair' },
  { id: 'ginger',       label: 'Jengibre',         emoji: '🔴', color: '#C45828', promptText: 'ginger natural red hair' },
  { id: 'dark-blonde',  label: 'Rubio oscuro',     emoji: '🟡', color: '#B8922A', promptText: 'dark golden blonde hair' },
  { id: 'blonde',       label: 'Rubio',            emoji: '🟡', color: '#D4A347', promptText: 'warm honey blonde hair' },
  { id: 'light-blonde', label: 'Rubio claro',      emoji: '🟡', color: '#EED27A', promptText: 'light bright blonde hair' },
  { id: 'platinum',     label: 'Platino',          emoji: '⬜', color: '#DCDCDC', promptText: 'platinum blonde near-white hair' },
  { id: 'white',        label: 'Blanco',           emoji: '⬜', color: '#F0F0F0', promptText: 'pure white hair' },
  { id: 'silver',       label: 'Plateado',         emoji: '🩶', color: '#A8A8B8', promptText: 'silver gray hair with sheen' },
  { id: 'gray',         label: 'Gris',             emoji: '🩶', color: '#787888', promptText: 'natural gray hair' },
  { id: 'fire-red',     label: 'Rojo fuego',       emoji: '🔥', color: '#C0392B', promptText: 'vivid fire engine red hair' },
  { id: 'pink',         label: 'Rosa',             emoji: '🩷', color: '#E879A0', promptText: 'pastel pink hair' },
  { id: 'hot-pink',     label: 'Rosa intenso',     emoji: '💗', color: '#D4286B', promptText: 'hot neon pink hair' },
  { id: 'blue',         label: 'Azul',             emoji: '🔵', color: '#3A6BD4', promptText: 'vivid blue hair' },
  { id: 'teal',         label: 'Teal',             emoji: '🩵', color: '#1A8A8A', promptText: 'teal blue-green hair' },
  { id: 'purple',       label: 'Morado',           emoji: '🟣', color: '#7B2D9E', promptText: 'vivid purple hair' },
  { id: 'lavender',     label: 'Lavanda',          emoji: '💜', color: '#9E7BC4', promptText: 'soft lavender pastel hair' },
  { id: 'green',        label: 'Verde',            emoji: '🟢', color: '#1A7A3A', promptText: 'vivid green hair' },
  { id: 'ombre',        label: 'Ombré',            emoji: '🌈', color: '#C4785A', promptText: 'ombre hair gradient dark roots to lighter ends' },
  { id: 'highlights',   label: 'Con mechas',       emoji: '✨', color: '#C8A050', promptText: 'hair with natural-looking highlights and dimension' },
  { id: 'balayage',     label: 'Balayage',         emoji: '🌊', color: '#B87840', promptText: 'balayage hair coloring technique, sun-kissed effect' },
]

// ─── Skin Tones ──────────────────────────────────────────────────────
export const SKIN_TONES: ChipOption[] = [
  { id: 'porcelain',   label: 'Porcelana',    emoji: '🤍', color: '#FAF0E6', promptText: 'porcelain very pale skin, almost translucent' },
  { id: 'fair',        label: 'Muy clara',    emoji: '🏻', color: '#F5E6D3', promptText: 'fair light skin, cool undertones' },
  { id: 'light',       label: 'Clara',        emoji: '🏻', color: '#EDD5B0', promptText: 'light skin, neutral undertones' },
  { id: 'light-warm',  label: 'Clara cálida', emoji: '🏼', color: '#E0C090', promptText: 'light warm skin, peachy undertones' },
  { id: 'medium-light',label: 'Media clara',  emoji: '🏼', color: '#D4A878', promptText: 'light medium skin, golden warm undertones' },
  { id: 'medium',      label: 'Media',        emoji: '🏽', color: '#C49060', promptText: 'medium olive skin, warm neutral undertones' },
  { id: 'olive',       label: 'Oliva',        emoji: '🫒', color: '#B07A45', promptText: 'olive skin tone, warm Mediterranean undertones' },
  { id: 'tan',         label: 'Bronceada',    emoji: '🏖️', color: '#A06030', promptText: 'tanned sun-kissed skin' },
  { id: 'medium-dark', label: 'Media oscura', emoji: '🏾', color: '#885030', promptText: 'medium dark warm brown skin' },
  { id: 'dark',        label: 'Oscura',       emoji: '🏿', color: '#5C3018', promptText: 'dark brown rich skin' },
  { id: 'deep',        label: 'Profunda',     emoji: '🏿', color: '#3C1A08', promptText: 'deep dark melanin-rich skin' },
  { id: 'ebony',       label: 'Ébano',        emoji: '🖤', color: '#1E0A02', promptText: 'ebony deep rich black-brown skin' },
  { id: 'golden',      label: 'Dorada',       emoji: '✨', color: '#D4A050', promptText: 'golden glowing warm skin tone' },
  // Fantasy
  { id: 'emerald',     label: 'Esmeralda',    emoji: '💚', color: '#1A6B3A', promptText: 'emerald green fantasy skin' },
  { id: 'lavender-sk', label: 'Lavanda',      emoji: '💜', color: '#8B6BA8', promptText: 'lavender purple fantasy skin' },
  { id: 'obsidian',    label: 'Obsidiana',    emoji: '🖤', color: '#1A0A1A', promptText: 'obsidian dark fantasy skin with slight iridescence' },
  { id: 'silver-sk',   label: 'Plateada',     emoji: '🩶', color: '#B0B8C8', promptText: 'metallic silver skin' },
  { id: 'albino',      label: 'Albina',       emoji: '🤍', color: '#FFF8F0', promptText: 'albino, extremely pale white skin, pink undertones, white hair' },
]

// ─── Eye Colors ──────────────────────────────────────────────────────
export const EYE_COLORS: ChipOption[] = [
  { id: 'dark-brown',  label: 'Marrón oscuro', emoji: '🟤', color: '#3B1F0F', promptText: 'deep dark brown eyes' },
  { id: 'brown',       label: 'Marrón',        emoji: '🟤', color: '#6B3D1E', promptText: 'warm brown eyes' },
  { id: 'hazel',       label: 'Avellana',      emoji: '🫒', color: '#8B7040', promptText: 'hazel eyes, green-brown mix' },
  { id: 'green',       label: 'Verde',         emoji: '🟢', color: '#2A7A40', promptText: 'green eyes' },
  { id: 'light-green', label: 'Verde claro',   emoji: '🟢', color: '#50B870', promptText: 'light clear green eyes' },
  { id: 'blue',        label: 'Azul',          emoji: '🔵', color: '#3A6BD4', promptText: 'blue eyes' },
  { id: 'light-blue',  label: 'Azul claro',    emoji: '🩵', color: '#7AB8E0', promptText: 'light clear blue eyes' },
  { id: 'gray',        label: 'Grises',        emoji: '🩶', color: '#7A8A98', promptText: 'gray eyes' },
  { id: 'black',       label: 'Negros',        emoji: '⚫', color: '#0A0A12', promptText: 'deep black eyes' },
  { id: 'amber',       label: 'Ámbar',         emoji: '🟠', color: '#D4820A', promptText: 'amber golden-brown eyes' },
  { id: 'gold',        label: 'Dorados',       emoji: '🥇', color: '#D4A800', promptText: 'glowing gold eyes' },
  { id: 'red',         label: 'Rojos',         emoji: '🔴', color: '#C0200A', promptText: 'glowing red eyes' },
  { id: 'silver',      label: 'Plateados',     emoji: '🩶', color: '#A8B8C8', promptText: 'silver metallic eyes' },
  { id: 'cyan',        label: 'Cyan',          emoji: '🩵', color: '#00B8D4', promptText: 'bright cyan eyes' },
  { id: 'violet',      label: 'Violeta',       emoji: '💜', color: '#7B3DB8', promptText: 'rare violet purple eyes' },
  { id: 'heterochromia',label:'Heterocromía',  emoji: '🎭', color: '#804080', promptText: 'heterochromia, one blue one brown eye' },
]

// ─── Eye Shapes ──────────────────────────────────────────────────────
export const EYE_SHAPES: ChipOption[] = [
  { id: 'almond',      label: 'Almendrado',    emoji: '👁️', promptText: 'almond-shaped eyes, classic proportions' },
  { id: 'round',       label: 'Redondo',       emoji: '👁️', promptText: 'large round open eyes' },
  { id: 'monolid',     label: 'Monopárpado',   emoji: '👁️', promptText: 'monolid eyes, no visible crease, East Asian features' },
  { id: 'hooded',      label: 'Con capucha',   emoji: '👁️', promptText: 'hooded eyes, heavy upper lid draping' },
  { id: 'cat-eye',     label: 'Felino',        emoji: '😺', promptText: 'cat-eye upturned outer corners, feline shape' },
  { id: 'wide-set',    label: 'Separados',     emoji: '👁️', promptText: 'wide-set eyes, farther apart than average' },
  { id: 'close-set',   label: 'Juntos',        emoji: '👁️', promptText: 'close-set eyes, closer together than average' },
  { id: 'deep-set',    label: 'Hundidos',      emoji: '👁️', promptText: 'deep-set eyes, set further back in the skull' },
  { id: 'downturned',  label: 'Caídos',        emoji: '👁️', promptText: 'downturned outer corners, soft melancholic look' },
  { id: 'protruding',  label: 'Prominentes',   emoji: '👁️', promptText: 'slightly protruding prominent eyes' },
  { id: 'narrow',      label: 'Estrechos',     emoji: '👁️', promptText: 'narrow slit eyes, sharp intense look' },
]

// ─── Nose Types ──────────────────────────────────────────────────────
export const NOSE_TYPES: ChipOption[] = [
  { id: 'straight',    label: 'Recta',         emoji: '👃', promptText: 'straight refined nose' },
  { id: 'button',      label: 'Respingada',    emoji: '🐽', promptText: 'small button nose, slightly upturned tip' },
  { id: 'aquiline',    label: 'Aguileña',      emoji: '🦅', promptText: 'aquiline Roman nose, slight bridge curve' },
  { id: 'wide',        label: 'Ancha',         emoji: '👃', promptText: 'wide broad nose with prominent nostrils' },
  { id: 'narrow',      label: 'Estrecha',      emoji: '👃', promptText: 'narrow slim nose' },
  { id: 'snub',        label: 'Corta y ancha', emoji: '🐽', promptText: 'short snub nose, wide with upturned tip' },
  { id: 'nubian',      label: 'Nubia',         emoji: '👃', promptText: 'Nubian long wide-bridged nose, slightly broader tip' },
  { id: 'celestial',   label: 'Celestial',     emoji: '🌙', promptText: 'celestial soft nose, small with upturned tip and defined tip' },
  { id: 'flat-broad',  label: 'Plana y amplia',emoji: '👃', promptText: 'flat broad nose with wide nostrils, low bridge' },
]

// ─── Lip Shapes ──────────────────────────────────────────────────────
export const LIP_SHAPES: ChipOption[] = [
  { id: 'full',        label: 'Carnosos',      emoji: '💋', promptText: 'full plump lips' },
  { id: 'thin',        label: 'Delgados',      emoji: '💋', promptText: 'thin delicate lips' },
  { id: 'cupid',       label: 'Arco de Cupido',emoji: '🏹', promptText: 'defined Cupid\'s bow upper lip, pronounced peaks' },
  { id: 'wide',        label: 'Amplios',       emoji: '😊', promptText: 'wide broad lips spanning the full face width' },
  { id: 'small',       label: 'Pequeños',      emoji: '🌸', promptText: 'small compact lips' },
  { id: 'pouty',       label: 'Puchero',       emoji: '😗', promptText: 'pouty protruding lips, natural pout' },
  { id: 'heart',       label: 'En corazón',    emoji: '❤️', promptText: 'heart-shaped lips with pronounced upper bow' },
  { id: 'natural',     label: 'Natural',       emoji: '💋', promptText: 'natural proportional lips' },
]

// ─── Face Shapes ─────────────────────────────────────────────────────
export const FACE_SHAPES: ChipOption[] = [
  { id: 'oval',        label: 'Ovalado',       emoji: '🥚', promptText: 'oval face shape, balanced proportions' },
  { id: 'round',       label: 'Redondo',       emoji: '🟠', promptText: 'round face shape, soft features, full cheeks' },
  { id: 'heart',       label: 'Corazón',       emoji: '💜', promptText: 'heart-shaped face, wide forehead, narrow chin' },
  { id: 'square',      label: 'Cuadrado',      emoji: '🟦', promptText: 'square face shape, strong jaw, equal width throughout' },
  { id: 'diamond',     label: 'Diamante',      emoji: '♦️', promptText: 'diamond face shape, prominent cheekbones, narrow forehead and jaw' },
  { id: 'oblong',      label: 'Alargado',      emoji: '🫒', promptText: 'long oblong face shape, narrow and elongated' },
  { id: 'triangle',    label: 'Triangular',    emoji: '🔺', promptText: 'triangular face shape, wider jaw than forehead' },
]

// ─── Jawline ─────────────────────────────────────────────────────────
export const JAWLINES: ChipOption[] = [
  { id: 'soft',        label: 'Suave',         emoji: '🫐', promptText: 'soft rounded jawline' },
  { id: 'defined',     label: 'Definida',      emoji: '💎', promptText: 'defined sharp jawline' },
  { id: 'angular',     label: 'Angulosa',      emoji: '🔷', promptText: 'angular squared jawline' },
  { id: 'chiseled',    label: 'Cincelada',     emoji: '🗿', promptText: 'chiseled razor-sharp jawline' },
  { id: 'pointed',     label: 'Puntiaguda',    emoji: '🔺', promptText: 'pointed delicate chin' },
  { id: 'rounded',     label: 'Redondeada',    emoji: '🟠', promptText: 'rounded soft chin' },
]

// ─── Eyebrows ─────────────────────────────────────────────────────────
export const EYEBROWS: ChipOption[] = [
  { id: 'thick-natural',label:'Gruesas natural', emoji: '🖤', promptText: 'thick natural bushy eyebrows' },
  { id: 'thin-arched',  label:'Finas en arco',   emoji: '🌙', promptText: 'thin arched eyebrows' },
  { id: 'straight',     label:'Rectas',           emoji: '➖', promptText: 'straight horizontal eyebrows, no arch' },
  { id: 'medium',       label:'Medianas',         emoji: '〰️', promptText: 'medium natural eyebrows with slight arch' },
  { id: 'feathered',    label:'Pluma',            emoji: '🪶', promptText: 'feathered textured eyebrows, brushed up' },
  { id: 's-brow',       label:'S-Brow',           emoji: '〽️', promptText: 'S-shaped eyebrows, flat then slight curve' },
  { id: 'high-arch',    label:'Arco alto',        emoji: '🌈', promptText: 'high arched dramatic eyebrows' },
  { id: 'unibrow',      label:'Unibrow',          emoji: '🦅', promptText: 'connected eyebrows, unibrow' },
]

// ─── Body Types ──────────────────────────────────────────────────────
export const BODY_TYPES: ChipOption[] = [
  { id: 'slim',          label: 'Delgada',       emoji: '🧍', promptText: 'slim lean body type, slender frame' },
  { id: 'petite',        label: 'Petite',        emoji: '🌸', promptText: 'petite small frame, delicate proportions' },
  { id: 'average',       label: 'Media',         emoji: '🧑', promptText: 'average proportional body type' },
  { id: 'athletic-fem',  label: 'Atlética',      emoji: '🏃', promptText: 'athletic toned female body, lean defined muscles' },
  { id: 'toned',         label: 'Tonificada',    emoji: '💪', promptText: 'toned fit body, visible muscle definition without bulk' },
  { id: 'curvy',         label: 'Con curvas',    emoji: '💃', promptText: 'curvy hourglass figure, defined waist with full hips and bust' },
  { id: 'hourglass',     label: 'Reloj de arena',emoji: '⏳', promptText: 'classic hourglass silhouette, equal bust and hips, very defined waist' },
  { id: 'pear',          label: 'En forma de pera',emoji:'🍐',promptText: 'pear-shaped body, narrower shoulders, wider hips' },
  { id: 'plus',          label: 'Plus size',     emoji: '🌺', promptText: 'plus size full figured body, confident presence' },
  { id: 'muscular-fem',  label: 'Musculosa',     emoji: '🏋️', promptText: 'muscular strong female body, athlete physique' },
  { id: 'muscular-masc', label: 'Musculoso',     emoji: '💪', promptText: 'muscular masculine bodybuilder physique' },
  { id: 'lean-masc',     label: 'Atlético',      emoji: '🏃', promptText: 'lean athletic male body, V-taper physique' },
  { id: 'broad',         label: 'Corpulento',    emoji: '🧊', promptText: 'broad shouldered stocky powerful build' },
  { id: 'tall-lean',     label: 'Alto y delgado',emoji: '📏', promptText: 'tall slim elongated model physique' },
]

// ─── Height ──────────────────────────────────────────────────────────
export const HEIGHTS: ChipOption[] = [
  { id: 'very-short',  label: 'Muy baja (<155)',  emoji: '🌱', promptText: 'very short stature, under 155cm' },
  { id: 'short',       label: 'Baja (155-163)',   emoji: '🌿', promptText: 'short 155-163cm height' },
  { id: 'average',     label: 'Media (163-173)',  emoji: '🌳', promptText: 'average height 163-173cm' },
  { id: 'tall',        label: 'Alta (173-183)',   emoji: '📏', promptText: 'tall 173-183cm height' },
  { id: 'very-tall',   label: 'Muy alta (>183)',  emoji: '🏔️', promptText: 'very tall over 183cm, model-like height' },
]

// ─── Bust / Chest ──────────────────────────────────────────────────
export const BUST_SIZES: ChipOption[] = [
  { id: 'flat',        label: 'Plano',        emoji: '▫️', promptText: 'BODY PROPORTION: completely flat chest, no bust at all, very slim upper body' },
  { id: 'small-bust',  label: 'Pequeño',      emoji: '🔹', promptText: 'BODY PROPORTION: small A-cup bust, subtle petite chest' },
  { id: 'medium-bust', label: 'Mediano',      emoji: '🔷', promptText: 'BODY PROPORTION: medium B/C-cup bust, proportional balanced chest' },
  { id: 'large-bust',  label: 'Grande',       emoji: '💎', promptText: 'BODY PROPORTION: large D-cup bust, full prominent chest clearly visible in clothing' },
  { id: 'very-large',  label: 'Muy grande',   emoji: '⭐', promptText: 'BODY PROPORTION: very large DD+ bust, voluptuous prominent chest that defines the silhouette' },
]

// ─── Hips / Glutes ─────────────────────────────────────────────────
export const HIP_SIZES: ChipOption[] = [
  { id: 'narrow-hips',  label: 'Estrechas',   emoji: '▫️', promptText: 'BODY PROPORTION: narrow slim hips, straight rectangular silhouette, minimal hip curve' },
  { id: 'medium-hips',  label: 'Medianas',    emoji: '🔹', promptText: 'BODY PROPORTION: medium proportional hips, moderate natural curve' },
  { id: 'wide-hips',    label: 'Anchas',      emoji: '🔷', promptText: 'BODY PROPORTION: wide hips, pronounced feminine hip curve, visible waist-to-hip ratio' },
  { id: 'round-glutes', label: 'Glúteos marcados', emoji: '🍑', promptText: 'BODY PROPORTION: round prominent glutes, defined sculpted rear, athletic lower body' },
  { id: 'full-hips',    label: 'Voluptuosas', emoji: '💎', promptText: 'BODY PROPORTION: full wide hips and large round glutes, dramatic hourglass lower body, very pronounced curves' },
]

// ─── Musculature ───────────────────────────────────────────────────
export const MUSCULATURE: ChipOption[] = [
  { id: 'soft',         label: 'Suave',        emoji: '☁️', promptText: 'BODY PROPORTION: soft body with no visible muscle definition, smooth rounded limbs' },
  { id: 'toned-light',  label: 'Ligeramente tonificado', emoji: '🌿', promptText: 'BODY PROPORTION: lightly toned body, subtle muscle definition visible on arms and legs, healthy fit look' },
  { id: 'toned-defined',label: 'Definido',     emoji: '💪', promptText: 'BODY PROPORTION: well defined muscles clearly visible, visible abs and arm definition, fitness model physique' },
  { id: 'muscular',     label: 'Musculoso/a',  emoji: '🏋️', promptText: 'BODY PROPORTION: muscular build, large defined muscles on arms chest and legs, bodybuilder physique' },
  { id: 'shredded',     label: 'Marcado (seco)',emoji: '⚡', promptText: 'BODY PROPORTION: shredded extremely low body fat, extreme muscle definition with vascularity visible, competition-ready body' },
]

// ─── Facial Hair (masculine) ───────────────────────────────────────
export const FACIAL_HAIR: ChipOption[] = [
  { id: 'clean-shaven', label: 'Afeitado',     emoji: '🧔‍♂️', promptText: 'clean shaven face, no facial hair' },
  { id: 'stubble',      label: 'Barba de 3 días', emoji: '🌑', promptText: 'short stubble, 3-day beard shadow, rugged look' },
  { id: 'short-beard',  label: 'Barba corta',  emoji: '🧔', promptText: 'short well-groomed beard, neatly trimmed' },
  { id: 'full-beard',   label: 'Barba completa',emoji: '🧔‍♂️', promptText: 'full thick beard, well-maintained' },
  { id: 'long-beard',   label: 'Barba larga',  emoji: '🧙', promptText: 'long flowing beard' },
  { id: 'goatee',       label: 'Perilla',      emoji: '▪️', promptText: 'goatee beard style, chin hair only' },
  { id: 'mustache',     label: 'Bigote',       emoji: '🥸', promptText: 'prominent mustache, no beard' },
  { id: 'handlebar',    label: 'Bigote manubrio', emoji: '🎭', promptText: 'handlebar mustache, curled ends, vintage style' },
  { id: 'sideburns',    label: 'Patillas',     emoji: '🔲', promptText: 'prominent sideburns, retro style' },
]

// ─── Skin Textures (fantastical) ─────────────────────────────────────
export const SKIN_TEXTURES: ChipOption[] = [
  { id: 'human',       label: 'Humana',    emoji: '🧑', promptText: 'natural human skin texture with visible pores and subtle imperfections' },
  { id: 'scales',      label: 'Escamas',   emoji: '🐉', promptText: 'iridescent reptilian scales' },
  { id: 'metallic',    label: 'Metálica',  emoji: '🤖', promptText: 'brushed chrome and titanium skin panels' },
  { id: 'crystal',     label: 'Cristal',   emoji: '💎', promptText: 'translucent crystalline skin with internal light refraction' },
  { id: 'ethereal',    label: 'Etérea',    emoji: '👻', promptText: 'translucent ethereal ghostly form with internal light glow' },
  { id: 'fur',         label: 'Pelaje',    emoji: '🐺', promptText: 'dense soft fur with individual strand rendering' },
  { id: 'bark',        label: 'Corteza',   emoji: '🌳', promptText: 'living bark and wood texture with deep fissures and moss' },
  { id: 'stone',       label: 'Piedra',    emoji: '🪨', promptText: 'volcanic basalt and granite stone surface' },
  { id: 'lava',        label: 'Lava',      emoji: '🌋', promptText: 'cracked lava rock surface with glowing magma veins' },
  { id: 'ice',         label: 'Hielo',     emoji: '❄️', promptText: 'frozen ice and frost crystalline texture, translucent blue-white' },
  { id: 'shadow',      label: 'Sombra',    emoji: '🌑', promptText: 'shadow made flesh, dark wisps, non-euclidean form' },
]

// ─── Genders ─────────────────────────────────────────────────────────
export const GENDERS: ChipOption[] = [
  { id: 'female',       label: 'Femenino',        emoji: '♀️', promptText: 'female' },
  { id: 'male',         label: 'Masculino',       emoji: '♂️', promptText: 'male' },
  { id: 'non-binary',   label: 'No binario',      emoji: '⚧️', promptText: 'non-binary androgynous' },
  { id: 'androgynous',  label: 'Andrógino',       emoji: '✦',  promptText: 'androgynous appearance, ambiguous gender presentation' },
  { id: 'masc-presenting',label:'Masc. presentación',emoji:'🧔',promptText:'masculine presenting, strong features' },
  { id: 'fem-presenting', label:'Fem. presentación', emoji:'💄',promptText:'feminine presenting, delicate features' },
]

// ─── Age Ranges ──────────────────────────────────────────────────────
export const AGE_RANGES: ChipOption[] = [
  { id: '18-22',   label: '18-22',    emoji: '🌱', promptText: '18-22 years old, youthful young adult face' },
  { id: '23-27',   label: '23-27',    emoji: '🌿', promptText: '23-27 years old, young adult' },
  { id: '28-32',   label: '28-32',    emoji: '🌳', promptText: '28-32 years old, adult' },
  { id: '33-37',   label: '33-37',    emoji: '🍂', promptText: '33-37 years old, mature young adult' },
  { id: '38-45',   label: '38-45',    emoji: '🏔️', promptText: '38-45 years old, mature, slight laugh lines' },
  { id: '46-55',   label: '46-55',    emoji: '🌊', promptText: '46-55 years old, distinguished, some age lines' },
  { id: '56-65',   label: '56-65',    emoji: '🌻', promptText: '56-65 years old, silver fox, graceful aging' },
  { id: 'ageless', label: 'Atemporal',emoji: '♾️', promptText: 'ageless timeless beauty, impossible to determine age' },
]

// ─── Personality Traits ──────────────────────────────────────────────
export const PERSONALITY_TRAITS: ChipOption[] = [
  { id: 'bold',         label: 'Audaz',          emoji: '🔥', promptText: 'bold confident expression and presence' },
  { id: 'mysterious',   label: 'Misteriosa',     emoji: '🎭', promptText: 'mysterious enigmatic gaze and aura' },
  { id: 'playful',      label: 'Juguetona',      emoji: '😄', promptText: 'playful fun energy and smile' },
  { id: 'intellectual', label: 'Intelectual',    emoji: '🧠', promptText: 'intellectual thoughtful demeanor, serious gaze' },
  { id: 'fierce',       label: 'Feroz',          emoji: '🐆', promptText: 'fierce powerful intimidating presence' },
  { id: 'gentle',       label: 'Dulce',          emoji: '🕊️', promptText: 'gentle soft serene kind aura' },
  { id: 'rebel',        label: 'Rebelde',        emoji: '⚡', promptText: 'rebellious defiant edgy attitude' },
  { id: 'elegant',      label: 'Elegante',       emoji: '👑', promptText: 'elegant refined graceful composure' },
  { id: 'adventurous',  label: 'Aventurera',     emoji: '🧭', promptText: 'adventurous daring energetic spirit' },
  { id: 'charismatic',  label: 'Carismática',    emoji: '✨', promptText: 'charismatic magnetic irresistible presence' },
  { id: 'stoic',        label: 'Estoica',        emoji: '🗿', promptText: 'stoic calm composed unreadable expression' },
  { id: 'dreamer',      label: 'Soñadora',       emoji: '☁️', promptText: 'dreamy distant ethereal faraway gaze' },
  { id: 'seductive',    label: 'Seductora',      emoji: '💫', promptText: 'seductive alluring sensual presence' },
  { id: 'warrior',      label: 'Guerrera',       emoji: '⚔️', promptText: 'warrior fierce battle-hardened intense look' },
  { id: 'innocent',     label: 'Inocente',       emoji: '🌸', promptText: 'innocent pure wide-eyed gentle expression' },
]

// ─── Fashion Styles ──────────────────────────────────────────────────
export const FASHION_STYLES: ChipOption[] = [
  { id: 'streetwear',    label: 'Streetwear',     emoji: '👟', promptText: 'urban streetwear fashion' },
  { id: 'high-fashion',  label: 'Alta moda',      emoji: '👗', promptText: 'high fashion editorial Vogue outfit' },
  { id: 'bohemian',      label: 'Bohemio',        emoji: '🌻', promptText: 'bohemian free-spirited flowing clothing' },
  { id: 'minimalist',    label: 'Minimalista',    emoji: '◻️', promptText: 'minimalist clean neutral outfit' },
  { id: 'y2k',           label: 'Y2K',            emoji: '💿', promptText: 'Y2K 2000s nostalgic aesthetic' },
  { id: 'dark-academia', label: 'Dark academia',  emoji: '📚', promptText: 'dark academia scholarly vintage outfit' },
  { id: 'cottagecore',   label: 'Cottagecore',    emoji: '🌾', promptText: 'cottagecore pastoral floral clothing' },
  { id: 'cyberpunk',     label: 'Cyberpunk',      emoji: '🔮', promptText: 'cyberpunk futuristic neon outfit' },
  { id: 'old-money',     label: 'Old money',      emoji: '💰', promptText: 'old money quiet luxury elevated basics' },
  { id: 'avant-garde',   label: 'Avant-garde',    emoji: '🎨', promptText: 'avant-garde experimental deconstructed fashion' },
  { id: 'athleisure',    label: 'Athleisure',     emoji: '🏋️', promptText: 'athleisure sporty activewear' },
  { id: 'gothic',        label: 'Gótico',         emoji: '🖤', promptText: 'gothic dark dramatic clothing' },
  { id: 'coquette',      label: 'Coquette',       emoji: '🎀', promptText: 'coquette ultra feminine bows lace ribbons' },
  { id: 'grunge',        label: 'Grunge',         emoji: '🎸', promptText: 'grunge distressed layered plaid' },
  { id: 'techwear',      label: 'Techwear',       emoji: '⚙️', promptText: 'techwear tactical functional futuristic gear' },
  { id: 'retro-70s',     label: 'Retro 70s',      emoji: '🕺', promptText: 'retro 70s vintage bell-bottoms and earth tones' },
  { id: 'kawaii',        label: 'Kawaii',         emoji: '🍡', promptText: 'kawaii cute Japanese street fashion Harajuku' },
  { id: 'western',       label: 'Western',        emoji: '🤠', promptText: 'western cowboy boots and denim' },
  { id: 'fantasy-armor', label: 'Armadura',       emoji: '🛡️', promptText: 'ornate fantasy battle armor' },
  { id: 'sci-fi-suit',   label: 'Sci-fi',         emoji: '🚀', promptText: 'sci-fi futuristic space suit' },
  { id: 'royal',         label: 'Real / Regal',   emoji: '👑', promptText: 'royal regal court clothing, gown and crown' },
  { id: 'business',      label: 'Ejecutiva',      emoji: '💼', promptText: 'power business attire, sharp suit or blazer' },
  { id: 'casual-chic',   label: 'Casual chic',    emoji: '✨', promptText: 'casual chic effortless polished everyday look' },
  { id: 'beach',         label: 'Playa',          emoji: '🏖️', promptText: 'beach resort wear, sundress or swimwear cover' },
  { id: 'punk',          label: 'Punk',           emoji: '🤘', promptText: 'punk rock leather studs ripped clothing safety pins' },
  { id: 'preppy',        label: 'Preppy',         emoji: '🎓', promptText: 'preppy polo sweater vest khakis ivy league' },
  { id: 'e-girl',        label: 'E-Girl',         emoji: '⛓️', promptText: 'e-girl aesthetic, chain accessories, dark eyeliner, oversized band tees' },
  { id: 'soft-girl',     label: 'Soft Girl',      emoji: '🧸', promptText: 'soft girl aesthetic, pastel colors, fluffy knits, cute accessories' },
  { id: 'baddie',        label: 'Baddie',         emoji: '🔥', promptText: 'baddie aesthetic, bodycon, heels, bold makeup, snatched look' },
  { id: 'clean-girl',    label: 'Clean Girl',     emoji: '🧼', promptText: 'clean girl aesthetic, slicked back hair, gold hoops, neutral tones, dewy skin' },
  { id: 'mob-wife',      label: 'Mob Wife',       emoji: '🦊', promptText: 'mob wife aesthetic, fur coat, gold jewelry, bold lip, sunglasses, luxury' },
  { id: 'balletcore',    label: 'Balletcore',     emoji: '🩰', promptText: 'balletcore leg warmers wrap top ballet flats tulle' },
  { id: 'coastal',       label: 'Coastal',        emoji: '🐚', promptText: 'coastal grandmother aesthetic, linen, white and beige, sea breeze casual' },
  { id: 'lingerie',      label: 'Lencería',       emoji: '🩱', promptText: 'luxury lingerie, lace details, delicate fabrics, boudoir style' },
  { id: 'swimwear',      label: 'Swimwear',       emoji: '👙', promptText: 'designer swimwear, bikini or one-piece, poolside luxury' },
  { id: 'formal-gala',   label: 'Gala',           emoji: '🥂', promptText: 'formal black tie gala gown or tuxedo, red carpet elegance' },
  { id: 'leather',       label: 'Full Leather',   emoji: '🖤', promptText: 'head to toe leather outfit, edgy motorcycle chic' },
  { id: 'denim',         label: 'Full Denim',     emoji: '👖', promptText: 'full denim outfit, Canadian tuxedo, denim on denim' },
  { id: 'monochrome',    label: 'Monocromático',  emoji: '⬛', promptText: 'monochromatic single color outfit head to toe' },
  { id: 'neon-rave',     label: 'Neon / Rave',    emoji: '💚', promptText: 'neon rave festival wear, UV reactive, bright colors, mesh' },
  { id: 'oversized',     label: 'Oversized',      emoji: '🧸', promptText: 'oversized everything, baggy streetwear, relaxed fit' },
  { id: 'haute-couture', label: 'Haute Couture',  emoji: '👑', promptText: 'haute couture runway fashion, one-of-a-kind designer piece' },
  { id: 'uniform',       label: 'Uniforme',       emoji: '👔', promptText: 'professional uniform, military or school or nurse uniform' },
]

// ─── Accessories ─────────────────────────────────────────────────────
export const ACCESSORIES: ChipOption[] = [
  { id: 'sunglasses',  label: 'Gafas de sol',  emoji: '🕶️', promptText: 'wearing stylish sunglasses' },
  { id: 'piercings',   label: 'Piercings',      emoji: '💎', promptText: 'with multiple piercings' },
  { id: 'tattoos',     label: 'Tatuajes',       emoji: '🎨', promptText: 'with visible artistic tattoos' },
  { id: 'jewelry',     label: 'Joyería',        emoji: '💍', promptText: 'wearing elegant fine jewelry' },
  { id: 'hat',         label: 'Sombrero',       emoji: '🎩', promptText: 'wearing a stylish hat' },
  { id: 'scarf',       label: 'Bufanda',        emoji: '🧣', promptText: 'wearing a fashionable scarf' },
  { id: 'watch',       label: 'Reloj',          emoji: '⌚', promptText: 'wearing a luxury watch' },
  { id: 'choker',      label: 'Gargantilla',    emoji: '📿', promptText: 'wearing a choker necklace' },
  { id: 'crown',       label: 'Corona / Tiara', emoji: '👑', promptText: 'wearing an ornate crown or tiara' },
  { id: 'mask',        label: 'Máscara',        emoji: '🎭', promptText: 'wearing a decorative masquerade mask' },
  { id: 'wings',       label: 'Alas',           emoji: '🪽', promptText: 'with large ornate feathered wings' },
  { id: 'horns',       label: 'Cuernos',        emoji: '🦌', promptText: 'with dramatic horns growing from head' },
  { id: 'elf-ears',    label: 'Orejas de elfo', emoji: '🧝', promptText: 'with elegant pointed elf ears' },
  { id: 'tail',        label: 'Cola',           emoji: '🦊', promptText: 'with a long elegant tail' },
  { id: 'freckles',    label: 'Pecas',          emoji: '✨', promptText: 'with natural freckles across nose and cheeks' },
  { id: 'beauty-mark', label: 'Lunar',          emoji: '🖤', promptText: 'with a beauty mark mole on face' },
  { id: 'scar',        label: 'Cicatriz',       emoji: '⚡', promptText: 'with a distinctive facial scar' },
  { id: 'glowing-markings',label:'Marcas brillantes',emoji:'💫',promptText:'with glowing mystical markings on skin' },
  // ── More Accessories ──
  { id: 'headband',     label: 'Diadema',        emoji: '👸', promptText: 'wearing a stylish headband or hair accessory' },
  { id: 'bandana',      label: 'Bandana',        emoji: '🧣', promptText: 'wearing a bandana tied on head or neck' },
  { id: 'glasses',      label: 'Lentes',         emoji: '👓', promptText: 'wearing fashion glasses, clear or tinted lenses' },
  { id: 'earrings-big', label: 'Aretes grandes', emoji: '💎', promptText: 'wearing large statement earrings' },
  { id: 'chain',        label: 'Cadena',         emoji: '⛓️', promptText: 'wearing a thick chain necklace, hip-hop or punk style' },
  { id: 'veil',         label: 'Velo',           emoji: '🤍', promptText: 'wearing a delicate lace or tulle veil' },
  { id: 'flowers-hair', label: 'Flores en pelo', emoji: '🌺', promptText: 'with fresh flowers woven into hair' },
  { id: 'backpack',     label: 'Mochila',        emoji: '🎒', promptText: 'carrying a stylish designer backpack' },
  { id: 'handbag',      label: 'Bolso',          emoji: '👜', promptText: 'carrying a luxury designer handbag' },
  { id: 'cigarette',    label: 'Cigarrillo',     emoji: '🚬', promptText: 'holding an unlit cigarette, editorial pose' },
  { id: 'umbrella',     label: 'Paraguas',       emoji: '☂️', promptText: 'holding a stylish umbrella' },
  { id: 'fan',          label: 'Abanico',        emoji: '🪭', promptText: 'holding an ornate folding fan' },
  // ── Fantasy / Fantasia ──
  { id: 'halo',         label: 'Aureola',        emoji: '😇', promptText: 'with a luminous golden halo floating above head' },
  { id: 'demon-horns',  label: 'Cuernos demonio',emoji: '😈', promptText: 'with dark curved demon horns, hellish aesthetic' },
  { id: 'fangs',        label: 'Colmillos',      emoji: '🧛', promptText: 'with sharp vampire fangs visible' },
  { id: 'third-eye',    label: 'Tercer ojo',     emoji: '🔮', promptText: 'with a mystical third eye on forehead' },
  { id: 'mermaid-scales',label:'Escamas sirena', emoji: '🧜', promptText: 'with iridescent mermaid scales on skin' },
  { id: 'cyber-implants',label:'Implantes cyber',emoji: '🤖', promptText: 'with visible cybernetic implants and LED elements on skin' },
  { id: 'crystal-skin', label: 'Piel de cristal',emoji: '💎', promptText: 'with crystalline translucent skin patches, gemstone-like' },
  { id: 'fire-aura',    label: 'Aura de fuego',  emoji: '🔥', promptText: 'surrounded by a fiery aura, flames emanating from body' },
  { id: 'ice-frost',    label: 'Hielo / Escarcha',emoji:'❄️', promptText: 'with frost and ice crystals forming on skin and hair' },
  { id: 'shadow-tendrils',label:'Sombras vivas', emoji: '🌑', promptText: 'with living shadow tendrils extending from body' },
  { id: 'butterfly-wings',label:'Alas mariposa', emoji: '🦋', promptText: 'with large delicate butterfly wings, iridescent colors' },
  { id: 'antlers',      label: 'Astas',          emoji: '🦌', promptText: 'with majestic deer antlers growing from head, decorated with flowers' },
  { id: 'floating-orbs', label: 'Orbes flotantes',emoji: '🔮', promptText: 'with mystical glowing orbs floating around body' },
  { id: 'mechanical-limbs',label:'Brazos mecánicos',emoji:'🦾',promptText: 'with visible mechanical prosthetic arms or legs, steampunk or sci-fi' },
]

// ─── Build prompt from chip selections ───────────────────────────────
export function buildPromptFromChips(selections: Record<string, string[]>): string {
  const allChips: Record<string, ChipOption[]> = {
    ethnicity:    ETHNICITIES,
    hairStyle:    HAIR_STYLES,
    hairColor:    HAIR_COLORS,
    skinTone:     SKIN_TONES,
    eyeColor:     EYE_COLORS,
    eyeShape:     EYE_SHAPES,
    noseType:     NOSE_TYPES,
    lipShape:     LIP_SHAPES,
    faceShape:    FACE_SHAPES,
    jawline:      JAWLINES,
    eyebrows:     EYEBROWS,
    bodyType:     BODY_TYPES,
    height:       HEIGHTS,
    bust:         BUST_SIZES,
    hips:         HIP_SIZES,
    musculature:  MUSCULATURE,
    facialHair:   FACIAL_HAIR,
    skinTexture:  SKIN_TEXTURES,
    gender:       GENDERS,
    age:          AGE_RANGES,
    personality:  PERSONALITY_TRAITS,
    fashion:      FASHION_STYLES,
    accessories:  ACCESSORIES,
  }

  const parts: string[] = []
  for (const [category, selectedIds] of Object.entries(selections)) {
    const chips = allChips[category]
    if (!chips) continue
    for (const id of selectedIds) {
      const chip = chips.find(c => c.id === id)
      if (chip) parts.push(chip.promptText)
    }
  }

  return parts.join(', ')
}
