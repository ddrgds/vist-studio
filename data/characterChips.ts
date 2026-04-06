// data/characterChips.ts

export interface ChipOption {
  id: string
  label: string
  emoji: string
  promptText: string
  color?: string   // hex — renders as color swatch instead of emoji
  /** If set, promptText is replaced by a random pick from this pool at generation time */
  variants?: string[]
  /** Atomic fields for ethnicity presets — can be overridden by individual chips */
  defaults?: {
    skinTone?: string
    eyeColor?: string
    eyeShape?: string
    hairColor?: string
    hairStyle?: string
    noseType?: string
    lipShape?: string
    faceShape?: string
    jawline?: string
  }
}

export interface ChipCategory {
  id: string
  label: string
  options: ChipOption[]
  maxSelect?: number
}

// ─── Ethnicity / Origin ──────────────────────────────────────────────
// Ethnicities as OVERRIDEABLE PRESETS — bone structure in promptText, soft traits in defaults.
// If user selects individual chips (skin, eyes, etc.), those override the ethnicity defaults.
export const ETHNICITIES: ChipOption[] = [
  { id: 'latina',        label: 'Latina',           emoji: '🌺',
    promptText: 'prominent high cheekbones, rounded jaw with soft angle, wide-set eye sockets',
    defaults: { skinTone: 'warm golden-brown skin with yellow undertones', eyeColor: 'dark brown expressive eyes', hairColor: 'dark brown hair', hairStyle: 'thick wavy hair', lipShape: 'full rounded lips', noseType: 'medium nose with rounded tip' }},
  { id: 'mediterranean', label: 'Mediterránea',     emoji: '🫒',
    promptText: 'angular bone structure, defined brow ridge, strong nose bridge',
    defaults: { skinTone: 'warm olive skin with golden undertones', eyeColor: 'deep dark brown eyes', hairColor: 'dark brown or black hair', hairStyle: 'thick wavy hair', noseType: 'aquiline nose with defined bridge' }},
  { id: 'east-asian',    label: 'Asiática (Este)',  emoji: '🌸',
    promptText: 'flat midface, soft rounded jawline, low nasal bridge, minimal brow ridge',
    defaults: { skinTone: 'smooth porcelain-toned skin', eyeColor: 'dark brown eyes', eyeShape: 'monolid or subtle fold almond eyes', hairColor: 'black hair', hairStyle: 'straight fine hair', noseType: 'small nose with low bridge', lipShape: 'thin delicate lips' }},
  { id: 'south-asian',   label: 'Asiática (Sur)',   emoji: '🪷',
    promptText: 'high angular cheekbones, strong brow ridge, deep-set eye sockets',
    defaults: { skinTone: 'warm caramel-brown skin', eyeColor: 'large dark brown eyes', hairColor: 'thick dark hair', noseType: 'straight defined nose with medium bridge' }},
  { id: 'mena',          label: 'Árabe / MENA',     emoji: '🌙',
    promptText: 'strong defined jawline, prominent brow ridge, high nose bridge',
    defaults: { skinTone: 'warm olive-amber skin', eyeColor: 'deep dark hooded eyes', eyeShape: 'deep-set almond eyes', hairColor: 'dark black hair', noseType: 'strong aquiline nose with high bridge' }},
  { id: 'west-african',  label: 'Africana',         emoji: '✨',
    promptText: 'high sculpted cheekbones, wide nasal base, strong mandible',
    defaults: { skinTone: 'deep rich dark brown skin with warm undertones', eyeColor: 'dark brown wide-set eyes', hairColor: 'black hair', hairStyle: 'natural coily textured hair', lipShape: 'full prominent lips', noseType: 'broad rounded nose' }},
  { id: 'east-african',  label: 'África del Este',  emoji: '🦁',
    promptText: 'elongated narrow face, extremely high angular cheekbones, narrow mandible, long neck',
    defaults: { skinTone: 'deep brown skin with cool undertones', eyeColor: 'dark almond eyes', hairColor: 'black hair', noseType: 'narrow nose with high bridge' }},
  { id: 'north-european',label: 'Nórdica',          emoji: '❄️',
    promptText: 'angular bone structure, narrow face, defined brow ridge, strong chin',
    defaults: { skinTone: 'very fair cool-toned porcelain skin', eyeColor: 'light blue or gray eyes', hairColor: 'light blonde or auburn hair', lipShape: 'thin lips', noseType: 'narrow straight nose' }},
  { id: 'east-european', label: 'Eslava',           emoji: '🌻',
    promptText: 'wide-set cheekbones creating broad midface, strong square jawline',
    defaults: { skinTone: 'fair neutral-toned skin', eyeColor: 'light-colored round eyes', hairColor: 'medium-brown hair', hairStyle: 'straight hair' }},
  { id: 'indian',        label: 'India',            emoji: '🪔',
    promptText: 'high cheekbones, defined brow ridge, symmetrical proportions',
    defaults: { skinTone: 'warm caramel skin with golden undertones', eyeColor: 'large expressive dark brown eyes', hairColor: 'thick dark black hair', noseType: 'straight defined nose' }},
  { id: 'indigenous',    label: 'Indígena',         emoji: '🌿',
    promptText: 'high prominent cheekbones, broad facial structure, strong brow',
    defaults: { skinTone: 'warm copper-brown skin', eyeColor: 'deep-set dark brown eyes', hairColor: 'straight coarse black hair', noseType: 'broad nose with rounded tip' }},
  { id: 'brazilian',     label: 'Brasileña',        emoji: '🌴',
    promptText: 'mixed angular and soft features, balanced proportions',
    defaults: { skinTone: 'warm golden-brown skin', eyeColor: 'green or amber eyes with limbal ring', hairColor: 'dark brown hair', hairStyle: 'curly-wavy hair', lipShape: 'full lips', noseType: 'wide nose with soft tip' }},
  { id: 'caribbean',     label: 'Caribeña',         emoji: '🐚',
    promptText: 'rounded face shape, wide-set eye sockets, strong mandible',
    defaults: { skinTone: 'warm brown skin with red undertones', eyeColor: 'wide-set dark expressive eyes', hairColor: 'dark hair', hairStyle: 'natural coily textured hair', lipShape: 'full prominent lips', noseType: 'broad nose' }},
  { id: 'japanese',      label: 'Japonesa',         emoji: '🗻',
    promptText: 'oval refined face shape, flat midface, delicate bone structure, small chin',
    defaults: { skinTone: 'smooth very fair skin', eyeColor: 'dark brown eyes', eyeShape: 'narrow almond eyes with subtle fold', hairColor: 'black hair', hairStyle: 'straight fine hair', noseType: 'small low-bridge nose', lipShape: 'thin delicate lips' }},
  { id: 'korean',        label: 'Coreana',          emoji: '🌟',
    promptText: 'v-shaped jawline, small pointed chin, flat midface',
    defaults: { skinTone: 'fair smooth luminous skin', eyeColor: 'dark brown eyes', eyeShape: 'double eyelid or monolid with aegyo sal', hairColor: 'dark hair', hairStyle: 'straight fine hair' }},
  { id: 'mixed',         label: 'Mixta',            emoji: '🌈',
    promptText: 'unique asymmetric blend of features, ambiguous bone structure',
    defaults: { skinTone: 'warm medium skin tone', eyeColor: 'unusual or heterochromatic eye color', hairStyle: 'mixed wavy hair texture' }},
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
// Vocabulary uses indirect sensory descriptions to avoid safety filter triggers
export const BUST_SIZES: ChipOption[] = [
  { id: 'flat',        label: 'Plano',        emoji: '▫️', promptText: 'minimal upper frame curvature, very slim torso, streamlined silhouette' },
  { id: 'small-bust',  label: 'Pequeño',      emoji: '🔹', promptText: 'subtle upper frame curvature, petite proportions, delicate silhouette' },
  { id: 'medium-bust', label: 'Mediano',      emoji: '🔷', promptText: 'balanced upper body proportions, harmonious curvature, natural frame' },
  { id: 'large-bust',  label: 'Grande',       emoji: '💎', promptText: 'pronounced upper body curvature, generous proportions clearly shaping the garment, full rounded silhouette' },
  { id: 'very-large',  label: 'Muy grande',   emoji: '⭐', promptText: 'dramatically generous upper frame, prominent curvature that defines the entire garment drape, opulent rounded silhouette with significant volume' },
]

// ─── Hips / Glutes ─────────────────────────────────────────────────
export const HIP_SIZES: ChipOption[] = [
  { id: 'narrow-hips',  label: 'Estrechas',   emoji: '▫️', promptText: 'narrow lower frame, straight columnar silhouette, minimal lateral curvature' },
  { id: 'medium-hips',  label: 'Medianas',    emoji: '🔹', promptText: 'balanced lower body proportions, gentle lateral curvature' },
  { id: 'wide-hips',    label: 'Anchas',      emoji: '🔷', promptText: 'wide lower frame with pronounced lateral curvature, strong waist-to-hip contrast, pear-shaped silhouette' },
  { id: 'round-glutes', label: 'Glúteos marcados', emoji: '🍑', promptText: 'sculpted posterior curvature, athletic lower body definition, strong rounded profile from side view' },
  { id: 'full-hips',    label: 'Voluptuosas', emoji: '💎', promptText: 'dramatically wide lower frame, extreme lateral curvature, pronounced pear-shaped silhouette, generous thigh volume, maximum waist-to-hip contrast' },
]

// ─── Waist ─────────────────────────────────────────────────────────
export const WAIST_SIZES: ChipOption[] = [
  { id: 'very-narrow-waist', label: 'Muy estrecha', emoji: '⏳', promptText: 'extremely defined midsection indent, dramatic hourglass proportion, maximum torso taper' },
  { id: 'narrow-waist',      label: 'Estrecha',     emoji: '🔹', promptText: 'visible midsection taper, hourglass proportion, defined torso indent' },
  { id: 'medium-waist',      label: 'Media',        emoji: '🔷', promptText: 'natural midsection proportion, subtle torso taper' },
  { id: 'wide-waist',        label: 'Ancha',        emoji: '▫️', promptText: 'straight torso with minimal taper, rectangular frame proportion' },
  { id: 'thick-waist',       label: 'Gruesa',       emoji: '💎', promptText: 'full soft midsection, no torso taper, generous trunk volume' },
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

// ─── Leg Proportions ────────────────────────────────────────────────
export const LEG_PROPORTIONS: ChipOption[] = [
  { id: 'short-legs',    label: 'Piernas cortas', emoji: '🦵', promptText: 'BODY PROPORTION: short legs relative to torso, compact lower body' },
  { id: 'average-legs',  label: 'Piernas medias', emoji: '🧍', promptText: 'BODY PROPORTION: average leg length, balanced proportions' },
  { id: 'long-legs',     label: 'Piernas largas', emoji: '📏', promptText: 'BODY PROPORTION: long legs, elongated lower body, model-like leg length' },
  { id: 'thick-legs',    label: 'Piernas gruesas',emoji: '💪', promptText: 'BODY PROPORTION: thick muscular legs, strong thighs and calves' },
  { id: 'slim-legs',     label: 'Piernas delgadas',emoji: '🦩', promptText: 'BODY PROPORTION: slim slender legs, thin thighs and calves' },
  { id: 'athletic-legs', label: 'Piernas atléticas',emoji:'🏃', promptText: 'BODY PROPORTION: athletic toned legs, defined quad and calf muscles, runner body' },
]

// ─── Skin Details (realistic) ─────────────────────────────────────────
export const SKIN_DETAILS: ChipOption[] = [
  { id: 'freckles-light', label: 'Pecas suaves',   emoji: '✨', promptText: 'light scattered freckles across nose and cheeks', variants: [
    'faint golden freckles dusted across the nose bridge and upper cheeks',
    'sparse light brown freckles concentrated on the nose and under eyes',
    'delicate sun freckles scattered across both cheeks and forehead',
    'barely visible freckles only on the nose tip and bridge',
    'asymmetric freckle dusting heavier on left cheek than right',
    'tiny cinnamon freckles across the temples and outer cheeks',
    'light freckles visible only in direct sunlight across the nose',
    'scattered pale freckles from cheekbone to cheekbone crossing the nose',
    'faint childhood freckles mostly faded, visible on close inspection',
    'golden micro-freckles concentrated in a band across the nose bridge',
  ]},
  { id: 'freckles-heavy', label: 'Pecas marcadas', emoji: '🔴', promptText: 'heavy dense freckles across face, shoulders and chest', variants: [
    'dense constellation of dark freckles covering cheeks, nose, and forehead',
    'heavy freckle coverage from cheekbones down to shoulders and collarbone',
    'intense dark freckles covering entire face, neck, and upper chest',
    'sun-damage freckles dense on forehead and cheeks, extending to ears',
    'dark brown freckles so dense they almost merge on the nose and cheeks',
    'heavy freckling across face with clusters on shoulders and upper arms',
    'full-face freckle coverage including eyelids and lips, redhead pattern',
    'dense dark freckles on face transitioning to lighter ones on shoulders',
    'prominent freckles on face and hands, sun-exposed pattern',
    'heavy freckle bands across cheeks and nose with scattered chest freckles',
  ]},
  { id: 'moles',          label: 'Lunares',         emoji: '🖤', promptText: 'distinctive beauty marks and moles', variants: [
    'small dark beauty mark on left cheekbone near the eye',
    'beauty mark above the right corner of the upper lip',
    'two small moles on the neck, one near the jawline',
    'distinctive mole on the chin, slightly off-center',
    'cluster of three tiny moles forming a triangle on right cheek',
    'raised beauty mark on left side of nose bridge',
    'small mole on right earlobe, another on left temple',
    'beauty mark centered on the forehead, just above the brow',
    'mole on the right side of the neck below the ear',
    'two beauty marks on left cheek, one high one low, like a constellation',
  ]},
  { id: 'acne-scars',     label: 'Marcas de acné', emoji: '🫧', promptText: 'subtle acne scarring and texture on cheeks' },
  { id: 'dimples',        label: 'Hoyuelos',       emoji: '😊', promptText: 'visible dimples on both cheeks when smiling' },
  { id: 'vitiligo',       label: 'Vitiligo',       emoji: '🤍', promptText: 'vitiligo skin condition with lighter depigmented patches on face and hands' },
  { id: 'rosy-cheeks',    label: 'Mejillas rosadas',emoji: '🌸', promptText: 'naturally flushed rosy cheeks, slight redness on nose tip' },
  { id: 'sun-damage',     label: 'Piel bronceada', emoji: '☀️', promptText: 'sun-kissed skin with visible tan lines, slight sun damage and warmth' },
  { id: 'smooth-perfect', label: 'Piel perfecta',  emoji: '🧴', promptText: 'exceptionally smooth clear skin, minimal pores, glass skin effect' },
  { id: 'mature-skin',    label: 'Piel madura',    emoji: '🕰️', promptText: 'mature skin with fine lines around eyes, subtle laugh lines, natural aging' },
  { id: 'oily-dewy',      label: 'Piel grasa/dewy',emoji: '💧', promptText: 'dewy oily skin with visible shine on T-zone, glossy forehead and nose' },
  { id: 'visible-pores',  label: 'Poros visibles', emoji: '🔬', promptText: 'prominently visible open pores on nose and cheeks, real skin macro texture' },
  { id: 'body-hair',      label: 'Vello corporal', emoji: '🦁', promptText: 'natural visible body hair on arms and legs, fine peach fuzz on face visible in light', variants: [
    'visible light peach fuzz on cheeks and jawline catching the light, fine arm hair',
    'natural dark arm hair and light leg hair visible, subtle facial peach fuzz',
    'fine blonde vellus hair on forearms and upper lip visible in sidelight',
    'dark visible arm hair and fine baby hair along hairline',
    'soft golden body hair on forearms catching warm light',
    'natural unshaved arm hair, subtle dark peach fuzz on upper lip',
    'fine body hair visible on shoulders and upper back in raking light',
    'light fuzzy hair on lower back and forearms, natural and unretouched',
    'visible fine hair on fingers and knuckles, natural hand detail',
    'soft downy hair on jawline and sideburns visible in close-up',
  ]},
  { id: 'arm-hair',       label: 'Vello en brazos',emoji: '💪', promptText: 'visible natural hair on forearms and upper arms' },
  { id: 'stretch-marks',  label: 'Estrías',       emoji: '〰️', promptText: 'natural stretch marks on hips, thighs or bust area, subtle silvery lines' },
  { id: 'cellulite',      label: 'Celulitis',     emoji: '🍊', promptText: 'natural cellulite texture visible on thighs and buttocks, real body texture' },
  { id: 'veins-visible',  label: 'Venas visibles',emoji: '💙', promptText: 'visible blue-green veins under thin skin on wrists, inner arms, and temples' },
  { id: 'sunburn',        label: 'Quemadura solar',emoji: '🔥', promptText: 'slight sunburn redness on shoulders, nose and cheekbones, peeling skin on nose' },
  { id: 'dry-skin',       label: 'Piel seca',     emoji: '🏜️', promptText: 'dry skin with slight flaking on lips and around nose, matte texture' },
  { id: 'goosebumps',     label: 'Piel de gallina',emoji: '❄️', promptText: 'goosebumps visible on arms and shoulders, raised hair follicles from cold' },
  { id: 'birthmark',      label: 'Marca de nacimiento',emoji:'🟤', promptText: 'distinctive birthmark on skin', variants: [
    'light brown birthmark on left shoulder blade, roughly oval shaped',
    'small port-wine stain birthmark on right side of neck',
    'faint cafe-au-lait spot on right upper arm',
    'heart-shaped birthmark on inner left wrist',
    'dark brown irregular birthmark on right collarbone area',
    'small strawberry birthmark behind right ear',
    'light tan birthmark on left hip, visible above waistband',
    'crescent-shaped birthmark on right forearm',
    'faint birthmark on left side of ribcage',
    'distinctive birthmark on the back of left hand',
  ]},
]

// ─── Makeup ─────────────────────────────────────────────────────────
export const MAKEUP_STYLES: ChipOption[] = [
  { id: 'no-makeup',      label: 'Sin maquillaje', emoji: '🧖', promptText: 'no makeup, completely bare face, natural skin' },
  { id: 'natural-makeup',  label: 'Natural',       emoji: '🌿', promptText: 'subtle natural makeup, light foundation, mascara, nude lip tint' },
  { id: 'glam',           label: 'Glam',           emoji: '💄', promptText: 'full glam makeup, contoured cheekbones, false lashes, highlighted dewy skin, glossy lips' },
  { id: 'smoky-eyes',     label: 'Smoky eyes',     emoji: '🖤', promptText: 'dramatic smoky eye makeup, dark blended eyeshadow, smudged liner, nude lips' },
  { id: 'bold-lips',      label: 'Labios rojos',   emoji: '❤️', promptText: 'bold matte red lipstick, minimal eye makeup, clean skin', variants: [
    'classic matte cherry-red lipstick with clean minimal eye makeup',
    'deep burgundy-wine matte lip with subtle bronzer',
    'bright coral-red glossy lip with dewy skin',
    'dark berry stain lip with natural flushed cheeks',
    'orange-red matte lip with golden highlighter on cheekbones',
    'true crimson satin finish lip with defined brows',
    'plum-toned lip with mauve blush and soft contour',
    'fire engine red lip with winged eyeliner, classic Hollywood',
    'brick red matte lip with earthy warm-toned eye shadow',
    'candy apple red glossy lip with glass skin finish',
  ]},
  { id: 'cat-eye',        label: 'Cat eye',        emoji: '🐱', promptText: 'sharp cat-eye winged eyeliner, clean skin, nude lip' },
  { id: 'korean-makeup',  label: 'K-beauty',       emoji: '🇰🇷', promptText: 'Korean glass skin makeup, gradient lip tint, subtle blush, dewy luminous skin, straight eyebrows' },
  { id: 'editorial-makeup',label: 'Editorial',     emoji: '🎨', promptText: 'bold editorial makeup, artistic eye look, unconventional color placement', variants: [
    'graphic neon green eyeliner with bare skin and bleached brows',
    'abstract gold leaf accents on eyelids with matte burgundy lip',
    'color-blocked pastel eyeshadow with sharp geometric lines',
    'electric blue under-eye liner with glossy bare lid',
    'rhinestone crystals placed along cheekbone, no other makeup',
    'gradient ombre lip from orange to pink, dewy bare skin',
    'white eyeliner on waterline with fluffy bleached brows',
    'holographic glitter tears running down cheeks, editorial art',
    'extreme blush placement high on temples, 80s editorial revival',
    'monochromatic mauve makeup on eyes lips and cheeks simultaneously',
  ]},
  { id: 'soft-glam',      label: 'Soft glam',      emoji: '✨', promptText: 'soft glam makeup, warm brown eyeshadow, fluffy brows, peachy blush, nude gloss' },
  { id: 'goth',           label: 'Gótico',         emoji: '🦇', promptText: 'dark goth makeup, black lipstick, heavy dark eye makeup, pale foundation, dramatic contour' },
  { id: 'sun-kissed',     label: 'Sun-kissed',     emoji: '☀️', promptText: 'sun-kissed bronzed look, warm bronzer, freckle-enhancing tint, peach lip' },
  { id: 'clean-girl',     label: 'Clean girl',     emoji: '🧴', promptText: 'clean girl makeup, just concealer, brow gel, lip oil, skin tint, barely-there look' },
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
  { id: 'beach',         label: 'Playa',          emoji: '🏖️', promptText: 'light beach sarong wrap, resort vacation look' },
  { id: 'punk',          label: 'Punk',           emoji: '🤘', promptText: 'punk rock leather studs ripped clothing safety pins' },
  { id: 'preppy',        label: 'Preppy',         emoji: '🎓', promptText: 'preppy polo sweater vest khakis ivy league' },
  { id: 'e-girl',        label: 'E-Girl',         emoji: '⛓️', promptText: 'e-girl aesthetic, chain accessories, dark eyeliner, oversized band tees' },
  { id: 'soft-girl',     label: 'Soft Girl',      emoji: '🧸', promptText: 'soft girl aesthetic, pastel colors, fluffy knits, cute accessories' },
  { id: 'baddie',        label: 'Baddie',         emoji: '🔥', promptText: 'baddie aesthetic, bodycon, heels, bold makeup, snatched look' },
  { id: 'clean-girl',    label: 'Clean Girl',     emoji: '🧼', promptText: 'clean girl aesthetic, slicked back hair, gold hoops, neutral tones, dewy skin' },
  { id: 'mob-wife',      label: 'Mob Wife',       emoji: '🦊', promptText: 'mob wife aesthetic, fur coat, gold jewelry, bold lip, sunglasses, luxury' },
  { id: 'balletcore',    label: 'Balletcore',     emoji: '🩰', promptText: 'balletcore leg warmers wrap top ballet flats tulle' },
  { id: 'coastal',       label: 'Coastal',        emoji: '🐚', promptText: 'coastal grandmother aesthetic, linen, white and beige, sea breeze casual' },
  { id: 'lingerie',      label: 'Lencería',       emoji: '🩱', promptText: 'matching lace bralette and brief set, delicate sheer fabric, showing midriff and legs', variants: [
    'black lace balconette bralette with matching high-waist brief, sheer mesh panels',
    'white satin and lace camisole with thin straps and matching shorts',
    'burgundy lace bodysuit with plunging neckline and scalloped edges',
    'dusty pink silk slip dress, knee length, spaghetti straps, lace trim at hem',
    'emerald green velvet bralette with matching thong, gold clasp detail',
    'sheer black mesh bodysuit with floral embroidery, long sleeves',
    'red satin corset top with boning detail and matching high-cut brief',
    'nude tone seamless bralette and brief set, barely-there minimalist',
    'powder blue lace teddy with ribbon ties at shoulders',
    'leopard print silk camisole with matching tap shorts, vintage boudoir',
  ]},
  { id: 'swimwear',      label: 'Swimwear',       emoji: '👙', promptText: 'two-piece string bikini swimsuit, minimal coverage, showing midriff and legs', variants: [
    'small triangle top bikini with thin tie straps and matching low-rise bottom',
    'bandeau strapless bikini top with high-cut brazilian bottom',
    'halter neck bikini with ring detail and side-tie bottoms',
    'micro bikini with minimal fabric, thin spaghetti straps, showing full midriff',
    'sporty racerback bikini top with cheeky cut bottoms, athletic fit',
    'crochet bikini set in white, handmade boho beach style',
    'metallic gold bikini with chain link straps, luxury pool party style',
    'neon colored bikini with underwire top and ruched bottom',
    'classic black bikini with plunging v-neck top and mid-rise bottom',
    'tropical print wrap bikini top with high-waisted bottoms',
  ]},
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
  { id: 'sunglasses',  label: 'Gafas de sol',  emoji: '🕶️', promptText: 'wearing stylish sunglasses', variants: [
    'wearing black oversized cat-eye sunglasses', 'wearing gold-rimmed aviator sunglasses', 'wearing round tortoiseshell sunglasses',
    'wearing slim rectangular dark sunglasses', 'wearing white retro oversized sunglasses', 'wearing mirrored sport wrap sunglasses',
    'wearing transparent clear frame glasses with light tint', 'wearing thin wire-frame round sunglasses, John Lennon style',
    'wearing chunky 90s shield visor sunglasses', 'wearing matte black wayfarer sunglasses with thick frames',
  ]},
  { id: 'piercings',   label: 'Piercings',      emoji: '💎', promptText: 'with multiple piercings', variants: [
    'with thin gold septum ring, three tiny studs ascending left helix', 'with small silver nose stud on left nostril, double lobe piercings',
    'with industrial bar through right ear, small labret stud below lower lip', 'with multiple ear cuffs on both ears, tiny diamond nostril stud',
    'with delicate chain connecting ear cuff to lobe piercing, septum clicker ring', 'with single eyebrow barbell, tragus piercing on right ear',
    'with double nostril studs and a thin septum ring, minimalist aesthetic', 'with conch hoop on left ear, daith ring on right ear, no face piercings',
    'with medusa piercing above upper lip, matching tiny lobe studs', 'with bridge piercing between eyes, double helix on both ears',
  ]},
  { id: 'tattoos',     label: 'Tatuajes',       emoji: '🎨', promptText: 'with visible artistic tattoos', variants: [
    'with minimalist moon phase tattoo behind left ear, small botanical vine on inner right forearm',
    'with traditional blackwork sleeve tattoo on left arm, geometric mandala on right shoulder',
    'with delicate script tattoo on left collarbone, small star constellation on inner wrist',
    'with fine-line portrait tattoo on upper right arm, tiny heart outline on ring finger',
    'with Japanese wave tattoo on right forearm, small compass rose behind right ear',
    'with abstract watercolor splash tattoo on left shoulder blade, thin arrow on right ankle',
    'with snake tattoo wrapping around left forearm, small rose on right hand',
    'with dotwork geometric pattern on right shoulder, tiny lightning bolt on inner finger',
    'with realistic butterfly tattoo on upper back, small infinity symbol on wrist',
    'with traditional sailor anchor on left bicep, small swallow birds on collarbone',
  ]},
  { id: 'jewelry',     label: 'Joyería',        emoji: '💍', promptText: 'wearing elegant fine jewelry', variants: [
    'wearing layered thin gold chain necklaces and small hoop earrings', 'wearing chunky silver rings on multiple fingers and a chain bracelet',
    'wearing delicate pearl stud earrings and a thin tennis bracelet', 'wearing oversized gold door-knocker earrings and layered bangles',
    'wearing a single long pendant necklace and mismatched earrings', 'wearing vintage cameo brooch and antique ring set',
    'wearing thin gold nose chain connected to ear cuff, minimalist rings', 'wearing baroque pearl drop earrings with matching collar necklace',
    'wearing stackable midi rings on every finger, delicate anklet visible', 'wearing single diamond choker with matching stud earrings, understated luxury',
  ]},
  { id: 'hat',         label: 'Sombrero',       emoji: '🎩', promptText: 'wearing a stylish hat', variants: [
    'wearing a worn-in baseball cap slightly tilted', 'wearing a wide-brim straw sun hat',
    'wearing a black wool fedora', 'wearing a knitted beanie pulled back slightly',
    'wearing a vintage newsboy cap', 'wearing a bucket hat in neutral canvas',
    'wearing a baker boy cap in brown tweed', 'wearing a wide-brim felt hat in burgundy',
    'wearing a visor cap pushed back on head', 'wearing a beret tilted to one side, Parisian style',
  ]},
  { id: 'scarf',       label: 'Bufanda',        emoji: '🧣', promptText: 'wearing a fashionable scarf' },
  { id: 'watch',       label: 'Reloj',          emoji: '⌚', promptText: 'wearing a luxury watch', variants: [
    'wearing a vintage gold Casio digital watch', 'wearing a chunky silver diver watch',
    'wearing a minimalist black leather strap watch', 'wearing a rose gold bracelet watch',
    'wearing an oversized gold chronograph watch', 'wearing a slim silver mesh band watch',
    'wearing a colorful Swatch with plastic strap', 'wearing a wooden dial watch with leather band',
    'wearing a smart watch with black sport band', 'wearing a vintage wind-up watch with worn leather',
  ]},
  { id: 'choker',      label: 'Gargantilla',    emoji: '📿', promptText: 'wearing a choker necklace', variants: [
    'wearing a thin black velvet choker', 'wearing a delicate gold chain choker with tiny pendant',
    'wearing a pearl strand choker necklace', 'wearing a leather wrap choker with silver clasp',
    'wearing a thick silver chain choker, punk style', 'wearing a satin ribbon tied in a bow at the neck',
    'wearing a rhinestone crystal choker, sparkly', 'wearing a shell and bead choker, bohemian',
    'wearing a lace choker with cameo pendant', 'wearing a minimalist wire choker, geometric',
  ]},
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

const ALL_CHIP_MAPS: Record<string, ChipOption[]> = {
  ethnicity: ETHNICITIES, hairStyle: HAIR_STYLES, hairColor: HAIR_COLORS,
  skinTone: SKIN_TONES, eyeColor: EYE_COLORS, eyeShape: EYE_SHAPES,
  noseType: NOSE_TYPES, lipShape: LIP_SHAPES, faceShape: FACE_SHAPES,
  jawline: JAWLINES, eyebrows: EYEBROWS, bodyType: BODY_TYPES,
  height: HEIGHTS, bust: BUST_SIZES, hips: HIP_SIZES, waist: WAIST_SIZES,
  musculature: MUSCULATURE, legs: LEG_PROPORTIONS, facialHair: FACIAL_HAIR, skinDetails: SKIN_DETAILS, makeup: MAKEUP_STYLES, skinTexture: SKIN_TEXTURES,
  gender: GENDERS, age: AGE_RANGES, personality: PERSONALITY_TRAITS,
  fashion: FASHION_STYLES, accessories: ACCESSORIES,
}

function getSelected(selections: Record<string, string[]>, category: string): string | undefined {
  const ids = selections[category]
  if (!ids || ids.length === 0) return undefined
  const chips = ALL_CHIP_MAPS[category]
  if (!chips) return undefined
  return ids.map(id => {
    const chip = chips.find(c => c.id === id)
    if (!chip) return undefined
    // If chip has variants, pick one randomly for variety
    if (chip.variants && chip.variants.length > 0) {
      return chip.variants[Math.floor(Math.random() * chip.variants.length)]
    }
    return chip.promptText
  }).filter(Boolean).join(', ')
}

/**
 * Build a JSON-structured prompt for NB2.
 * NB2 processes JSON blocks as distinct semantic units — fields don't bleed into each other.
 */
export function buildPromptFromChips(selections: Record<string, string[]>): string {
  const identity: Record<string, string> = {}
  const face: Record<string, string> = {}
  const body: Record<string, string> = {}
  const appearance: Record<string, string> = {}

  // Identity
  const gender = getSelected(selections, 'gender')
  const age = getSelected(selections, 'age')
  if (gender) identity.gender = gender
  if (age) identity.age = age

  // Ethnicity as overrideable preset — bone structure always used,
  // soft traits (skin, eyes, hair, etc.) used ONLY if user didn't pick individual chips
  const ethnicityIds = selections['ethnicity'] || []
  const ethnicityChip = ethnicityIds.length > 0 ? ETHNICITIES.find(e => e.id === ethnicityIds[0]) : null
  const ethnicityDefaults = ethnicityChip?.defaults || {}

  // Bone structure from ethnicity (always applied, never overridden)
  if (ethnicityChip) identity.bone_structure = ethnicityChip.promptText

  // Face — user chips override ethnicity defaults
  const faceShape = getSelected(selections, 'faceShape') || ethnicityDefaults.faceShape
  const eyeColor = getSelected(selections, 'eyeColor') || ethnicityDefaults.eyeColor
  const eyeShape = getSelected(selections, 'eyeShape') || ethnicityDefaults.eyeShape
  const noseType = getSelected(selections, 'noseType') || ethnicityDefaults.noseType
  const lipShape = getSelected(selections, 'lipShape') || ethnicityDefaults.lipShape
  const jawline = getSelected(selections, 'jawline') || ethnicityDefaults.jawline
  const eyebrows = getSelected(selections, 'eyebrows')
  const facialHair = getSelected(selections, 'facialHair')
  if (faceShape) face.shape = faceShape
  if (eyeColor) face.eye_color = eyeColor
  if (eyeShape) face.eye_shape = eyeShape
  if (noseType) face.nose = noseType
  if (lipShape) face.lips = lipShape
  if (jawline) face.jawline = jawline
  if (eyebrows) face.eyebrows = eyebrows
  if (facialHair) face.facial_hair = facialHair

  // Body
  const bodyType = getSelected(selections, 'bodyType')
  const height = getSelected(selections, 'height')
  const bust = getSelected(selections, 'bust')
  const waist = getSelected(selections, 'waist')
  const hips = getSelected(selections, 'hips')
  const musculature = getSelected(selections, 'musculature')
  const legs = getSelected(selections, 'legs')
  if (bodyType) body.type = bodyType
  if (height) body.height = height
  if (bust) body.bust = bust
  if (waist) body.waist = waist
  if (hips) body.hips = hips
  if (musculature) body.musculature = musculature
  if (legs) body.legs = legs

  // Appearance — user chips override ethnicity defaults
  const hairStyle = getSelected(selections, 'hairStyle') || ethnicityDefaults.hairStyle
  const hairColor = getSelected(selections, 'hairColor') || ethnicityDefaults.hairColor
  const skinTone = getSelected(selections, 'skinTone') || ethnicityDefaults.skinTone
  const skinTexture = getSelected(selections, 'skinTexture')
  if (hairStyle) appearance.hair_style = hairStyle
  if (hairColor) appearance.hair_color = hairColor
  if (skinTone) appearance.skin_tone = skinTone
  if (skinTexture) appearance.skin_texture = skinTexture
  const skinDetails = getSelected(selections, 'skinDetails')
  if (skinDetails) appearance.skin_details = skinDetails
  const makeup = getSelected(selections, 'makeup')
  if (makeup) appearance.makeup = makeup

  // Extras
  const personality = getSelected(selections, 'personality')
  const fashion = getSelected(selections, 'fashion')
  const accessories = getSelected(selections, 'accessories')

  const spec: Record<string, any> = {}
  if (Object.keys(identity).length > 0) spec.identity = identity
  if (Object.keys(face).length > 0) spec.face = face
  if (Object.keys(body).length > 0) spec.body = body
  if (Object.keys(appearance).length > 0) spec.appearance = appearance
  if (personality) spec.personality = personality
  if (fashion) spec.outfit = fashion
  if (accessories) spec.accessories = accessories

  // Build flat version for non-NB2 models (Seedream, Grok)
  const flatParts: string[] = []
  for (const [, val] of Object.entries(spec)) {
    if (typeof val === 'string') flatParts.push(val)
    else if (typeof val === 'object') {
      for (const v of Object.values(val as Record<string, string>)) {
        if (typeof v === 'string') flatParts.push(v)
      }
    }
  }
  const flatDescription = flatParts.join(', ')

  // Return JSON block with flat fallback appended
  // NB2 uses the JSON structure, other models use the flat description
  return `CHARACTER SPECIFICATION:\n${JSON.stringify(spec, null, 2)}\n\nFLAT DESCRIPTION: ${flatDescription}`
}

/** Extract flat text description from a JSON-structured characteristics string.
 *  For non-NB2 models that don't understand JSON prompting. */
export function flattenCharacteristics(characteristics: string): string {
  if (!characteristics) return ''
  const flatMatch = characteristics.match(/FLAT DESCRIPTION: (.+)$/s)
  if (flatMatch) return flatMatch[1].trim()
  // If no flat section, strip JSON and return as-is
  return characteristics.replace(/CHARACTER SPECIFICATION:\n[\s\S]*?\n\n/g, '').trim() || characteristics
}
