// data/characterChips.ts

export interface ChipOption {
  id: string
  label: string
  emoji: string
  promptText: string
}

export interface ChipCategory {
  id: string
  label: string
  options: ChipOption[]
  maxSelect?: number
}

export const HAIR_STYLES: ChipOption[] = [
  { id: 'long-straight', label: 'Long Straight', emoji: '💇', promptText: 'long straight hair' },
  { id: 'wavy', label: 'Wavy', emoji: '🌊', promptText: 'wavy hair' },
  { id: 'curly', label: 'Curly', emoji: '➰', promptText: 'curly hair' },
  { id: 'pixie', label: 'Pixie', emoji: '✂️', promptText: 'pixie cut' },
  { id: 'bob', label: 'Bob', emoji: '💁', promptText: 'bob haircut' },
  { id: 'braids', label: 'Braids', emoji: '🎀', promptText: 'braided hair' },
  { id: 'afro', label: 'Afro', emoji: '🌀', promptText: 'afro hairstyle' },
  { id: 'buzz', label: 'Buzz Cut', emoji: '💈', promptText: 'buzz cut' },
  { id: 'bald', label: 'Bald', emoji: '🌕', promptText: 'bald head' },
  { id: 'mohawk', label: 'Mohawk', emoji: '🦅', promptText: 'mohawk hairstyle' },
  { id: 'ponytail', label: 'Ponytail', emoji: '🎗️', promptText: 'ponytail' },
  { id: 'space-buns', label: 'Space Buns', emoji: '🪐', promptText: 'space buns hairstyle' },
  { id: 'dreadlocks', label: 'Dreadlocks', emoji: '🦁', promptText: 'dreadlocks' },
  { id: 'undercut', label: 'Undercut', emoji: '💎', promptText: 'undercut hairstyle' },
  { id: 'twin-tails', label: 'Twin Tails', emoji: '🎀', promptText: 'twin tails' },
  { id: 'shaggy', label: 'Shaggy', emoji: '🐕', promptText: 'shaggy layered hair' },
]

export const HAIR_COLORS: ChipOption[] = [
  { id: 'black', label: 'Black', emoji: '⬛', promptText: 'black hair' },
  { id: 'brown', label: 'Brown', emoji: '🟫', promptText: 'brown hair' },
  { id: 'blonde', label: 'Blonde', emoji: '🟡', promptText: 'blonde hair' },
  { id: 'red', label: 'Red', emoji: '🔴', promptText: 'red hair' },
  { id: 'auburn', label: 'Auburn', emoji: '🍂', promptText: 'auburn hair' },
  { id: 'white', label: 'White', emoji: '⬜', promptText: 'white hair' },
  { id: 'gray', label: 'Gray/Silver', emoji: '🩶', promptText: 'silver gray hair' },
  { id: 'pink', label: 'Pink', emoji: '🩷', promptText: 'pink hair' },
  { id: 'blue', label: 'Blue', emoji: '🔵', promptText: 'blue hair' },
  { id: 'purple', label: 'Purple', emoji: '🟣', promptText: 'purple hair' },
  { id: 'green', label: 'Green', emoji: '🟢', promptText: 'green hair' },
  { id: 'neon-pink', label: 'Neon Pink', emoji: '💗', promptText: 'neon pink hair' },
  { id: 'fire-red', label: 'Fire Red', emoji: '🔥', promptText: 'bright fire red hair' },
]

export const SKIN_TONES: ChipOption[] = [
  { id: 'light', label: 'Light', emoji: '🏻', promptText: 'light skin tone' },
  { id: 'medium', label: 'Medium', emoji: '🏽', promptText: 'medium skin tone' },
  { id: 'dark', label: 'Dark', emoji: '🏿', promptText: 'dark skin tone' },
  { id: 'olive', label: 'Olive', emoji: '🫒', promptText: 'olive skin tone' },
  { id: 'tan', label: 'Tan', emoji: '🏖️', promptText: 'tan skin' },
  { id: 'porcelain', label: 'Porcelain', emoji: '🤍', promptText: 'porcelain pale skin' },
  { id: 'golden', label: 'Golden', emoji: '✨', promptText: 'golden skin tone' },
  { id: 'emerald', label: 'Emerald', emoji: '💚', promptText: 'emerald green fantasy skin' },
  { id: 'lavender', label: 'Lavender', emoji: '💜', promptText: 'lavender purple fantasy skin' },
  { id: 'obsidian', label: 'Obsidian', emoji: '🖤', promptText: 'obsidian dark fantasy skin' },
  { id: 'silver', label: 'Silver', emoji: '🩶', promptText: 'metallic silver skin' },
]

export const EYE_COLORS: ChipOption[] = [
  { id: 'blue', label: 'Blue', emoji: '🔵', promptText: 'blue eyes' },
  { id: 'green', label: 'Green', emoji: '🟢', promptText: 'green eyes' },
  { id: 'brown', label: 'Brown', emoji: '🟤', promptText: 'brown eyes' },
  { id: 'hazel', label: 'Hazel', emoji: '🫒', promptText: 'hazel eyes' },
  { id: 'black', label: 'Black', emoji: '⚫', promptText: 'deep black eyes' },
  { id: 'amber', label: 'Amber', emoji: '🟠', promptText: 'amber golden eyes' },
  { id: 'red', label: 'Red', emoji: '🔴', promptText: 'red glowing eyes' },
  { id: 'gold', label: 'Gold', emoji: '🥇', promptText: 'gold glowing eyes' },
  { id: 'silver', label: 'Silver', emoji: '🩶', promptText: 'silver metallic eyes' },
  { id: 'heterochromia', label: 'Heterochromia', emoji: '🎭', promptText: 'heterochromatic eyes, one blue one green' },
  { id: 'cyan', label: 'Cyan', emoji: '🩵', promptText: 'cyan glowing eyes' },
  { id: 'pink', label: 'Pink', emoji: '🩷', promptText: 'pink glowing eyes' },
]

export const FACE_SHAPES: ChipOption[] = [
  { id: 'oval', label: 'Oval', emoji: '🥚', promptText: 'oval face shape' },
  { id: 'angular', label: 'Angular', emoji: '💎', promptText: 'angular sharp face shape' },
  { id: 'round', label: 'Round', emoji: '🟠', promptText: 'round soft face shape' },
  { id: 'heart', label: 'Heart', emoji: '💜', promptText: 'heart-shaped face' },
  { id: 'square', label: 'Square', emoji: '🟦', promptText: 'square jawline face' },
  { id: 'diamond', label: 'Diamond', emoji: '♦️', promptText: 'diamond face shape, prominent cheekbones' },
]

export const BODY_TYPES: ChipOption[] = [
  { id: 'slim', label: 'Slim', emoji: '🧍', promptText: 'slim body type' },
  { id: 'athletic', label: 'Athletic', emoji: '🏃', promptText: 'athletic toned body' },
  { id: 'curvy', label: 'Curvy', emoji: '💃', promptText: 'curvy body type' },
  { id: 'muscular', label: 'Muscular', emoji: '💪', promptText: 'muscular body build' },
  { id: 'petite', label: 'Petite', emoji: '🌸', promptText: 'petite small frame' },
  { id: 'tall', label: 'Tall', emoji: '📏', promptText: 'tall body frame' },
]

export const SKIN_TEXTURES: ChipOption[] = [
  { id: 'human', label: 'Human', emoji: '🧑', promptText: 'natural human skin texture with visible pores' },
  { id: 'scales', label: 'Scales', emoji: '🐉', promptText: 'iridescent reptilian scales' },
  { id: 'metallic', label: 'Metallic', emoji: '🤖', promptText: 'brushed chrome and titanium skin panels' },
  { id: 'crystal', label: 'Crystal', emoji: '💎', promptText: 'translucent crystalline skin with refraction' },
  { id: 'ethereal', label: 'Ethereal', emoji: '👻', promptText: 'translucent ethereal form with internal light' },
  { id: 'fur', label: 'Fur', emoji: '🐺', promptText: 'dense soft fur with individual strand rendering' },
  { id: 'bark', label: 'Bark', emoji: '🌳', promptText: 'living bark texture with deep fissures' },
  { id: 'stone', label: 'Stone', emoji: '🪨', promptText: 'volcanic basalt and granite surface' },
]

export const GENDERS: ChipOption[] = [
  { id: 'female', label: 'Female', emoji: '♀️', promptText: 'female' },
  { id: 'male', label: 'Male', emoji: '♂️', promptText: 'male' },
  { id: 'non-binary', label: 'Non-Binary', emoji: '⚧️', promptText: 'non-binary androgynous' },
  { id: 'androgynous', label: 'Androgynous', emoji: '✦', promptText: 'androgynous appearance' },
]

export const AGE_RANGES: ChipOption[] = [
  { id: '18-22', label: '18-22', emoji: '🌱', promptText: '18-22 years old, young adult' },
  { id: '23-27', label: '23-27', emoji: '🌿', promptText: '23-27 years old' },
  { id: '28-32', label: '28-32', emoji: '🌳', promptText: '28-32 years old' },
  { id: '33-37', label: '33-37', emoji: '🍂', promptText: '33-37 years old' },
  { id: '38-45', label: '38-45', emoji: '🏔️', promptText: '38-45 years old, mature' },
  { id: '46-55', label: '46-55', emoji: '🌊', promptText: '46-55 years old, distinguished' },
  { id: 'ageless', label: 'Ageless', emoji: '♾️', promptText: 'ageless, timeless appearance' },
]

export const PERSONALITY_TRAITS: ChipOption[] = [
  { id: 'bold', label: 'Bold', emoji: '🔥', promptText: 'bold confident expression' },
  { id: 'mysterious', label: 'Mysterious', emoji: '🎭', promptText: 'mysterious enigmatic gaze' },
  { id: 'playful', label: 'Playful', emoji: '😄', promptText: 'playful fun energy' },
  { id: 'intellectual', label: 'Intellectual', emoji: '🧠', promptText: 'intellectual thoughtful demeanor' },
  { id: 'fierce', label: 'Fierce', emoji: '🐆', promptText: 'fierce powerful presence' },
  { id: 'gentle', label: 'Gentle', emoji: '🕊️', promptText: 'gentle soft serene aura' },
  { id: 'rebel', label: 'Rebel', emoji: '⚡', promptText: 'rebellious defiant attitude' },
  { id: 'elegant', label: 'Elegant', emoji: '👑', promptText: 'elegant refined grace' },
  { id: 'adventurous', label: 'Adventurous', emoji: '🧭', promptText: 'adventurous daring spirit' },
  { id: 'charismatic', label: 'Charismatic', emoji: '✨', promptText: 'charismatic magnetic presence' },
  { id: 'stoic', label: 'Stoic', emoji: '🗿', promptText: 'stoic calm composed expression' },
  { id: 'dreamer', label: 'Dreamer', emoji: '☁️', promptText: 'dreamy ethereal gaze' },
]

export const FASHION_STYLES: ChipOption[] = [
  { id: 'streetwear', label: 'Streetwear', emoji: '👟', promptText: 'urban streetwear fashion' },
  { id: 'high-fashion', label: 'High Fashion', emoji: '👗', promptText: 'high fashion editorial outfit' },
  { id: 'bohemian', label: 'Bohemian', emoji: '🌻', promptText: 'bohemian free-spirited clothing' },
  { id: 'minimalist', label: 'Minimalist', emoji: '◻️', promptText: 'minimalist clean outfit' },
  { id: 'y2k', label: 'Y2K', emoji: '💿', promptText: 'Y2K fashion aesthetic' },
  { id: 'dark-academia', label: 'Dark Academia', emoji: '📚', promptText: 'dark academia scholarly outfit' },
  { id: 'cottagecore', label: 'Cottagecore', emoji: '🌾', promptText: 'cottagecore pastoral clothing' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🔮', promptText: 'cyberpunk futuristic outfit' },
  { id: 'old-money', label: 'Old Money', emoji: '💰', promptText: 'old money quiet luxury outfit' },
  { id: 'avant-garde', label: 'Avant-Garde', emoji: '🎨', promptText: 'avant-garde experimental fashion' },
  { id: 'athleisure', label: 'Athleisure', emoji: '🏋️', promptText: 'athleisure sporty outfit' },
  { id: 'gothic', label: 'Gothic', emoji: '🖤', promptText: 'gothic dark fashion' },
  { id: 'gorpcore', label: 'Gorpcore', emoji: '🏔️', promptText: 'gorpcore outdoor technical wear' },
  { id: 'coquette', label: 'Coquette', emoji: '🎀', promptText: 'coquette feminine bows and lace' },
  { id: 'grunge', label: 'Grunge', emoji: '🎸', promptText: 'grunge distressed layered clothing' },
  { id: 'techwear', label: 'Techwear', emoji: '⚙️', promptText: 'techwear functional futuristic gear' },
  { id: 'retro-70s', label: 'Retro 70s', emoji: '🕺', promptText: 'retro 70s vintage clothing' },
  { id: 'kawaii', label: 'Kawaii', emoji: '🍡', promptText: 'kawaii cute Japanese street fashion' },
  { id: 'western', label: 'Western', emoji: '🤠', promptText: 'western cowboy outfit' },
  { id: 'fantasy-armor', label: 'Fantasy Armor', emoji: '🛡️', promptText: 'fantasy armor ornate battle gear' },
  { id: 'sci-fi-suit', label: 'Sci-Fi Suit', emoji: '🚀', promptText: 'sci-fi futuristic suit' },
  { id: 'royal', label: 'Royal/Regal', emoji: '👑', promptText: 'royal regal clothing with crown' },
]

export const ACCESSORIES: ChipOption[] = [
  { id: 'sunglasses', label: 'Sunglasses', emoji: '🕶️', promptText: 'wearing sunglasses' },
  { id: 'piercings', label: 'Piercings', emoji: '💎', promptText: 'with piercings' },
  { id: 'tattoos', label: 'Tattoos', emoji: '🎨', promptText: 'with visible tattoos' },
  { id: 'jewelry', label: 'Jewelry', emoji: '💍', promptText: 'wearing elegant jewelry' },
  { id: 'hat', label: 'Hat', emoji: '🎩', promptText: 'wearing a hat' },
  { id: 'scarf', label: 'Scarf', emoji: '🧣', promptText: 'with a scarf' },
  { id: 'watch', label: 'Watch', emoji: '⌚', promptText: 'wearing a luxury watch' },
  { id: 'choker', label: 'Choker', emoji: '📿', promptText: 'wearing a choker necklace' },
  { id: 'crown', label: 'Crown/Tiara', emoji: '👑', promptText: 'wearing a crown or tiara' },
  { id: 'mask', label: 'Mask', emoji: '🎭', promptText: 'wearing a decorative mask' },
  { id: 'wings', label: 'Wings', emoji: '🪽', promptText: 'with ornate wings' },
  { id: 'horns', label: 'Horns', emoji: '🦌', promptText: 'with horns on head' },
  { id: 'elf-ears', label: 'Elf Ears', emoji: '🧝', promptText: 'with pointed elf ears' },
  { id: 'tail', label: 'Tail', emoji: '🦊', promptText: 'with a tail' },
]

export function buildPromptFromChips(selections: Record<string, string[]>): string {
  const allChips: Record<string, ChipOption[]> = {
    hairStyle: HAIR_STYLES,
    hairColor: HAIR_COLORS,
    skinTone: SKIN_TONES,
    eyeColor: EYE_COLORS,
    faceShape: FACE_SHAPES,
    bodyType: BODY_TYPES,
    skinTexture: SKIN_TEXTURES,
    gender: GENDERS,
    age: AGE_RANGES,
    personality: PERSONALITY_TRAITS,
    fashion: FASHION_STYLES,
    accessories: ACCESSORIES,
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
