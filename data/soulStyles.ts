// ─────────────────────────────────────────────
// Higgsfield Soul 2.0 — Style Presets
// 100+ curated aesthetic presets with UUIDs
// Pass style_id to Soul API for instant aesthetic direction
// ─────────────────────────────────────────────

export interface SoulStyle {
  id: string;       // UUID for API or custom ID
  name: string;     // Display name
  category: SoulStyleCategory;
  icon: string;     // Emoji
  featured?: boolean; // Top-tier styles shown first with a badge
  hint?: string;    // Detailed prompt hint — when present, used instead of just the name
}

export type SoulStyleCategory =
  | 'fashion'
  | 'photo'
  | 'mood'
  | 'concept'
  | 'location'
  | 'experimental'
  | 'selfie'
  | 'general'
  | 'era'
  | 'social'
  | 'lifestyle'
  | 'pose'
  | 'profession'
  | 'expression'
  | 'aesthetic'
  | 'content'
  | 'place';

export const SOUL_STYLE_CATEGORIES: Record<SoulStyleCategory, { label: string; icon: string }> = {
  general: { label: 'General', icon: '✦' },
  fashion: { label: 'Moda', icon: '👗' },
  aesthetic: { label: 'Estética', icon: '✨' },
  photo: { label: 'Fotografía', icon: '📷' },
  selfie: { label: 'Selfie', icon: '🤳' },
  expression: { label: 'Expresión', icon: '😏' },
  pose: { label: 'Pose', icon: '🧍' },
  mood: { label: 'Mood', icon: '🌙' },
  concept: { label: 'Concepto', icon: '🎭' },
  location: { label: 'Destino', icon: '🗺️' },
  place: { label: 'Lugar', icon: '🏠' },
  era: { label: 'Época', icon: '⏳' },
  social: { label: 'Plataforma', icon: '📱' },
  content: { label: 'Contenido', icon: '📦' },
  lifestyle: { label: 'Lifestyle', icon: '🌿' },
  profession: { label: 'Profesión', icon: '💼' },
  experimental: { label: 'Experimental', icon: '🔮' },
};

export const SOUL_STYLES: SoulStyle[] = [
  // ── General ──
  { id: '464ea177-8d40-4940-8d9d-b438bab269c7', name: 'General', category: 'general', icon: '✦', featured: true, hint: 'clean modern photography, balanced natural lighting, neutral color palette, versatile everyday look' },
  { id: '1cb4b936-77bf-4f9a-9039-f3d349a4cdbe', name: 'Realistic', category: 'general', icon: '📸', featured: true, hint: 'hyper-realistic photograph, natural skin texture and pores, accurate lighting and shadows, DSLR quality, no filters or stylization' },

  // ── Fashion ──
  { id: '6b9e6b4d-325a-4a78-a0fb-a00ddf612380', name: 'Y2K', category: 'fashion', icon: '💿', hint: 'early 2000s fashion aesthetic, low-rise jeans, butterfly clips, frosted makeup, metallic fabrics, baby tees, pastel and chrome palette' },
  { id: 'facaafeb-4ab5-4384-92a1-b4086180e9ac', name: '2000s Fashion', category: 'fashion', icon: '👠', hint: 'mid-2000s style, velour tracksuits, oversized sunglasses, platform heels, bedazzled accessories, Paris Hilton era, glossy and pink tones' },
  { id: '99de6fc5-1177-49b9-b2e9-19e17d95bcaf', name: 'Tokyo Streetstyle', category: 'fashion', icon: '🗼', featured: true, hint: 'Harajuku-inspired layered streetwear, bold color mixing, platform shoes, statement accessories, Tokyo urban backdrop with neon signs' },
  { id: '86fc814e-856a-4af0-98b0-d4da75d0030b', name: 'Fashion Show', category: 'fashion', icon: '👗', featured: true, hint: 'high fashion runway photography, editorial lighting, designer clothing, confident model walk, dramatic catwalk setting with audience blur' },
  { id: 'ff1ad8a2-94e7-4e70-a12f-e992ca9a0d36', name: 'Quiet Luxury', category: 'fashion', icon: '🤍', featured: true, hint: 'understated luxury, cashmere and neutral tones, no visible logos, cream/beige/camel palette, soft natural light, old-money minimalism' },
  { id: '96758335-d1d1-42b7-9c21-5ac38c433485', name: 'Gorpcore', category: 'fashion', icon: '🏔️', hint: 'outdoor technical wear as fashion, hiking boots, puffer jackets, cargo pants, earth tones, trail-ready accessories, mountain or urban trail backdrop' },
  { id: 'bd78cfc6-9b92-4889-9347-f21dbf0a269c', name: 'Coquette Core', category: 'fashion', icon: '🎀', hint: 'ultra-feminine dainty aesthetic, bows and ribbons, lace details, soft pink and white palette, delicate jewelry, ballet flats, romantic and flirty' },
  { id: 'ad9de607-3941-4540-81ea-ba978ef1550b', name: 'Grunge', category: 'fashion', icon: '🖤', hint: 'oversized flannel shirts, ripped denim, combat boots, smudged dark eyeliner, washed-out muted tones, messy hair, moody garage aesthetic' },
  { id: '5a72fec7-a12e-43db-8ef3-1d193b4f7ab4', name: 'Indie Sleaze', category: 'fashion', icon: '🍺', hint: 'party-ready messy style, skinny jeans, band tees, smudged makeup, flash photography, nightlife energy, 2007-era Brooklyn aesthetic' },
  { id: 'f96913e8-2fcf-4358-8545-75dd6c34c518', name: 'Bimbocore', category: 'fashion', icon: '💅', hint: 'hyper-feminine maximalist fashion, hot pink everything, rhinestones, platform heels, glossy lips, full glam makeup, bold and unapologetic' },
  { id: '84c23cef-7eda-4f8f-9931-e3e6af8192d9', name: 'Burgundy Suit', category: 'fashion', icon: '🍷', hint: 'tailored deep burgundy/wine-colored suit, power dressing, rich jewel tone, polished shoes, confident pose, warm moody lighting' },
  { id: '90df2935-3ded-477f-8253-1d67dd939cbe', name: 'Bike Mafia', category: 'fashion', icon: '🏍️', hint: 'motorcycle club aesthetic, black leather jacket, riding boots, dark denim, aviator sunglasses, urban grit, parked motorcycle in frame' },
  { id: '91abc4fe-1cf8-4a77-8ade-d36d46699014', name: 'Green Editorial', category: 'fashion', icon: '🌿', hint: 'editorial fashion shoot with lush green tones, emerald and forest green clothing, botanical backdrop, soft directional light, magazine quality' },
  { id: '710f9073-f580-48dc-b5c3-9bbc7cbb7f37', name: "90's Editorial", category: 'fashion', icon: '📰', hint: '1990s fashion editorial, supermodel era, minimalist styling, neutral blazers, slip dresses, matte skin, strong brows, Helmut Newton-inspired lighting' },
  { id: '71fecd8c-6696-42df-b5eb-f69e4150ca01', name: '0.5 Outfit', category: 'fashion', icon: '👔', hint: 'ultra-wide 0.5x lens shot from low angle showing full outfit, feet prominent in foreground, distorted perspective, casual pose standing' },

  // ── Photography ──
  { id: '1b798b54-03da-446a-93bf-12fcba1050d7', name: 'iPhone', category: 'photo', icon: '📱', featured: true, hint: 'shot on iPhone, natural phone camera quality, slight lens softness, shallow DOF, casual authentic feel' },
  { id: 'ca4e6ad3-3e93-4e03-81a0-d1722d2c128b', name: 'DigitalCam', category: 'photo', icon: '📷', hint: 'shot on early digital camera, slight pixelation, flash, red-eye, 2000s digital camera aesthetic' },
  { id: 'f5c094c7-4671-4d86-90d2-369c8fdbd7a5', name: '90s Grain', category: 'photo', icon: '🎞️', hint: '1990s film photography, heavy organic grain, warm amber cast, faded colors, analog imperfections' },
  { id: '83caff04-691c-468c-b4a0-fd6bbabe062b', name: 'Vintage PhotoBooth', category: 'photo', icon: '🎰', hint: 'photo booth strip, slightly washed out, flash lighting, curtain background, fun candid poses' },
  { id: 'cc4e7248-dcfe-4c93-b264-2ab418a7556b', name: 'Fisheye', category: 'photo', icon: '🐟', hint: 'fisheye lens distortion, extreme wide angle, barrel distortion, skater/hip-hop aesthetic' },
  { id: 'd8a35238-ba42-48a0-a76a-186a97734b9d', name: 'Overexposed', category: 'photo', icon: '☀️', hint: 'intentionally overexposed, blown highlights, dreamy washed-out look, ethereal bright atmosphere' },
  { id: '181b3796-008a-403b-b31e-a9b760219f17', name: '2000s Cam', category: 'photo', icon: '📸', hint: 'early 2000s digital camera, flash, low resolution feel, MySpace era, party photos aesthetic' },
  { id: '294bb3ee-eaef-4d2a-93e3-164268803db4', name: '360 Cam', category: 'photo', icon: '🔄', hint: '360 camera tiny planet effect, extreme wide angle, distorted perspective, action camera feel' },
  { id: '811de7ab-7aaf-4a6b-b352-cdea6c34c8f1', name: 'Movie', category: 'photo', icon: '🎬', hint: 'cinematic movie still, 2.39:1 letterbox, anamorphic bokeh, film color grading, dramatic lighting' },
  { id: '40ff999c-f576-443c-b5b3-c7d1391a666e', name: 'Spotlight', category: 'photo', icon: '💡', hint: 'single hard spotlight from above, dark background, dramatic pool of light, theatrical' },
  { id: 'd4775423-d214-4862-b061-47baa1978208', name: 'Fish-eye Twin', category: 'photo', icon: '👯', hint: 'fisheye lens shot of two identical subjects side by side, extreme barrel distortion, party vibe, flash-lit' },

  // ── Selfie ──
  { id: '8dd89de9-1cff-402e-88a8-580c29d91473', name: '0.5 Selfie', category: 'selfie', icon: '🤳', featured: true, hint: 'ultra-wide 0.5x lens selfie from above, exaggerated perspective, face close to camera, background stretched, casual fun angle' },
  { id: '9de8ed26-c8dd-413c-a5e3-47eec97bc243', name: 'Ring Selfie', category: 'selfie', icon: '💍', hint: 'selfie with hand near face showing off a ring or jewelry, fingers framing chin, soft focus, close-up on face and hand' },
  { id: '255f4045-d68b-42b1-9e4c-f49d3263a9d7', name: 'Grillz Selfie', category: 'selfie', icon: '😬', hint: 'close-up selfie showing teeth with grillz/dental jewelry, confident smirk, hip-hop aesthetic, gold or diamond mouth accessory' },
  { id: '524be50a-4388-4ff5-a843-a73d2dd7ef87', name: 'Elevator Mirror', category: 'selfie', icon: '🪞', hint: 'mirror selfie inside an elevator, phone visible in reflection, steel walls, fluorescent overhead light, full-body or half-body framing' },
  { id: '88126a43-86fb-4047-a2d6-c9146d6ca6ce', name: 'Duplicate', category: 'selfie', icon: '👥', hint: 'clone effect selfie showing the same person appearing twice in frame, one looking at camera, one looking away, surreal double' },

  // ── Mood ──
  { id: '0fe8ad66-ff61-411f-9186-b392e140b18c', name: 'Foggy Morning', category: 'mood', icon: '🌫️', featured: true, hint: 'dense morning fog, soft diffused light, muted desaturated tones, silhouette emerging from mist, cool gray atmosphere, peaceful and quiet' },
  { id: '62ba1751-63af-4648-a11c-711ac64e216a', name: 'Night Beach', category: 'mood', icon: '🌊', hint: 'nighttime at the beach, moonlight reflecting on ocean waves, dark blue and silver tones, sand underfoot, ocean breeze feeling' },
  { id: '53bdadfa-8eb6-4eaa-8923-ebece4faa91c', name: 'Rainy Day', category: 'mood', icon: '🌧️', hint: 'overcast rainy atmosphere, wet reflective streets, rain droplets visible, muted blue-gray color grading, umbrella or rain jacket' },
  { id: '26241c54-ed78-4ea7-b1bf-d881737c9feb', name: 'Sunset Beach', category: 'mood', icon: '🌅', hint: 'golden hour sunset on the beach, warm orange and pink sky, long shadows, silhouette rim light, ocean horizon, golden skin tones' },
  { id: '493bda5b-bb4b-46fe-9343-7d5e414534ef', name: 'Clouded Dream', category: 'mood', icon: '☁️', hint: 'dreamy soft-focus atmosphere surrounded by clouds or cotton-like fog, pastel tones, heavenly ethereal glow, diffused white light' },
  { id: '5dbb6a20-0541-4f06-8352-a2408d8781dc', name: 'Nicotine Glow', category: 'mood', icon: '🚬', hint: 'warm amber glow from a single light source, cigarette smoke wisps, dim moody interior, late-night intimate atmosphere, yellow-orange cast' },
  { id: 'a643a36a-85e6-4e3d-80db-13e4997203cc', name: 'Hallway Noir', category: 'mood', icon: '🕵️', hint: 'dark narrow hallway, single overhead light creating harsh shadows, film noir contrast, mysterious atmosphere, cool desaturated tones' },
  { id: 'fb9cee2b-632f-4fd4-ae4f-4664deecc0f4', name: 'Static Glow', category: 'mood', icon: '⚡', hint: 'TV static texture overlay, electric blue and white glow, analog interference lines, retro CRT monitor ambiance, glowing edges' },
  { id: '5765d07d-1525-4d4d-ae06-9091e2bdac2d', name: 'Afterparty Cam', category: 'mood', icon: '🎉', hint: 'late-night post-party vibes, harsh flash in dark room, slightly disheveled look, confetti remnants, tired but happy, messy background' },
  { id: '1fba888b-9ab0-447f-a6a4-9ce5251ec2a6', name: 'Night Rider', category: 'mood', icon: '🏎️', hint: 'nighttime driving scene, neon streetlights blurring past, dashboard glow on face, city lights bokeh, dark moody blue and purple tones' },
  { id: 'c7ea4e7a-c40c-498d-948c-1f6919631f60', name: 'Rhyme & Blues', category: 'mood', icon: '🎵', hint: 'deep blue and indigo color grading, smoky jazz club atmosphere, single spotlight, soulful melancholic mood, vinyl record warmth' },

  // ── Concept ──
  { id: '7f21e7bd-4df6-4cef-a9a9-9746bceaea1d', name: 'Fairycore', category: 'concept', icon: '🧚', hint: 'enchanted forest setting with fairy wings, flower crowns, soft green and pink light, mushrooms, dewdrops, ethereal magical glow' },
  { id: '1fc861ed-5923-41a6-9963-b9f04681dddd', name: 'Medieval', category: 'concept', icon: '⚔️', hint: 'medieval castle setting, chainmail or period armor and tunics, torch-lit stone walls, dramatic shadows, Game of Thrones-style atmosphere' },
  { id: 'b3c8075a-cb4c-42de-b8b3-7099dd2df672', name: 'Creatures', category: 'concept', icon: '🐉', hint: 'fantasy scene with mythical creatures — dragons, phoenixes, or wolves — surrounding the subject, magical particles, epic scale' },
  { id: '4c24b43b-1984-407a-a0ae-c514f29b7e66', name: 'Angel Wings', category: 'concept', icon: '👼', hint: 'large feathered white angel wings extending from the back, heavenly golden backlight, soft clouds, divine ethereal atmosphere' },
  { id: '0c636e12-3411-4a65-8d86-67858caf2fa7', name: 'Avant-garde', category: 'concept', icon: '🎨', hint: 'experimental high-art fashion, sculptural clothing, unconventional shapes and materials, bold makeup, stark white or black backdrop, museum-quality' },
  { id: '373420f7-489e-4a5d-930e-cc4ecfcc23cc', name: 'Fireproof', category: 'concept', icon: '🔥', hint: 'person surrounded by flames and fire effects, intense orange and red glow, sparks flying, dramatic heat distortion, fearless pose' },
  { id: '53959c8a-4323-4b78-9888-e9f6fb0f6b98', name: '2049', category: 'concept', icon: '🤖', hint: 'Blade Runner 2049 aesthetic, foggy neon-lit dystopian city, holographic ads, orange dust atmosphere, cyberpunk rain, futuristic minimalist interiors' },
  { id: '5b6f467e-f509-4afe-a8db-4c07a6f3770d', name: 'Swords Hill', category: 'concept', icon: '🗡️', hint: 'epic hilltop covered with embedded swords in the ground, dramatic overcast sky, warrior standing among the blades, cinematic wide angle' },
  { id: '3de71b9e-3973-4828-b246-a34c606e25a7', name: 'Red Balloon', category: 'concept', icon: '🎈', hint: 'person holding a single bright red balloon against a muted or gray backdrop, whimsical and surreal, pop of color contrast' },
  { id: '70fbb531-5ee2-492e-8c53-5dbd6923e8c2', name: 'Giant Accessory', category: 'concept', icon: '🎒', hint: 'oversized surreal accessory — giant handbag, huge sunglasses, or enormous hat — dwarfing the person, playful forced perspective' },
  { id: 'a5f63c3b-70eb-4979-af5e-98c7ee1e18e8', name: 'Giant People', category: 'concept', icon: '🏙️', hint: 'person depicted as giant towering over a miniature city, Godzilla-scale forced perspective, tiny buildings and cars below' },
  { id: '2d47f079-c021-4b8e-b2c0-3b927a80fc31', name: 'Birthday Mess', category: 'concept', icon: '🎂', hint: 'smashed birthday cake, frosting on face and hands, confetti everywhere, party aftermath, fun messy celebration, colorful streamers' },
  { id: '5ad23bca-4a4b-4316-8c59-b80d7709d8ee', name: "Help It's Too Big", category: 'concept', icon: '😱', hint: 'comically oversized object — giant ice cream, huge pizza, or enormous stuffed animal — person struggling to hold it, exaggerated surprise expression' },
  { id: 'cbefda85-0f76-49bd-82d7-9bcd65be00ca', name: 'Y2K Posters', category: 'concept', icon: '🖼️', hint: 'person posing in front of a wall covered in Y2K-era posters, pop culture imagery, glossy magazine cutouts, early-2000s bedroom wall collage. DO NOT add text or labels' },

  // ── Location ──
  { id: 'dab472a6-23f4-4cf8-98fe-f3e256f1b549', name: 'Amalfi Summer', category: 'location', icon: '🇮🇹', featured: true, hint: 'Italian Amalfi Coast setting, pastel-colored cliffside buildings, bright Mediterranean sun, turquoise sea below, lemon trees, summer linen clothing' },
  { id: 'de0118ba-7c27-49f7-9841-38abe2aae8e1', name: 'Mt. Fuji', category: 'location', icon: '🗻', hint: 'Mount Fuji in background, cherry blossom trees framing the shot, clear Japanese sky, serene atmosphere, traditional or modern outfit' },
  { id: 'ce9a88c2-c962-45e2-abaa-c8979d48f8d5', name: 'Tokyo Drift', category: 'location', icon: '🏎️', hint: 'nighttime Tokyo street racing scene, neon-lit Shibuya streets, sports car, motion blur on background, Japanese signage, Fast & Furious vibes' },
  { id: 'e454956b-caf2-4913-a398-dbc03f1cbedf', name: 'Office Beach', category: 'location', icon: '🏖️', hint: 'surreal office desk setup on a tropical beach, laptop and documents on sand, waves in background, business clothes with bare feet, blue sky' },
  { id: 'd2e8ba04-9935-4dee-8bc4-39ac789746fc', name: 'Subway', category: 'location', icon: '🚇', hint: 'underground subway platform or train car, fluorescent lighting, tiled walls, urban commuter setting, motion blur on passing train' },
  { id: '36061eb7-4907-4cba-afb1-47afcf699873', name: 'Gallery', category: 'location', icon: '🖼️', hint: 'white-walled modern art gallery, large artworks on walls, polished concrete floor, minimalist lighting, person standing contemplating art' },
  { id: '6fb3e1f5-d721-4523-ac38-9902f2b2b850', name: 'Library', category: 'location', icon: '📚', hint: 'grand library with tall wooden bookshelves, warm amber reading lamp light, leather chairs, old books, academic and cozy atmosphere' },
  { id: '673cf0d4-c193-4fa2-8ad3-b4db4611e3ae', name: '505 Room', category: 'location', icon: '🚪', hint: 'moody hotel room, rumpled sheets, dim warm lamplight, window with city view, intimate late-night atmosphere, Arctic Monkeys aesthetic' },
  { id: 'd3e2b71d-b24b-462e-bd96-12f7a22b5142', name: 'Crossing the Street', category: 'location', icon: '🚶', hint: 'mid-stride crossing a busy urban street on crosswalk, city traffic blurred behind, confident walk, street-level camera angle' },
  { id: 'bab6e4bd-9093-4bb5-a371-01ef6cbd58ad', name: 'Escalator', category: 'location', icon: '🛗', hint: 'standing or posing on a mall or metro escalator, overhead fluorescent lights, metallic surfaces, urban transit setting, dynamic diagonal lines' },
  { id: '7696fd45-6e67-47d7-b800-096ce21cd449', name: 'Sitting on the Street', category: 'location', icon: '🛋️', hint: 'sitting casually on a city curb or sidewalk, urban street backdrop, relaxed pose, legs extended, street-level camera angle' },
  { id: '3f90dc5b-f474-4259-95c4-d29fbd6be645', name: 'Flight Mode', category: 'location', icon: '✈️', hint: 'inside an airplane cabin, window seat with clouds visible, overhead reading light, travel outfit, natural light from window' },

  // ── Experimental ──
  { id: '62355e77-7096-45ae-9bea-e7c5b88c3b70', name: 'Glitch', category: 'experimental', icon: '📺', hint: 'digital glitch distortion effect, RGB channel splitting, scan lines, corrupted data blocks, cyberpunk pixel artifacts overlaying the image' },
  { id: '7fa63380-64b7-48b1-b684-4c9ef37560a7', name: 'Paper Face', category: 'experimental', icon: '📄', hint: 'face appearing to be made of folded white paper or origami, creased edges, paper texture, sculptural 3D paper craft aesthetic' },
  { id: '34c50302-83ff-487d-b3a9-e35e501d80a7', name: 'Pixelated Face', category: 'experimental', icon: '🟩', hint: 'face deliberately pixelated in large mosaic blocks, rest of image sharp, censored identity effect, digital privacy aesthetic' },
  { id: '07a85fb3-4407-4122-a4eb-42124e57734c', name: 'CCTV', category: 'experimental', icon: '📹', hint: 'security camera footage look, grainy low-resolution, slight fish-eye, timestamp overlay, green/gray tint, surveillance camera angle from above' },
  { id: '2fcf02e2-919a-4642-8b31-d58bde5e6bd9', name: 'Mixed Media', category: 'experimental', icon: '🎨', hint: 'collage of photography mixed with hand-drawn illustration, paint strokes overlaid on photo, torn paper edges, multi-texture art piece' },
  { id: '372cc37b-9add-4952-a415-53db3998139f', name: 'Geominimal', category: 'experimental', icon: '📐', hint: 'geometric shapes overlaid on portrait, clean lines and circles framing the face, minimalist composition, solid color blocks, Bauhaus-inspired' },
  { id: '82edba1e-b093-4484-a25e-9276e0454999', name: 'Invertethereal', category: 'experimental', icon: '🔮', hint: 'inverted/negative color photograph, ethereal ghostly appearance, reversed tones, luminous whites become dark, surreal and otherworldly' },
  { id: '0b4dac9a-f73a-4e5b-a5a7-1a40ee40d6ac', name: 'Graffiti', category: 'experimental', icon: '🎨', hint: 'urban graffiti wall backdrop, spray paint art surrounding the subject, street art style, vibrant aerosol colors, concrete and brick textures' },

  // ── Beauty / Makeup ──
  { id: 'b7c621b5-9d3c-46a3-8efb-4cdfbc592271', name: 'Babydoll Makeup', category: 'concept', icon: '🎀', hint: 'doll-like makeup with big rosy cheeks, glossy pouty lips, fluttery lashes, soft dewy skin, innocent wide-eyed look, pink and peach tones' },
  { id: 'cc099663-9621-422e-8626-c8ee68953a0c', name: 'Bleached Brows', category: 'concept', icon: '👁️', hint: 'eyebrows bleached white/blonde creating an editorial alien-like look, high-fashion avant-garde makeup, stark contrast against skin' },
  { id: 'a2a42ada-75cc-42a9-be12-cb16c1dec2a8', name: 'Glazed Doll Skin', category: 'concept', icon: '✨', hint: 'ultra-dewy glass-skin finish, luminous highlight on cheekbones and nose, porcelain-smooth complexion, wet-look glossy makeup, soft ring light' },
  { id: 'b7908955-2868-4e35-87a0-35e50cb92e5d', name: 'Object Makeup', category: 'concept', icon: '💄', hint: 'creative makeup transforming face into an object or artwork, painted illusion cosmetics, abstract shapes and colors on skin, editorial art makeup' },
  { id: 'ea6f4dc0-d6dd-4bdf-a8cf-94ed1db91ab2', name: 'Hair Clips', category: 'concept', icon: '🦋', hint: 'multiple decorative hair clips, butterfly clips, jeweled barrettes scattered throughout hair, Y2K hair accessories, close-up on styled hair' },

  // ── Lifestyle ──
  { id: '7df83cc9-1e13-4bd0-b6ff-1e6a456b9e5a', name: 'Eating Food', category: 'location', icon: '🍜', hint: 'sitting at a table eating a meal, chopsticks or fork in hand, food dish in front, restaurant or kitchen setting, candid mid-bite moment' },
  { id: 'd24c016c-9fb1-47d0-9909-19f57a2830d4', name: 'Selfcare', category: 'mood', icon: '🧖', hint: 'cozy self-care moment, face mask or skincare products, fluffy robe, soft bathroom or bedroom lighting, relaxed peaceful expression, warm tones' },
  { id: 'bc00b419-f8ca-4887-a990-e2760c3cb761', name: 'Sunbathing', category: 'mood', icon: '☀️', hint: 'lying on a lounge chair or towel in direct sunlight, sunglasses on, warm golden sun on skin, poolside or beach, bright summer light' },
  { id: 'ba3d7634-447e-455c-98e3-63705d5403b8', name: 'Sand', category: 'mood', icon: '🏖️', hint: 'sand covering skin and body, beach setting, warm golden light, grains of sand texture visible, natural sun-kissed look, ocean nearby' },
  { id: '71ac929c-4002-4640-9b65-cb06402844c6', name: 'Sea Breeze', category: 'mood', icon: '🌊', hint: 'wind-blown hair at the coast, ocean spray mist, fresh blue-teal palette, flowing light fabric caught in breeze, bright coastal daylight' },
  { id: '79bfaa63-4e12-4ea2-8ada-7d4406eecece', name: "It's French", category: 'fashion', icon: '🇫🇷', hint: 'effortless French style, striped mariniere top, beret optional, red lip, baguette or cafe setting, Parisian street, chic minimal accessories' },
  { id: '0089e17c-d0f0-4d0c-b522-6d25c88a29fc', name: 'Japandi', category: 'concept', icon: '🎋', hint: 'minimalist Japanese-Scandinavian interior, natural wood and linen textures, neutral earth tones, clean lines, zen tranquility, soft indirect light' },
  { id: '0367d609-dfa1-4a81-a983-b2b19ecd6480', name: 'Tumblr', category: 'photo', icon: '📝', hint: 'early 2010s Tumblr aesthetic, soft grunge, fairy lights, pastel walls, indie bedroom, film grain overlay, melancholic dreamy atmosphere' },
  { id: 'b9e2d7dc-78e6-4f7d-95dd-b62690e7b200', name: 'Artwork', category: 'experimental', icon: '🖌️', hint: 'person rendered as a painted artwork, visible brush strokes, oil painting or watercolor texture, canvas-like quality, museum piece look' },
  { id: '4b66c2db-8166-4293-b1aa-5269c9effb07', name: 'Nail Check', category: 'selfie', icon: '💅', hint: 'close-up selfie showing off manicured nails near the face, hand posed to display nail art, soft focus on background, beauty content framing' },
  { id: '30458874-d9c0-4d5a-b2b7-597e0eee2404', name: 'Shoe Check', category: 'selfie', icon: '👟', hint: 'looking-down selfie showing shoes/sneakers on feet, legs and ground visible, sidewalk or interesting floor, outfit-of-the-day shoe focus' },
  { id: '1900111a-4ce8-42a7-9394-7367f0e0385c', name: 'Through The Glass', category: 'mood', icon: '🪟', hint: 'shot through a glass window or door, reflections layered over the face, rain drops or condensation on glass, voyeuristic separated feeling' },
  { id: '923e4fb0-d4ea-480c-876d-ac7cad862b9d', name: 'DMV', category: 'photo', icon: '🪪', hint: 'unflattering DMV/passport photo style, harsh flat flash, pale blue backdrop, deer-in-headlights expression, bureaucratic ID photo quality' },
  { id: '2a1898d0-548f-4433-8503-5721157b93a1', name: 'Double Take', category: 'experimental', icon: '👀', hint: 'motion blur double-take effect, head turning quickly, ghostly second position of face visible, dynamic movement captured mid-turn' },
  { id: 'a13917c7-02a4-450f-b007-e72d53151980', name: 'Street View', category: 'location', icon: '🛣️', hint: 'Google Street View camera perspective, wide-angle urban capture, standing on sidewalk, everyday city environment, surveillance-like candid angle' },
  { id: '12eda704-18e5-4783-aa0f-deba5296cc83', name: 'Long Legs', category: 'experimental', icon: '🦵', hint: 'exaggerated elongated legs effect through wide-angle lens distortion shot from low angle, legs appear impossibly long, fashion editorial trick' },

  // ── Selfie (expanded) ──
  { id: 'custom-selfie-mirror', name: 'Mirror Selfie', category: 'selfie', icon: '🪞', featured: true, hint: 'full-body mirror selfie, phone visible in hand, bedroom or bathroom mirror, outfit display, natural indoor lighting' },
  { id: 'custom-selfie-gym', name: 'Gym Mirror Selfie', category: 'selfie', icon: '💪', hint: 'gym mirror selfie showing workout outfit, gym equipment in background, overhead fluorescent lights, athletic wear, flexing or casual pose' },
  { id: 'custom-selfie-car', name: 'Car Selfie', category: 'selfie', icon: '🚗', hint: 'selfie from driver or passenger seat, natural window light on face, car interior visible, seatbelt on, golden hour through windshield' },
  { id: 'custom-selfie-bathroom', name: 'Bathroom Selfie', category: 'selfie', icon: '🚿', hint: 'bathroom mirror selfie, clean white tile background, overhead vanity lighting, fresh-faced casual look, phone covering part of face in mirror' },
  { id: 'custom-selfie-bed', name: 'Bed Selfie', category: 'selfie', icon: '🛏️', hint: 'lying in bed selfie, soft pillows and sheets visible, warm lamp light, relaxed cozy expression, phone held above face angle' },
  { id: 'custom-selfie-group', name: 'Group Selfie', category: 'selfie', icon: '👯', hint: 'group selfie with multiple people squeezed into frame, wide-angle, everyone smiling, social gathering or party setting, fun energy' },
  { id: 'custom-selfie-sunset', name: 'Sunset Selfie', category: 'selfie', icon: '🌅', hint: 'selfie with dramatic sunset sky in background, warm golden-orange rim light on face, silhouette edges, outdoor golden hour' },
  { id: 'custom-selfie-closeup', name: 'Extreme Close-up', category: 'selfie', icon: '👁️', hint: 'extreme close-up of face filling entire frame, one eye and partial face visible, skin texture detail, macro-like proximity, intense gaze' },
  { id: 'custom-selfie-laughing', name: 'Laughing Selfie', category: 'selfie', icon: '😂', hint: 'mid-laugh candid selfie, genuine open-mouth smile, crinkled eyes, slightly blurry from movement, authentic joy, casual setting' },
  { id: 'custom-selfie-pout', name: 'Duck Face / Pout', category: 'selfie', icon: '💋', hint: 'exaggerated pouty lips duck face selfie, cheeks sucked in, phone held high, playful flirty expression, soft beauty filter look' },

  // ── Era / Época ──
  { id: 'custom-era-50s', name: '1950s Pin-Up', category: 'era', icon: '🎀', featured: true, hint: 'classic 1950s pin-up style, victory rolls hairstyle, red lipstick, high-waisted shorts or polka-dot dress, retro Americana diner or vintage car' },
  { id: 'custom-era-60s', name: '1960s Mod', category: 'era', icon: '🌼', hint: '1960s mod fashion, geometric shift dress, go-go boots, thick eyeliner, Twiggy-inspired lashes, bold pop-art colors, Vespa or retro London backdrop' },
  { id: 'custom-era-70s', name: '1970s Disco', category: 'era', icon: '🪩', hint: '1970s disco era, sequined jumpsuit, platform shoes, afro or feathered hair, mirror ball reflections, warm amber club lighting, Studio 54 vibes' },
  { id: 'custom-era-80s', name: '1980s Neon', category: 'era', icon: '📼', hint: '1980s neon aesthetic, big teased hair, shoulder pads, leg warmers, bright neon pink/blue/green, synthwave grid, VHS tape distortion edges' },
  { id: 'custom-era-90s', name: '1990s Grunge', category: 'era', icon: '🎸', hint: '1990s grunge era, oversized flannel, Doc Martens, choker necklace, smeared dark eyeliner, muted gray-green tones, garage or concert venue' },
  { id: 'custom-era-2000s', name: '2000s Y2K', category: 'era', icon: '💿', hint: 'early 2000s Y2K pop culture, low-rise jeans, halter top, tiny sunglasses, butterfly clips, glossy lips, flip phone, chrome and bubblegum palette' },
  { id: 'custom-era-victorian', name: 'Victorian', category: 'era', icon: '🏰', hint: 'Victorian era dress, high lace collar, corset, dark heavy fabrics, ornate interior with velvet and dark wood, candlelight, sepia-warm tones' },
  { id: 'custom-era-roaring20s', name: 'Roaring 20s', category: 'era', icon: '🥂', hint: '1920s Great Gatsby era, flapper dress with fringe and beading, finger waves hair, Art Deco gold patterns, champagne glass, jazz club setting' },
  { id: 'custom-era-future', name: 'Futuristic 2080', category: 'era', icon: '🚀', hint: 'far-future 2080 fashion, holographic iridescent fabrics, sleek metallic accessories, LED-embedded clothing, clean white futuristic interior, chrome accents' },
  { id: 'custom-era-medieval', name: 'Medieval Fantasy', category: 'era', icon: '⚔️', hint: 'medieval fantasy costume, leather armor or flowing robes, sword or staff, stone castle courtyard, torchlight, epic fantasy color grading' },

  // ── Social / Redes ──
  { id: 'custom-social-instagram', name: 'Instagram Editorial', category: 'social', icon: '📸', featured: true, hint: 'polished Instagram-style editorial, warm VSCO filter tones, carefully composed, golden hour lighting, aspirational lifestyle, clean and curated aesthetic' },
  { id: 'custom-social-tiktok', name: 'TikTok Viral', category: 'social', icon: '🎵', hint: 'vertical phone-format framing, ring light reflection in eyes, trending pose, bedroom or studio backdrop, bright and punchy colors, Gen-Z energy' },
  { id: 'custom-social-pinterest', name: 'Pinterest Aesthetic', category: 'social', icon: '📌', hint: 'Pinterest moodboard quality, soft neutral palette, curated flat lay or styled portrait, dreamy bokeh, warm cream and blush tones, aspirational' },
  { id: 'custom-social-linkedin', name: 'LinkedIn Professional', category: 'social', icon: '💼', hint: 'professional headshot, business attire, clean blurred office background, confident smile, soft studio lighting, corporate but approachable' },
  { id: 'custom-social-dating', name: 'Dating App Profile', category: 'social', icon: '❤️', hint: 'flattering portrait with warm natural light, genuine smile, outdoor or coffee shop setting, approachable and attractive, slightly candid feel' },
  { id: 'custom-social-ugc', name: 'UGC Creator', category: 'social', icon: '📦', hint: 'user-generated content style, person holding and showing a product to camera, natural home lighting, authentic unpolished feel, phone-quality' },
  { id: 'custom-social-unboxing', name: 'Unboxing Content', category: 'social', icon: '📦', hint: 'hands opening a package or box, tissue paper and packaging visible, excited expression, product reveal moment, overhead or front camera angle' },
  { id: 'custom-social-storytime', name: 'Story Time', category: 'social', icon: '📱', hint: 'casual talking-to-camera framing, phone-distance selfie angle, expressive face mid-sentence, bedroom or living room background, storytelling energy' },
  { id: 'custom-social-ootd', name: 'OOTD (Outfit of the Day)', category: 'social', icon: '👗', hint: 'full-body outfit display, standing pose showing complete look, mirror or outdoor backdrop, fashion-forward styling, clean composition' },
  { id: 'custom-social-grwm', name: 'GRWM (Get Ready)', category: 'social', icon: '💄', hint: 'getting ready at a vanity mirror, makeup products spread on table, half-done makeup, bathroom or bedroom, ring light visible, beauty routine' },

  // ── Lifestyle ──
  { id: 'custom-life-coffee', name: 'Coffee Shop', category: 'lifestyle', icon: '☕', featured: true, hint: 'sitting in a cozy coffee shop, latte or cappuccino in hand, warm wood and exposed brick interior, soft ambient lighting, relaxed atmosphere' },
  { id: 'custom-life-cooking', name: 'Cooking at Home', category: 'lifestyle', icon: '🍳', hint: 'standing in a modern kitchen cooking, chopping vegetables or stirring a pan, apron on, warm overhead light, fresh ingredients on counter' },
  { id: 'custom-life-reading', name: 'Reading a Book', category: 'lifestyle', icon: '📚', hint: 'curled up reading a book, soft armchair or window seat, natural daylight, cozy blanket, absorbed and peaceful expression, warm interior' },
  { id: 'custom-life-yoga', name: 'Yoga / Meditation', category: 'lifestyle', icon: '🧘', hint: 'yoga pose on a mat, serene expression, athletic wear, natural light studio or outdoor setting, zen calm atmosphere, balanced composition' },
  { id: 'custom-life-shopping', name: 'Shopping Spree', category: 'lifestyle', icon: '🛍️', hint: 'walking with shopping bags from luxury stores, city street or mall corridor, confident stride, fashionable outfit, retail therapy energy' },
  { id: 'custom-life-brunch', name: 'Brunch Date', category: 'lifestyle', icon: '🥂', hint: 'seated at a bright brunch table, mimosa or orange juice, pancakes or avocado toast, sunlit cafe patio, white tablecloth, social and cheerful' },
  { id: 'custom-life-roadtrip', name: 'Road Trip', category: 'lifestyle', icon: '🚗', hint: 'leaning out of a car window on the highway, hair blowing in wind, vast open landscape, golden hour sun, freedom and adventure feeling' },
  { id: 'custom-life-picnic', name: 'Picnic in the Park', category: 'lifestyle', icon: '🧺', hint: 'sitting on a blanket in a green park, wicker basket and fruit, dappled sunlight through trees, gingham cloth, relaxed outdoor afternoon' },
  { id: 'custom-life-spa', name: 'Spa Day', category: 'lifestyle', icon: '🧖', hint: 'white fluffy robe, cucumber slices or face mask, spa environment with candles and towels, serene expression, soft warm steam atmosphere' },
  { id: 'custom-life-nightout', name: 'Night Out', category: 'lifestyle', icon: '🌃', hint: 'dressed up for a night out, city lights bokeh behind, dark evening atmosphere, glam makeup, cocktail or clutch in hand, neon reflections' },
  { id: 'custom-life-concert', name: 'At a Concert', category: 'lifestyle', icon: '🎤', hint: 'in a concert crowd, colorful stage lights beaming from behind, hands raised, phone flashlights, loud energy, music festival atmosphere' },
  { id: 'custom-life-beach', name: 'Beach Day', category: 'lifestyle', icon: '🏖️', hint: 'on the beach with ocean waves, swimwear, sandy skin, bright harsh sunlight, blue sky, beach towel or umbrella, carefree summer vibes' },
  { id: 'custom-life-ski', name: 'Ski Resort', category: 'lifestyle', icon: '⛷️', hint: 'snow-covered ski resort, wearing ski jacket and goggles on forehead, bright white snow, blue sky, mountain peaks, alpine lodge in background' },
  { id: 'custom-life-camping', name: 'Camping', category: 'lifestyle', icon: '⛺', hint: 'at a campsite with tent and campfire, flannel shirt, warm firelight glow on face, starry sky or forest backdrop, outdoor adventure' },

  // ── Pose ──
  { id: 'custom-pose-sitting-cafe', name: 'Sitting at Café', category: 'pose', icon: '☕', hint: 'seated at a small cafe table, one hand on coffee cup, legs crossed, relaxed posture, looking at camera or out the window, medium shot' },
  { id: 'custom-pose-walking-street', name: 'Walking Down Street', category: 'pose', icon: '🚶', hint: 'mid-stride walking on a city sidewalk, natural arm swing, looking forward or at camera, full body in motion, confident gait' },
  { id: 'custom-pose-leaning-wall', name: 'Leaning on Wall', category: 'pose', icon: '🧱', hint: 'leaning back against a textured wall, one foot up on wall, arms crossed or in pockets, casual cool stance, three-quarter body framing' },
  { id: 'custom-pose-lying-bed', name: 'Lying in Bed', category: 'pose', icon: '🛌', hint: 'lying on white sheets, camera from above or side angle, relaxed sprawled pose, soft bedroom light, pillow under head, intimate and cozy' },
  { id: 'custom-pose-dancing', name: 'Dancing', category: 'pose', icon: '💃', hint: 'caught mid-dance move, arms raised, body twisting, dynamic motion energy, slight motion blur on extremities, joyful expression, wide shot' },
  { id: 'custom-pose-running', name: 'Running / Jogging', category: 'pose', icon: '🏃', hint: 'running toward or past camera, athletic wear, hair flowing back, motion captured mid-stride, outdoor path or street, energetic and fit' },
  { id: 'custom-pose-looking-away', name: 'Looking Away (Candid)', category: 'pose', icon: '👀', hint: 'candid profile or three-quarter view looking away from camera, natural unposed moment, thoughtful gaze into distance, soft focus background' },
  { id: 'custom-pose-backview', name: 'Back View (Over Shoulder)', category: 'pose', icon: '↩️', hint: 'shot from behind, looking over one shoulder back at camera, back of outfit visible, scenic background, mysterious and alluring' },
  { id: 'custom-pose-crouching', name: 'Crouching / Low Angle', category: 'pose', icon: '🧎', hint: 'crouching low to the ground, camera at low angle looking up, urban or studio setting, streetwear-friendly pose, powerful grounded energy' },
  { id: 'custom-pose-jumping', name: 'Jumping / Mid-Air', category: 'pose', icon: '🦘', hint: 'captured mid-jump in the air, feet off ground, hair floating, arms spread or raised, joyful or powerful expression, sharp freeze-frame' },

  // ── Profession ──
  { id: 'custom-prof-ceo', name: 'CEO / Executive', category: 'profession', icon: '👔', hint: 'tailored business suit, corner office or boardroom setting, city skyline through floor-to-ceiling windows, power pose, sleek and polished look' },
  { id: 'custom-prof-doctor', name: 'Doctor', category: 'profession', icon: '🩺', hint: 'white lab coat, stethoscope around neck, clean hospital or clinic hallway, professional caring expression, bright fluorescent medical lighting' },
  { id: 'custom-prof-chef', name: 'Chef', category: 'profession', icon: '👨‍🍳', hint: 'white chef coat and toque hat, commercial kitchen with stainless steel, knife in hand or plating food, warm kitchen lighting, culinary setting' },
  { id: 'custom-prof-artist', name: 'Artist / Painter', category: 'profession', icon: '🎨', hint: 'paint-splattered apron, holding brush or palette, colorful canvases in background, bohemian art studio, natural north-light windows' },
  { id: 'custom-prof-musician', name: 'Musician', category: 'profession', icon: '🎸', hint: 'holding or playing an instrument — guitar, piano, or mic — stage or studio setting, moody colored lighting, performing or recording vibe' },
  { id: 'custom-prof-athlete', name: 'Athlete', category: 'profession', icon: '🏅', hint: 'athletic wear, mid-action sports pose, stadium or training facility, sweat glistening, determined expression, dynamic sports photography' },
  { id: 'custom-prof-pilot', name: 'Pilot', category: 'profession', icon: '✈️', hint: 'pilot uniform with cap and aviator sunglasses, cockpit or airplane backdrop, confident stance, blue sky, crisp professional airline aesthetic' },
  { id: 'custom-prof-scientist', name: 'Scientist', category: 'profession', icon: '🔬', hint: 'lab coat and safety goggles, holding test tubes or pipette, modern laboratory with equipment, cool blue-white clinical lighting' },
  { id: 'custom-prof-teacher', name: 'Teacher', category: 'profession', icon: '📖', hint: 'standing at a chalkboard or whiteboard, book in hand, classroom setting with desks, warm approachable expression, academic environment' },
  { id: 'custom-prof-firefighter', name: 'Firefighter', category: 'profession', icon: '🚒', hint: 'firefighter turnout gear with helmet, fire truck in background, soot on face, heroic stance, dramatic backlighting from flames or golden light' },

  // ── General (expanded) ──
  { id: 'custom-gen-cinematic', name: 'Cinematic', category: 'general', icon: '🎬', hint: 'widescreen cinematic composition, 2.39:1 aspect ratio feel, anamorphic lens flare, film color grading, dramatic key light with shadow, movie still quality' },
  { id: 'custom-gen-magazine', name: 'Magazine Cover', category: 'general', icon: '📰', hint: 'high-fashion magazine cover composition, perfectly lit studio portrait, confident direct gaze, clean background, editorial quality retouching. DO NOT add text or labels' },
  { id: 'custom-gen-passport', name: 'Passport Photo', category: 'general', icon: '🪪', hint: 'standard passport photo, flat white background, front-facing neutral expression, even flat lighting, shoulders visible, formal ID photo format. DO NOT add text or labels' },
  { id: 'custom-gen-headshot', name: 'Headshot', category: 'general', icon: '🎯', hint: 'professional headshot, soft studio lighting with catchlight in eyes, blurred neutral background, head and shoulders framing, warm approachable expression' },
  { id: 'custom-gen-bw', name: 'Black & White', category: 'general', icon: '⚫', hint: 'black and white photography, high contrast, rich tonal range, no color, dramatic shadows, timeless monochrome portrait, silver gelatin print feel' },
  { id: 'custom-gen-softfocus', name: 'Soft Focus', category: 'general', icon: '🌸', hint: 'dreamy soft focus with diffusion filter, glowing highlights, romantic haze, vaseline-on-lens effect, gentle pastel tones, flattering portrait light' },
  { id: 'custom-gen-highkey', name: 'High Key', category: 'general', icon: '☁️', hint: 'high-key lighting, bright white background, minimal shadows, airy and clean, overlit with soft fill, fashion catalog aesthetic, pure and fresh' },
  { id: 'custom-gen-lowkey', name: 'Low Key', category: 'general', icon: '🖤', hint: 'low-key dramatic lighting, mostly dark frame with single light source, deep shadows, Rembrandt or split lighting, moody and intense, dark background' },
  { id: 'custom-gen-portrait', name: 'Portrait Studio', category: 'general', icon: '📸', hint: 'classic studio portrait, professional backdrop paper, three-point lighting setup, clean catch lights, traditional portraiture framing and composition' },
  { id: 'custom-gen-candid', name: 'Candid Moment', category: 'general', icon: '📷', hint: 'unposed candid photograph, natural mid-action moment, genuine expression, documentary style, available light, authentic and spontaneous feel' },

  // ── Fashion (expanded) ──
  { id: 'custom-fash-oldmoney', name: 'Old Money', category: 'fashion', icon: '🏛️', hint: 'old-money prep style, cable-knit sweater draped over shoulders, polo shirt, khakis or tennis skirt, country club or yacht setting, muted earth tones' },
  { id: 'custom-fash-streetwear', name: 'Streetwear', category: 'fashion', icon: '🧢', hint: 'hypebeast streetwear, oversized hoodie, sneakers, snapback cap, crossbody bag, urban concrete backdrop, bold graphic prints, skate-culture vibe' },
  { id: 'custom-fash-cottagecore', name: 'Cottagecore', category: 'fashion', icon: '🌾', hint: 'flowing floral dress, straw hat, wildflower meadow backdrop, soft golden light, rustic farm aesthetic, linen and lace fabrics, pastoral romance' },
  { id: 'custom-fash-darkacademia', name: 'Dark Academia', category: 'fashion', icon: '📚', hint: 'tweed blazer, plaid skirt or trousers, turtleneck, old library or Gothic university setting, warm amber lamp light, moody brown and cream palette' },
  { id: 'custom-fash-coastal', name: 'Coastal Grandmother', category: 'fashion', icon: '🐚', hint: 'relaxed coastal elegance, linen pants, cashmere wrap, neutral beige and white palette, beachside cottage porch, Nancy Meyers movie aesthetic' },
  { id: 'custom-fash-ballet', name: 'Balletcore', category: 'fashion', icon: '🩰', hint: 'ballet-inspired fashion, wrap top, tulle skirt, ribbon details, ballet flats with ankle ties, soft pink and white palette, dance studio or mirror wall' },
  { id: 'custom-fash-athleisure', name: 'Athleisure', category: 'fashion', icon: '🏃', hint: 'stylish athletic wear as everyday fashion, matching set, clean sneakers, slicked-back hair, gym-to-street transition, modern and sporty clean lines' },
  { id: 'custom-fash-boho', name: 'Boho Chic', category: 'fashion', icon: '🪶', hint: 'bohemian layered style, flowing maxi dress, fringe details, layered necklaces, suede boots, warm desert or festival backdrop, earthy free-spirit aesthetic' },
  { id: 'custom-fash-minimal', name: 'Minimalist', category: 'fashion', icon: '◻️', hint: 'ultra-minimalist fashion, clean silhouettes, monochrome palette, no accessories, architectural clothing, stark white or gray backdrop, less-is-more elegance' },
  { id: 'custom-fash-powersuit', name: 'Power Suit', category: 'fashion', icon: '👔', hint: 'sharp tailored power suit, structured shoulders, bold solid color, pointed heels or polished loafers, corporate-chic, glass building or marble lobby' },

  // ── Photography (expanded) ──
  { id: 'custom-photo-polaroid', name: 'Polaroid', category: 'photo', icon: '📸', hint: 'shot on Polaroid instant camera, washed-out warm colors, soft focus, slight vignette, cyan shadows, warm highlights, vintage dreamy quality — NOT a polaroid frame, apply the FILM LOOK' },
  { id: 'custom-photo-medium', name: 'Medium Format', category: 'photo', icon: '🎞️', hint: 'shot on Hasselblad medium format, extreme sharpness, creamy bokeh, rich colors, shallow depth of field, professional studio quality' },
  { id: 'custom-photo-drone', name: 'Drone Aerial', category: 'photo', icon: '🛸', hint: 'aerial drone shot from above, bird\'s eye view, person small in frame, dramatic landscape visible, deep depth of field' },
  { id: 'custom-photo-disposable', name: 'Disposable Camera', category: 'photo', icon: '📷', hint: 'shot on disposable camera, flash on, red-eye, grainy, slightly blurry, authentic party vibes, warm cast, light leaks' },
  { id: 'custom-photo-infrared', name: 'Infrared', category: 'photo', icon: '🔴', hint: 'infrared photography, white foliage, red/magenta sky, surreal colors, dream-like atmosphere' },
  { id: 'custom-photo-longexpo', name: 'Long Exposure', category: 'photo', icon: '💫', hint: 'long exposure photography, motion blur on moving elements, light trails, silky water, person sharp against blurred surroundings' },
  { id: 'custom-photo-tiltshift', name: 'Tilt-Shift', category: 'photo', icon: '🔍', hint: 'tilt-shift miniature effect, selective focus band, everything looks like a tiny model, saturated colors' },
  { id: 'custom-photo-double', name: 'Double Exposure', category: 'photo', icon: '👥', hint: 'double exposure photography, person\'s silhouette blended with landscape or texture, artistic overlay, ethereal' },
  { id: 'custom-photo-noir', name: 'Film Noir', category: 'photo', icon: '🎬', hint: 'film noir style, black and white, harsh shadows, Venetian blinds lighting, dramatic contrast, detective movie atmosphere' },
  { id: 'custom-photo-paparazzi', name: 'Paparazzi', category: 'photo', icon: '📸', hint: 'paparazzi telephoto shot, flash burst, caught off-guard, slightly blurry motion, nighttime, flash reflecting in eyes' },

  // ── Selfie (expanded) ──
  { id: 'custom-selfie-pool', name: 'Pool Selfie', category: 'selfie', icon: '🏊', hint: 'selfie at the pool, turquoise water reflecting light, wet hair and skin, swimwear, bright midday sun, splashing water droplets' },
  { id: 'custom-selfie-airplane', name: 'Airplane Selfie', category: 'selfie', icon: '✈️', hint: 'selfie from airplane window seat, clouds and sky visible through oval window, travel pillow or headphones, cabin interior, excitement to travel' },
  { id: 'custom-selfie-messy', name: 'Messy Hair Selfie', category: 'selfie', icon: '💇', hint: 'tousled messy bed-head hair selfie, just-woke-up look, natural no-makeup face, soft morning window light, effortlessly attractive' },
  { id: 'custom-selfie-nomakeup', name: 'No Makeup Selfie', category: 'selfie', icon: '🧖', hint: 'bare-faced no-makeup selfie, clean natural skin, soft daylight, minimal styling, authentic and fresh-faced, raw beauty' },
  { id: 'custom-selfie-drunk', name: 'Drunk Selfie', category: 'selfie', icon: '🍷', hint: 'slightly blurry party selfie, flushed cheeks, droopy smile, flash on, nightclub or bar background, messy hair, fun chaotic energy' },
  { id: 'custom-selfie-wakeup', name: 'Waking Up Selfie', category: 'selfie', icon: '😴', hint: 'just woke up in bed, puffy sleepy eyes, pillow creases on face, soft morning light through curtains, cozy rumpled blankets' },
  { id: 'custom-selfie-work', name: 'Work Selfie', category: 'selfie', icon: '💼', hint: 'selfie at the office or workspace, professional attire visible, desk and computer in background, fluorescent office lighting, casual work break moment' },
  { id: 'custom-selfie-rainy', name: 'Rainy Day Selfie', category: 'selfie', icon: '🌧️', hint: 'selfie in the rain, water droplets on face and hair, umbrella edge visible, wet city streets behind, glistening rain reflections' },
  { id: 'custom-selfie-festival', name: 'Festival Selfie', category: 'selfie', icon: '🎪', hint: 'music festival selfie, glitter makeup, flower crown or neon body paint, stage lights in background, crowd energy, outdoor summer vibes' },
  { id: 'custom-selfie-foodie', name: 'Foodie Selfie', category: 'selfie', icon: '🍕', hint: 'selfie while holding food up to mouth — pizza, ice cream, or donut — playful expression, restaurant or street food setting, about to take a bite' },

  // ── Mood (expanded) ──
  { id: 'custom-mood-golden', name: 'Golden Hour', category: 'mood', icon: '🌅', featured: true, hint: 'shot during golden hour, warm amber sunlight at low angle, long soft shadows, golden skin glow, sun flare, magic hour warmth and intimacy' },
  { id: 'custom-mood-rainywindow', name: 'Rainy Window', category: 'mood', icon: '🌧️', hint: 'looking out through a rain-streaked window, water droplets in focus on glass, blurry city lights behind, melancholic introspective mood, cool blue tones' },
  { id: 'custom-mood-cozywinter', name: 'Cozy Winter', category: 'mood', icon: '🧣', hint: 'bundled up in a thick knit sweater and scarf, warm mug in hands, snowy window or fireplace glow, soft warm lighting, hygge winter comfort' },
  { id: 'custom-mood-summerhaze', name: 'Summer Haze', category: 'mood', icon: '☀️', hint: 'hazy overexposed summer afternoon, heat shimmer, sun-bleached warm tones, lens flare, lazy carefree atmosphere, slightly washed-out dreamy quality' },
  { id: 'custom-mood-melancholic', name: 'Melancholic', category: 'mood', icon: '😔', hint: 'sad introspective mood, muted desaturated blue-gray tones, downcast eyes, overcast diffused light, solitary figure, quiet emotional atmosphere' },
  { id: 'custom-mood-euphoric', name: 'Euphoric', category: 'mood', icon: '🤩', hint: 'ecstatic joyful energy, bright saturated colors, confetti or sparkles, wide genuine smile, dynamic movement, warm vibrant high-energy lighting' },
  { id: 'custom-mood-mysterious', name: 'Mysterious', category: 'mood', icon: '🌑', hint: 'dark mysterious atmosphere, face partially hidden in shadow, single narrow light source, deep blacks, cool blue undertones, enigmatic and secretive' },
  { id: 'custom-mood-nostalgic', name: 'Nostalgic', category: 'mood', icon: '📻', hint: 'warm vintage nostalgic feel, faded colors, light leaks, soft grain, amber and sepia-warm palette, reminiscent of old family photographs' },
  { id: 'custom-mood-ethereal', name: 'Ethereal', category: 'mood', icon: '🦋', hint: 'otherworldly ethereal beauty, soft backlighting halo, flowing fabrics, pastel lavender and white tones, dreamy bokeh, fairy-tale lightness' },
  { id: 'custom-mood-powerful', name: 'Powerful', category: 'mood', icon: '⚡', hint: 'strong powerful stance, dramatic low-angle shot, bold contrast lighting, dark stormy backdrop, intense expression, heroic and commanding energy' },

  // ── Concept (expanded) ──
  { id: 'custom-concept-angel', name: 'Angel / Wings', category: 'concept', icon: '😇', hint: 'ethereal angel with large white feathered wings, heavenly golden-white backlight, flowing white garments, halo glow, clouds, divine serenity' },
  { id: 'custom-concept-demon', name: 'Demon / Dark', category: 'concept', icon: '😈', hint: 'dark demonic aesthetic, black or red horns, dark smoky atmosphere, red and black color palette, glowing ember eyes, hellfire undertones' },
  { id: 'custom-concept-mermaid', name: 'Mermaid', category: 'concept', icon: '🧜', hint: 'mermaid with iridescent fish tail, underwater or shoreline setting, seashell accessories, flowing wet hair, teal and aquamarine tones, ocean light' },
  { id: 'custom-concept-fairy', name: 'Fairy', category: 'concept', icon: '🧚', hint: 'tiny translucent fairy wings, sitting on a mushroom or flower, sparkling magical dust particles, miniature enchanted forest, soft green and gold light' },
  { id: 'custom-concept-royalty', name: 'Royalty / Crown', category: 'concept', icon: '👑', hint: 'wearing an ornate jeweled crown or tiara, regal velvet robes, throne room or palace setting, rich gold and crimson palette, royal portrait composition' },
  { id: 'custom-concept-warrior', name: 'Warrior', category: 'concept', icon: '⚔️', hint: 'battle-ready warrior in armor, sword or shield in hand, war-paint on face, dramatic battlefield or arena backdrop, gritty and fierce' },
  { id: 'custom-concept-cyberpunk', name: 'Cyberpunk', category: 'concept', icon: '🤖', hint: 'cyberpunk aesthetic, neon-lit rain-soaked streets, cyber implants and LED accessories, holographic HUD elements, magenta and cyan palette, dystopian city' },
  { id: 'custom-concept-steampunk', name: 'Steampunk', category: 'concept', icon: '⚙️', hint: 'Victorian steampunk style, brass goggles, leather corset with gears, copper mechanical accessories, steam and cog machinery backdrop, sepia-warm tones' },
  { id: 'custom-concept-superhero', name: 'Superhero', category: 'concept', icon: '🦸', hint: 'superhero costume with cape, heroic power pose, wind blowing cape dramatically, city rooftop at night, dynamic action-ready stance, comic-book lighting' },
  { id: 'custom-concept-goddess', name: 'Goddess', category: 'concept', icon: '🏛️', hint: 'Greek goddess aesthetic, draped white and gold fabric, laurel wreath crown, marble columns and temple ruins, divine golden-hour light, Olympian grandeur' },

  // ── Location (expanded) ──
  { id: 'custom-loc-tokyo', name: 'Tokyo at Night', category: 'location', icon: '🗼', hint: 'nighttime Tokyo, neon signs in Japanese kanji, narrow Shinjuku alley, rain-wet reflective streets, vibrant pink and blue neon glow, urban energy' },
  { id: 'custom-loc-paris', name: 'Paris Café', category: 'location', icon: '🥐', hint: 'Parisian sidewalk cafe, small round table with espresso, Haussmann buildings behind, warm afternoon light, beret optional, croissant on plate, charming' },
  { id: 'custom-loc-nyc', name: 'NYC Times Square', category: 'location', icon: '🗽', hint: 'Times Square New York, massive LED billboards, yellow taxi cabs, bustling crowd, bright commercial neon, urban concrete jungle energy. DO NOT add text or labels' },
  { id: 'custom-loc-santorini', name: 'Santorini', category: 'location', icon: '🏝️', hint: 'Santorini Greece, white-washed buildings with blue domed rooftops, Aegean Sea behind, bright sunny Mediterranean light, cobblestone paths' },
  { id: 'custom-loc-london', name: 'London Rain', category: 'location', icon: '☔', hint: 'rainy London street, red telephone booth or double-decker bus, wet pavement reflections, gray overcast sky, umbrella, British urban atmosphere' },
  { id: 'custom-loc-dubai', name: 'Dubai Skyline', category: 'location', icon: '🏙️', hint: 'Dubai skyline with Burj Khalifa, ultra-modern glass skyscrapers, golden desert sunset light, luxury and opulence, sleek futuristic architecture' },
  { id: 'custom-loc-bali', name: 'Bali Temple', category: 'location', icon: '🛕', hint: 'Balinese Hindu temple with ornate stone carvings, tropical jungle surrounding, golden morning mist, incense smoke, spiritual and exotic atmosphere' },
  { id: 'custom-loc-venice', name: 'Venice Canals', category: 'location', icon: '🛶', hint: 'Venice canal with gondola, colorful Italian building facades reflecting in water, arched stone bridge, warm golden Mediterranean light, romantic ambiance' },
  { id: 'custom-loc-sahara', name: 'Sahara Desert', category: 'location', icon: '🏜️', hint: 'vast Sahara sand dunes, golden-orange sand stretching to horizon, harsh bright sun, long dramatic shadows, lone figure in desert expanse' },
  { id: 'custom-loc-aurora', name: 'Northern Lights', category: 'location', icon: '🌌', hint: 'Northern Lights aurora borealis in sky, green and purple light curtains, snowy Arctic landscape, person silhouetted against night sky, breathtaking' },

  // ── Era (expanded) ──
  { id: 'custom-era-egypt', name: 'Ancient Egypt', category: 'era', icon: '🏺', hint: 'ancient Egyptian styling, gold collar necklace, kohl-lined eyes, linen wrap, pyramids or temple columns in background, warm desert light, pharaoh aesthetic' },
  { id: 'custom-era-greece', name: 'Ancient Greece', category: 'era', icon: '🏛️', hint: 'ancient Greek draped toga or chiton, olive wreath crown, marble temple columns, Mediterranean sun, classical sculpture-inspired pose, warm stone tones' },
  { id: 'custom-era-renaissance', name: 'Renaissance', category: 'era', icon: '🎨', hint: 'Renaissance painting aesthetic, rich velvet and brocade fabrics, Botticelli-inspired soft light, gilded frame composition, muted earth and jewel tones' },
  { id: 'custom-era-baroque', name: 'Baroque', category: 'era', icon: '🖼️', hint: 'Baroque drama, Caravaggio-style chiaroscuro lighting, ornate gold and crimson fabrics, theatrical dark background, dramatic gesture, opulent excess' },
  { id: 'custom-era-artdeco', name: 'Art Deco', category: 'era', icon: '💎', hint: '1920s Art Deco style, geometric gold patterns, sleek beaded gown, marcelled waves hair, black and gold palette, Gatsby-era glamour, chrome and glass' },
  { id: 'custom-era-prohibition', name: 'Prohibition Era', category: 'era', icon: '🎩', hint: '1920s-30s speakeasy setting, pinstripe suit or flapper dress, smoky dim bar, jazz band backdrop, amber whiskey tones, gangster-era mystery' },
  { id: 'custom-era-wildwest', name: 'Wild West', category: 'era', icon: '🤠', hint: 'Wild West frontier style, cowboy hat, leather boots, denim and leather, dusty saloon or desert canyon, warm sepia-toned sunlight, rugged Americana' },
  { id: 'custom-era-space60s', name: 'Space Age 60s', category: 'era', icon: '🛸', hint: '1960s Space Age fashion, silver metallic mini dress, white go-go boots, geometric hair, futuristic set design, clean white and chrome, retro-futurism' },
  { id: 'custom-era-cyber2077', name: 'Cyberpunk 2077', category: 'era', icon: '🌆', hint: 'Cyberpunk 2077 game aesthetic, neon-drenched megacity, cyber implants and chrome body mods, armored street fashion, yellow and red neon, gritty future noir' },
  { id: 'custom-era-postapoc', name: 'Post-Apocalyptic', category: 'era', icon: '☢️', hint: 'post-apocalyptic wasteland, tattered layered clothing, dust and debris, ruined buildings, harsh overcast sky, survival gear and goggles, Mad Max aesthetic' },

  // ── Social (expanded) ──
  { id: 'custom-social-youtube', name: 'YouTube Thumbnail', category: 'social', icon: '▶️', hint: 'exaggerated surprised/excited facial expression, bright saturated colors, clean background, face filling most of frame, high contrast studio lighting. DO NOT add text or labels' },
  { id: 'custom-social-twitch', name: 'Twitch Stream', category: 'social', icon: '🎮', hint: 'gaming setup with RGB-lit keyboard and monitors, headset on, webcam angle from desk level, dark room with screen glow and LED strip backlighting. DO NOT add text or labels' },
  { id: 'custom-social-bereal', name: 'BeReal', category: 'social', icon: '📱', hint: 'dual-camera BeReal style, front and back camera simultaneously, casual unfiltered everyday moment, raw and unposed, natural lighting, authentic snapshot' },
  { id: 'custom-social-vlog', name: 'Vlog Intro', category: 'social', icon: '🎥', hint: 'vlogging on camera, wide-angle selfie view, outdoor or room backdrop, talking to lens, animated hand gestures, natural daylight, YouTube creator energy' },
  { id: 'custom-social-podcast', name: 'Podcast Cover', category: 'social', icon: '🎙️', hint: 'professional podcast setup, large condenser microphone in frame, headphones on, acoustic foam wall, warm studio lighting, thoughtful speaking expression. DO NOT add text or labels' },
  { id: 'custom-social-brandcollab', name: 'Brand Collab', category: 'social', icon: '🤝', hint: 'sponsored content aesthetic, product elegantly held or displayed, curated lifestyle backdrop, polished lighting, influencer marketing quality, aspirational' },
  { id: 'custom-social-haul', name: 'Haul Video', category: 'social', icon: '🛍️', hint: 'surrounded by shopping bags and boxes, holding up clothing item or product, bed or couch setting, bright ring light, excited unboxing energy' },
  { id: 'custom-social-workout', name: 'Workout Post', category: 'social', icon: '💪', hint: 'post-workout gym photo, athletic wear, sweaty glow on skin, gym equipment in background, flexing or victory pose, fitness motivation aesthetic' },
  { id: 'custom-social-travel', name: 'Travel Post', category: 'social', icon: '✈️', hint: 'iconic travel destination backdrop, suitcase or passport visible, travel outfit, golden hour at landmark, wanderlust aspirational, postcard-worthy composition' },
  { id: 'custom-social-foodreview', name: 'Food Review', category: 'social', icon: '🍽️', hint: 'holding or pointing at a beautiful dish, restaurant table setting, food styled in foreground, expressive reviewing face, warm restaurant ambient lighting' },

  // ── Lifestyle (expanded) ──
  { id: 'custom-life-wine', name: 'Wine Tasting', category: 'lifestyle', icon: '🍷', hint: 'holding a glass of red wine, vineyard or cellar setting, swirling wine elegantly, warm golden light, sophisticated and mature atmosphere' },
  { id: 'custom-life-artgallery', name: 'Art Gallery', category: 'lifestyle', icon: '🖼️', hint: 'standing in a white-walled gallery contemplating modern art, minimalist space, polished floor, soft track lighting, cultured and thoughtful pose' },
  { id: 'custom-life-farmersmarket', name: 'Farmers Market', category: 'lifestyle', icon: '🌽', hint: 'browsing an outdoor farmers market, colorful produce displays, canvas tote bag, sunny morning light, linen clothing, fresh and wholesome atmosphere' },
  { id: 'custom-life-movienight', name: 'Movie Night', category: 'lifestyle', icon: '🍿', hint: 'cozy movie night at home, popcorn bowl, TV glow on face in dark room, blanket and couch, casual loungewear, warm intimate ambiance' },
  { id: 'custom-life-rooftop', name: 'Rooftop Party', category: 'lifestyle', icon: '🎉', hint: 'rooftop party at sunset, city skyline panorama behind, string lights and cocktails, dressed up, warm golden-blue twilight, social and glamorous' },
  { id: 'custom-life-rainydayin', name: 'Rainy Day In', category: 'lifestyle', icon: '🌧️', hint: 'cozy indoor rainy day, oversized sweater, hot tea or cocoa, rain on windows, soft lamp light, books and candles, peaceful solitude' },
  { id: 'custom-life-sunsetdrive', name: 'Sunset Drive', category: 'lifestyle', icon: '🌅', hint: 'driving at sunset, arm out the window, wind in hair, warm orange dashboard light, open road ahead, convertible or vintage car, freedom vibes' },
  { id: 'custom-life-morning', name: 'Morning Routine', category: 'lifestyle', icon: '☀️', hint: 'early morning routine, fresh face, coffee in kitchen, soft dawn light through window, robe or casual pajamas, calm and productive start' },
  { id: 'custom-life-latenight', name: 'Late Night Study', category: 'lifestyle', icon: '📖', hint: 'late-night studying at a desk, single desk lamp, books and laptop open, tired but focused, dark room with warm pool of light, academic grind' },
  { id: 'custom-life-festival', name: 'Festival / Rave', category: 'lifestyle', icon: '🎪', hint: 'music festival or rave, neon body paint, glitter, LED accessories, laser beams and stage lights behind, dancing in crowd, euphoric nighttime energy' },

  // ── Pose (expanded) ──
  { id: 'custom-pose-floor', name: 'Sitting on Floor', category: 'pose', icon: '🧘', hint: 'sitting cross-legged or casually on the floor, looking up at camera from below, relaxed posture, studio or bedroom setting, low-angle shot' },
  { id: 'custom-pose-grass', name: 'Lying on Grass', category: 'pose', icon: '🌿', hint: 'lying flat on green grass, camera directly overhead, hair spread out, wildflowers around, bright daylight, relaxed serene expression, park setting' },
  { id: 'custom-pose-arms', name: 'Arms Crossed', category: 'pose', icon: '💪', hint: 'standing with arms crossed over chest, confident assertive stance, direct eye contact, shoulders square to camera, half-body framing' },
  { id: 'custom-pose-hairflip', name: 'Hair Flip', category: 'pose', icon: '💇', hint: 'caught mid-hair-flip, hair arc frozen in motion, dramatic wind effect, slight motion blur on hair ends, glamorous and dynamic, editorial energy' },
  { id: 'custom-pose-blowkiss', name: 'Blowing a Kiss', category: 'pose', icon: '💋', hint: 'hand raised near lips blowing a kiss toward camera, playful flirty expression, wink or pout, close-up portrait framing' },
  { id: 'custom-pose-peace', name: 'Peace Sign', category: 'pose', icon: '✌️', hint: 'holding up a peace sign near face, fun casual expression, close-up or selfie framing, playful and youthful energy' },
  { id: 'custom-pose-pockets', name: 'Hands in Pockets', category: 'pose', icon: '🧍', hint: 'standing with both hands in pockets, relaxed cool stance, full or three-quarter body shot, urban backdrop, effortlessly stylish and collected' },
  { id: 'custom-pose-stretch', name: 'Stretching', category: 'pose', icon: '🤸', hint: 'arms raised overhead in a stretch, elongated body line, morning or post-workout feeling, athletic or casual wear, natural extension' },
  { id: 'custom-pose-twirl', name: 'Twirling / Spinning', category: 'pose', icon: '💫', hint: 'caught mid-twirl with skirt or dress flowing outward in circle, motion blur on fabric, joyful spinning, outdoor or studio, dynamic and playful' },
  { id: 'custom-pose-eating', name: 'Eating / Drinking', category: 'pose', icon: '🍵', hint: 'holding cup or glass near lips, about to sip or eat, cozy setting, candid mid-action moment, warm soft lighting, lifestyle content framing' },

  // ── Profession (expanded) ──
  { id: 'custom-prof-model', name: 'Model', category: 'profession', icon: '💃', hint: 'professional fashion model pose, editorial stance, runway-ready expression, sleek styling, studio or urban backdrop, high-fashion photography quality' },
  { id: 'custom-prof-dj', name: 'DJ', category: 'profession', icon: '🎧', hint: 'behind DJ turntables and mixer, over-ear headphones, neon club lighting, crowd silhouettes, electronic music atmosphere, focused on equipment' },
  { id: 'custom-prof-photographer', name: 'Photographer', category: 'profession', icon: '📸', hint: 'holding a DSLR camera, camera strap around neck, looking through viewfinder or reviewing shots, studio or outdoor location, creative professional' },
  { id: 'custom-prof-architect', name: 'Architect', category: 'profession', icon: '📐', hint: 'smart-casual attire, holding blueprints or standing in front of a modern building, clean geometric lines in background, construction site or studio' },
  { id: 'custom-prof-astronaut', name: 'Astronaut', category: 'profession', icon: '🧑‍🚀', hint: 'NASA-style spacesuit with helmet visor, stars and Earth visible through visor reflection, space station or launchpad, dramatic dark-and-light contrast' },
  { id: 'custom-prof-barista', name: 'Barista', category: 'profession', icon: '☕', hint: 'barista apron, pouring latte art at an espresso machine, coffee shop counter, warm pendant lighting, beans and cups in background, artisan coffee craft' },
  { id: 'custom-prof-nurse', name: 'Nurse', category: 'profession', icon: '🏥', hint: 'medical scrubs, hospital corridor or patient room, stethoscope, caring confident expression, bright clean clinical environment, healthcare professional' },
  { id: 'custom-prof-lawyer', name: 'Lawyer', category: 'profession', icon: '⚖️', hint: 'formal business suit, courthouse steps or law library with leather-bound books, holding legal folder, authoritative and polished, warm wood tones' },
  { id: 'custom-prof-engineer', name: 'Engineer', category: 'profession', icon: '🔧', hint: 'hard hat and safety vest, industrial or construction site backdrop, holding tools or tablet, machinery in background, practical and competent' },
  { id: 'custom-prof-fashiondesigner', name: 'Fashion Designer', category: 'profession', icon: '✂️', hint: 'measuring tape draped around neck, sketching at a design table, fabric swatches and mannequin nearby, atelier studio, creative and stylish workspace' },

  // ── Experimental (expanded) ──
  { id: 'custom-exp-hologram', name: 'Hologram', category: 'experimental', icon: '🌀', hint: 'translucent holographic projection effect, scan lines visible through semi-transparent body, blue and cyan light emission, sci-fi hologram technology' },
  { id: 'custom-exp-xray', name: 'X-Ray', category: 'experimental', icon: '☠️', hint: 'X-ray photography effect, skeletal bones visible through skin, medical imaging blue-white tones, translucent body, radiograph aesthetic' },
  { id: 'custom-exp-thermal', name: 'Thermal Vision', category: 'experimental', icon: '🌡️', hint: 'thermal infrared camera view, heat-map color spectrum from blue to red/yellow, body heat visible, FLIR camera-style imagery, cold blue background' },
  { id: 'custom-exp-underwater', name: 'Underwater', category: 'experimental', icon: '🫧', hint: 'fully submerged underwater, hair floating weightlessly, bubbles rising, dappled light from surface above, aquamarine blue-green water, serene and surreal' },
  { id: 'custom-exp-zerog', name: 'Zero Gravity', category: 'experimental', icon: '🪐', hint: 'floating in zero gravity, hair and clothes drifting upward, objects suspended mid-air around person, dark space or white void, weightless surreal' },
  { id: 'custom-exp-miniature', name: 'Miniature / Tilt', category: 'experimental', icon: '🔍', hint: 'person shrunk to miniature size in an oversized world, sitting on a regular object that appears giant, forced perspective, whimsical tiny-person effect' },
  { id: 'custom-exp-mirror', name: 'Mirror Shatter', category: 'experimental', icon: '🪞', hint: 'shattered mirror fragments each reflecting a different angle of the face, cracked glass radiating outward, fractured identity, dramatic and sharp' },
  { id: 'custom-exp-smoke', name: 'Smoke / Fog', category: 'experimental', icon: '🌫️', hint: 'thick colored smoke bombs surrounding the person, billowing fog in vibrant colors, obscured background, atmospheric and mystical, smoke swirling' },
  { id: 'custom-exp-neonoutline', name: 'Neon Outline', category: 'experimental', icon: '💜', hint: 'glowing neon light outline tracing the body contour, dark background, electric purple/pink/blue edge glow, body silhouette defined by neon lines only' },
  { id: 'custom-exp-clone', name: 'Clone Army', category: 'experimental', icon: '👯', hint: 'multiple identical copies of the same person filling the frame, rows or grid of clones, identical outfits and poses, surreal repetition, uncanny and eerie' },

  // ── Expressions / Face Gestures ──
  { id: 'custom-expr-bitinglip', name: 'Biting Lip', category: 'expression', icon: '😏', hint: 'lower lip gently bitten by top teeth, slightly narrowed seductive eyes, chin tilted slightly down, subtle tension in jaw, flirty intimate expression' },
  { id: 'custom-expr-sideeye', name: 'Side Eye', category: 'expression', icon: '👀', hint: 'eyes looking sideways without turning head, suspicious or judging expression, one eyebrow slightly raised, subtle smirk, sassy three-quarter face angle' },
  { id: 'custom-expr-tongueout', name: 'Tongue Out', category: 'expression', icon: '😛', hint: 'tongue sticking out playfully, wide eyes, fun rebellious expression, punk or silly energy, close-up portrait, youthful and irreverent' },
  { id: 'custom-expr-wink', name: 'Wink', category: 'expression', icon: '😉', hint: 'one eye closed in a deliberate wink, slight knowing smile, other eye open and bright, flirtatious and charming, close-up face framing' },
  { id: 'custom-expr-smirk', name: 'Smirk', category: 'expression', icon: '😼', hint: 'asymmetric half-smile smirk, one corner of mouth raised, knowing confident expression, slightly narrowed eyes, cocky and self-assured' },
  { id: 'custom-expr-surprised', name: 'Surprised / Wow', category: 'expression', icon: '😲', hint: 'wide open eyes, raised eyebrows, open mouth in genuine surprise, hands near face, shocked and amazed expression, dynamic and expressive' },
  { id: 'custom-expr-eyeroll', name: 'Eye Roll', category: 'expression', icon: '🙄', hint: 'eyes rolled upward, slight head tilt back, exasperated or annoyed expression, visible whites of eyes, dismissive and over-it attitude' },
  { id: 'custom-expr-bubble', name: 'Blowing Bubble', category: 'expression', icon: '🫧', hint: 'blowing a bubble with bubblegum, pink bubble expanding from lips, focused puffy cheeks, playful and retro, close-up face framing' },
  { id: 'custom-expr-bitingnail', name: 'Biting Nail', category: 'expression', icon: '💅', hint: 'finger raised to mouth biting fingernail, anxious or coy expression, wide eyes looking at camera, manicured nails visible, nervous or flirty energy' },
  { id: 'custom-expr-whispering', name: 'Whispering', category: 'expression', icon: '🤫', hint: 'hand cupped near mouth as if whispering a secret, leaning slightly forward, conspiratorial expression, finger near lips, secretive and intimate' },
  { id: 'custom-expr-crying', name: 'Crying', category: 'expression', icon: '😢', hint: 'tears streaming down cheeks, red watery eyes, glistening wet skin, slightly quivering lip, emotional vulnerability, soft melancholic lighting' },
  { id: 'custom-expr-angry', name: 'Angry', category: 'expression', icon: '😤', hint: 'furrowed brow, clenched jaw, intense glaring eyes, nostrils slightly flared, tense neck muscles, fierce and confrontational expression' },
  { id: 'custom-expr-shy', name: 'Shy / Blushing', category: 'expression', icon: '🫣', hint: 'hand partially covering face, eyes peeking through fingers, pink blush on cheeks, slight embarrassed smile, soft shy body language, looking down' },
  { id: 'custom-expr-confident', name: 'Confident Stare', category: 'expression', icon: '😎', hint: 'unwavering direct eye contact with camera, chin slightly raised, relaxed but assertive jaw, power gaze, strong and self-assured, editorial intensity' },
  { id: 'custom-expr-laughing', name: 'Laughing Hard', category: 'expression', icon: '🤣', hint: 'head thrown back laughing, open mouth, eyes crinkled shut, genuine belly laugh, dynamic joyful energy, candid mid-laugh moment captured' },
  { id: 'custom-expr-dreamy', name: 'Dreamy / Gazing', category: 'expression', icon: '🥰', hint: 'soft unfocused gaze into the distance, relaxed half-lidded eyes, gentle parted lips, romantic and wistful, backlighting creating soft halo' },
  { id: 'custom-expr-serious', name: 'Dead Serious', category: 'expression', icon: '😐', hint: 'completely neutral flat expression, no smile, intense unblinking stare, lips pressed together, emotionless deadpan face, stark and confrontational' },
  { id: 'custom-expr-pouty', name: 'Pouty', category: 'expression', icon: '😤', hint: 'exaggerated pouty pushed-out lower lip, puppy-dog eyes, slightly furrowed brow, cute and dramatic displeasure, attention-seeking and playful' },
  { id: 'custom-expr-flirty', name: 'Flirty Smile', category: 'expression', icon: '😊', hint: 'warm inviting smile with head slightly tilted, sparkling eyes, subtle lip bite or tongue touch, approachable and charming, soft flattering light' },
  { id: 'custom-expr-scared', name: 'Scared / Shocked', category: 'expression', icon: '😨', hint: 'wide frightened eyes, mouth open in gasp, hands raised defensively, tense pulled-back posture, fear visible in dilated eyes, dramatic horror-movie lighting' },
  { id: 'custom-expr-sleepy', name: 'Sleepy / Tired', category: 'expression', icon: '😴', hint: 'heavy drooping eyelids, slow blink, slight dark circles under eyes, relaxed slack face, yawning or resting head on hand, cozy tired warmth' },
  { id: 'custom-expr-sassy', name: 'Sassy', category: 'expression', icon: '💅', hint: 'head tilted with attitude, one eyebrow arched high, pursed lips, hand on hip or dismissive wave, bold and unbothered energy, confident sass' },
  { id: 'custom-expr-thinking', name: 'Thinking / Pensive', category: 'expression', icon: '🤔', hint: 'chin resting on hand, eyes looking upward in thought, slightly furrowed contemplative brow, intellectual and reflective mood, soft focused expression' },
  { id: 'custom-expr-innocent', name: 'Innocent / Doe Eyes', category: 'expression', icon: '🥺', hint: 'wide round doe eyes looking up, slightly parted soft lips, childlike innocent expression, soft light on face, vulnerable and sweet, bambi eyes' },
  { id: 'custom-expr-fierce', name: 'Fierce / Model Face', category: 'expression', icon: '🔥', hint: 'sharp cheekbones accentuated, intense smoldering gaze, slightly squinted eyes, strong jawline, high-fashion runway fierceness, powerful and magnetic' },
  { id: 'custom-expr-peace', name: 'Peace & Smile', category: 'expression', icon: '✌️', hint: 'bright genuine smile with peace sign held near face, cheerful and friendly, bright eyes, casual fun portrait, positive youthful energy' },
  { id: 'custom-expr-kissy', name: 'Blowing Kiss', category: 'expression', icon: '😘', hint: 'puckered lips sending a kiss, one hand raised palm-up as if blowing the kiss off it, playful romantic gesture, eyes looking at camera warmly' },
  { id: 'custom-expr-disgust', name: 'Disgusted', category: 'expression', icon: '🤢', hint: 'wrinkled nose, upper lip curled in revulsion, squinted eyes, head pulled back slightly, strong visceral disgust reaction, exaggerated and expressive' },
  { id: 'custom-expr-eyesclosed', name: 'Eyes Closed Peaceful', category: 'expression', icon: '😌', hint: 'eyes gently closed, serene peaceful smile, face tilted slightly upward toward light, meditative tranquility, soft glowing backlight, inner calm' },

  // ── Coquette / Sensual Poses ──
  { id: 'custom-coq-shoulder', name: 'Over the Shoulder', category: 'pose', icon: '🔙', hint: 'looking back over bare or clothed shoulder, back facing camera, seductive glance back at lens, exposed shoulder line, soft directional lighting' },
  { id: 'custom-coq-chinonhand', name: 'Chin on Hand', category: 'pose', icon: '🤔', hint: 'chin resting delicately on the back of hand, elbow on surface, contemplative or coy expression, close-up portrait, soft beauty lighting' },
  { id: 'custom-coq-playinghair', name: 'Playing with Hair', category: 'pose', icon: '💇', hint: 'fingers running through or twirling hair, relaxed casual gesture, slight head tilt, natural and flirty, close-up to medium shot framing' },
  { id: 'custom-coq-crossleg', name: 'Sitting Cross-Legged', category: 'pose', icon: '🧘', hint: 'seated with legs crossed comfortably, on floor or bed, relaxed upright posture, hands in lap or resting on knees, casual intimate setting' },
  { id: 'custom-coq-lyingstomach', name: 'Lying on Stomach', category: 'pose', icon: '🛌', hint: 'lying face-down on stomach propped up on elbows, chin resting on hands, feet kicked up behind, bed or blanket setting, casual and playful' },
  { id: 'custom-coq-handonhip', name: 'Hand on Hip', category: 'pose', icon: '💃', hint: 'one hand placed confidently on hip, weight shifted to one leg, slight hip pop, assertive feminine pose, full or three-quarter body shot' },
  { id: 'custom-coq-lookingup', name: 'Looking Up (Innocent)', category: 'pose', icon: '🥺', hint: 'head tilted slightly down, eyes gazing upward at camera, wide doe-eyed innocent expression, camera positioned slightly above, soft angelic light' },
  { id: 'custom-coq-stretchbed', name: 'Stretching in Bed', category: 'pose', icon: '🛏️', hint: 'arms stretched above head while lying in bed, morning wake-up stretch, arched back, tangled sheets, soft natural window light, lazy and sensual' },
  { id: 'custom-coq-hugknees', name: 'Hugging Knees', category: 'pose', icon: '🧸', hint: 'sitting with arms wrapped around pulled-up knees, chin resting on kneecap, vulnerable and cozy posture, soft setting, introspective and cute' },
  { id: 'custom-coq-backarched', name: 'Back Arched', category: 'pose', icon: '🐱', hint: 'standing or seated with back gracefully arched, chest forward, elongated spine curve, elegant and dynamic body line, fashion or dance aesthetic' },

  // ── Content Creator Specific ──
  { id: 'custom-cc-producthold', name: 'Product Hold', category: 'content', icon: '🧴', hint: 'holding a product at face-level showing it to camera, clean background, well-lit product and face, influencer brand promotion style, genuine expression' },
  { id: 'custom-cc-beforeafter', name: 'Before & After', category: 'content', icon: '↔️', hint: 'split composition showing transformation — bare face on one side and glam on the other, clear visual comparison, same angle and lighting both sides. DO NOT add text or labels' },
  { id: 'custom-cc-reactionface', name: 'Reaction Face', category: 'content', icon: '😱', hint: 'exaggerated reaction expression — shocked jaw drop or amazed wide eyes — looking at something off-camera, hands near face, viral content energy. DO NOT add text or labels' },
  { id: 'custom-cc-tutorial', name: 'Tutorial Pose', category: 'content', icon: '👩‍🏫', hint: 'instructional stance, one hand pointing or demonstrating something, facing camera directly, clear and approachable expression, well-lit educational content. DO NOT add text or labels' },
  { id: 'custom-cc-testimonial', name: 'Testimonial', category: 'content', icon: '💬', hint: 'natural talking-to-camera pose, warm genuine expression, gesturing while speaking, casual home or studio background, authentic review energy' },
  { id: 'custom-cc-hauldisplay', name: 'Haul Display', category: 'content', icon: '🛍️', hint: 'items spread out on bed or table showing off a shopping haul, hands picking up pieces, overhead or front angle, colorful arrangement of products' },
  { id: 'custom-cc-tastetest', name: 'Taste Test', category: 'content', icon: '😋', hint: 'tasting or about to bite food, expressive evaluating face, food held close to mouth, restaurant or kitchen setting, foodie content creator pose' },
  { id: 'custom-cc-outfitspin', name: 'Outfit Spin', category: 'content', icon: '🔄', hint: 'mid-spin showing off a complete outfit from all angles, dress or skirt flaring out, motion blur on fabric, full body shot, fashion transition energy' },
  { id: 'custom-cc-flatlay', name: 'Flat Lay Style', category: 'content', icon: '📐', hint: 'overhead bird\'s-eye flat lay arrangement of items on a clean surface, hands reaching into frame styling objects, curated aesthetic grid, Instagram content' },
  { id: 'custom-cc-phonecam', name: 'Phone to Camera', category: 'content', icon: '📱', hint: 'recording with phone then switching attention to main camera, phone in one hand, dual-camera content creation, behind-the-scenes creator life' },
  { id: 'custom-cc-asmr', name: 'ASMR Close-up', category: 'content', icon: '🎧', hint: 'extreme close-up macro shot, whispering near microphone, delicate hand movements, soft quiet atmosphere, textured objects in focus, sensory-focused' },
  { id: 'custom-cc-skincare', name: 'Skincare Routine', category: 'content', icon: '🧴', hint: 'applying skincare product to face, serums and bottles on vanity, bathroom mirror, dewy clean skin, ring light reflection, beauty routine content' },
  { id: 'custom-cc-mukbang', name: 'Mukbang', category: 'content', icon: '🍜', hint: 'large spread of food in front, eating enthusiastically, multiple dishes visible, close-up of both face and food, bright lighting, communal eating energy' },
  { id: 'custom-cc-workout', name: 'Workout Demo', category: 'content', icon: '💪', hint: 'demonstrating an exercise move, athletic wear, gym or home workout space, mid-rep action shot, instructional framing showing proper form, fitness content' },
  { id: 'custom-cc-pov', name: 'POV / First Person', category: 'content', icon: '👁️', hint: 'first-person POV shot looking directly into camera as if viewer is there, intimate close proximity, engaging eye contact, immersive perspective' },

  // ── Aesthetic / Vibra ──
  { id: 'custom-aes-cleangirl', name: 'Clean Girl', category: 'aesthetic', icon: '🧼', featured: true, hint: 'minimalist clean-girl aesthetic, slicked-back bun, dewy no-makeup makeup, gold hoops, neutral tones, bright airy space, effortless polished simplicity' },
  { id: 'custom-aes-thatgirl', name: 'That Girl', category: 'aesthetic', icon: '🌿', featured: true, hint: 'wellness-focused That Girl aesthetic, green juice or yoga mat, matching workout set, morning sunlight, organized aesthetic space, productive healthy lifestyle' },
  { id: 'custom-aes-softgirl', name: 'Soft Girl', category: 'aesthetic', icon: '🧸', hint: 'soft girl aesthetic, pastel pink and lilac palette, blush cheeks, cloud motifs, fuzzy textures, stuffed animals, gentle dreamy lighting, innocent and cute' },
  { id: 'custom-aes-baddie', name: 'Baddie', category: 'aesthetic', icon: '🔥', featured: true, hint: 'Instagram baddie aesthetic, full glam makeup, contoured face, long nails, bodycon outfit, confident power pose, bold and unapologetic, studio or urban backdrop' },
  { id: 'custom-aes-egirl', name: 'E-Girl', category: 'aesthetic', icon: '⛓️', hint: 'e-girl aesthetic, split-dye hair, heavy winged eyeliner, chain accessories, striped long sleeves under band tee, LED-lit bedroom, anime posters, edgy and alternative' },
  { id: 'custom-aes-darkfem', name: 'Dark Feminine', category: 'aesthetic', icon: '🖤', hint: 'dark feminine energy, black lace and velvet, dark lipstick, sultry smokey eyes, candlelit dim atmosphere, mysterious and powerful, noir elegance' },
  { id: 'custom-aes-lightfem', name: 'Light Feminine', category: 'aesthetic', icon: '🤍', hint: 'light feminine energy, all-white and cream outfit, soft curls, pearl jewelry, airy bright space, angelic glow, gentle and graceful, ethereal beauty' },
  { id: 'custom-aes-tomboy', name: 'Tomboy', category: 'aesthetic', icon: '🧢', hint: 'tomboy style, baggy jeans and oversized tee, snapback cap backwards, sneakers, sporty casual, relaxed masculine-leaning pose, skatepark or court backdrop' },
  { id: 'custom-aes-mobwife', name: 'Mob Wife', category: 'aesthetic', icon: '🦊', hint: 'mob wife aesthetic, oversized fur coat, large gold jewelry, dark sunglasses, big blowout hair, leopard print, espresso in hand, luxurious and dramatic, Italian glamour' },
  { id: 'custom-aes-vanilla', name: 'Vanilla Girl', category: 'aesthetic', icon: '🍦', hint: 'vanilla girl aesthetic, all cream/beige/white outfit, cashmere and knits, soft neutral makeup, cozy café or light-filled room, warm understated elegance' },
  { id: 'custom-aes-dollette', name: 'Dollette', category: 'aesthetic', icon: '🎀', hint: 'dollette aesthetic, doll-like features, rosy cheeks, glossy lips, ribbon in hair, pink and white frilly outfit, porcelain skin, soft cute and precious' },
  { id: 'custom-aes-witchcore', name: 'Witchcore', category: 'aesthetic', icon: '🔮', hint: 'witchcore aesthetic, dark flowing garments, crystal pendants, candles and dried herbs, dark moody forest or apothecary setting, mystical and occult atmosphere' },
  { id: 'custom-aes-angelcore', name: 'Angelcore', category: 'aesthetic', icon: '👼', hint: 'angelcore aesthetic, white flowing fabrics, feathered wings, halo glow, soft heavenly backlight, clouds, pearl and gold accents, pure divine serenity' },
  { id: 'custom-aes-fairycore', name: 'Fairycore', category: 'aesthetic', icon: '🧚', hint: 'fairycore aesthetic, translucent iridescent wings, flower garlands in hair, mushroom and moss setting, soft green and pink glow, enchanted forest magic' },
  { id: 'custom-aes-royalcore', name: 'Royalcore', category: 'aesthetic', icon: '👑', hint: 'royalcore aesthetic, velvet gowns, pearl choker, ornate palace interior, gold-framed mirrors, candlelit chandelier, regal and sophisticated, Bridgerton-era opulence' },
  { id: 'custom-aes-corpcore', name: 'Corpcore', category: 'aesthetic', icon: '🏢', hint: 'corporate core aesthetic, tailored blazer and trousers, slicked hair, briefcase or laptop, minimalist modern office, fluorescent lighting, polished professional power' },
  { id: 'custom-aes-normcore', name: 'Normcore', category: 'aesthetic', icon: '👕', hint: 'normcore intentionally plain style, basic white tee and jeans, no logos, clean simple sneakers, unremarkable everyday clothing elevated through attitude' },
  { id: 'custom-aes-coastal', name: 'Coastal Cowgirl', category: 'aesthetic', icon: '🤠', hint: 'coastal cowgirl aesthetic, cowboy hat with beach waves hair, denim cutoffs, cowboy boots with bikini top, beach sunset, turquoise jewelry, Western-meets-beach' },
  { id: 'custom-aes-downtown', name: 'Downtown Girl', category: 'aesthetic', icon: '🌆', hint: 'downtown girl aesthetic, leather jacket, mini skirt, platform boots, tote bag, coffee cup, urban sidewalk, edgy-chic city style, indie bookstore or record shop' },
  { id: 'custom-aes-itgirl', name: 'It Girl', category: 'aesthetic', icon: '💎', hint: 'ultimate It Girl energy, trend-setting outfit, oversized sunglasses, designer bag, paparazzi-caught-off-guard pose, city street, effortlessly stylish and enviable' },
  { id: 'custom-aes-parisian', name: 'Parisian Chic', category: 'aesthetic', icon: '🇫🇷', hint: 'Parisian chic aesthetic, Breton stripe top, red beret, classic trench coat, minimal gold jewelry, café terrace, effortless French elegance, muted warm tones' },
  { id: 'custom-aes-scandi', name: 'Scandinavian Minimal', category: 'aesthetic', icon: '🏔️', hint: 'Scandinavian minimalism, clean lines, muted earth tones, wool and linen textures, bright white interior, hygge warmth, simple functional beauty' },
  { id: 'custom-aes-miami', name: 'Miami Vice', category: 'aesthetic', icon: '🌴', hint: 'Miami Vice aesthetic, pastel suit with no shirt underneath, Art Deco South Beach backdrop, palm trees, neon pink and teal, sunset, 1980s retro glamour' },
  { id: 'custom-aes-rockstar', name: 'Rockstar Girlfriend', category: 'aesthetic', icon: '🎸', hint: 'rockstar girlfriend aesthetic, vintage band tee, leather pants, smudged eyeliner, backstage or dim bar setting, effortlessly cool and rebellious' },
  { id: 'custom-aes-offduty', name: 'Off-Duty Model', category: 'aesthetic', icon: '🕶️', hint: 'off-duty model style, oversized blazer with bike shorts, minimal makeup, coffee in hand, street-style candid, effortless and unposed, natural beauty' },

  // ── Fashion (more) ──
  { id: 'custom-fash-haute', name: 'Haute Couture', category: 'fashion', icon: '👑', hint: 'high-end haute couture gown, intricate handcrafted details, dramatic silhouette, grand staircase or palace setting, editorial lighting, extravagant and luxurious' },
  { id: 'custom-fash-punk', name: 'Punk', category: 'fashion', icon: '🤘', hint: 'punk fashion, safety pins, studded leather jacket, tartan and patches, mohawk or spiky hair, Dr. Martens, graffiti-covered wall or dive bar backdrop' },
  { id: 'custom-fash-preppy', name: 'Preppy', category: 'fashion', icon: '🎓', hint: 'preppy style, polo shirt with popped collar, cable-knit sweater, plaid skirt, loafers, ivy league campus or tennis court setting, crisp and collegiate' },
  { id: 'custom-fash-vintage', name: 'Vintage Thrift', category: 'fashion', icon: '🧥', hint: 'eclectic vintage thrift-store fashion, mismatched eras and patterns, retro sunglasses, oversized blazer, worn-in denim, colorful and unique, secondhand treasure' },
  { id: 'custom-fash-sporty', name: 'Sporty Spice', category: 'fashion', icon: '⚽', hint: 'sporty fashion, matching tracksuit or jersey, sneakers, ponytail, athletic-inspired accessories, stadium or court backdrop, energetic and bold' },
  { id: 'custom-fash-lingerie', name: 'Lingerie / Boudoir', category: 'fashion', icon: '🩱', hint: 'elegant boudoir setting, delicate lace lingerie, soft bedroom light, silk sheets, tasteful and sophisticated, warm intimate atmosphere, classic beauty' },
  { id: 'custom-fash-swimwear', name: 'Swimwear', category: 'fashion', icon: '👙', hint: 'swimwear fashion, one-piece or bikini, poolside or beach setting, bright direct sunlight, wet hair, golden tan skin, tropical resort vibes' },
  { id: 'custom-fash-formal', name: 'Black Tie / Gala', category: 'fashion', icon: '🎩', hint: 'black-tie formal wear, evening gown or tuxedo, elegant updo or slicked-back hair, grand ballroom or red carpet, chandeliers, champagne, glamorous event' },
  { id: 'custom-fash-denim', name: 'Full Denim', category: 'fashion', icon: '👖', hint: 'Canadian tuxedo — denim jacket with jeans, all-denim monochrome outfit, varying washes of blue, casual Americana, highway or countryside backdrop' },
  { id: 'custom-fash-leather', name: 'All Leather', category: 'fashion', icon: '🖤', hint: 'head-to-toe leather outfit, leather pants and jacket, sleek and edgy, dark motorcycle or industrial backdrop, high-contrast dramatic lighting, rebellious' },
  { id: 'custom-fash-monochrome', name: 'Monochrome', category: 'fashion', icon: '⬛', hint: 'entirely monochrome outfit in a single color — all black, all white, or all red — clean minimal styling, matching accessories, bold and cohesive' },
  { id: 'custom-fash-neon', name: 'Neon / Rave', category: 'fashion', icon: '💚', hint: 'fluorescent neon-colored clothing and accessories, UV-reactive materials, blacklight glow, rave or festival setting, electric green/pink/orange, high energy' },
  { id: 'custom-fash-oversized', name: 'Oversized Everything', category: 'fashion', icon: '🧸', hint: 'extremely oversized baggy clothing, huge hoodie drowning the body, wide-leg pants, chunky shoes, cozy and trendy streetwear, relaxed and comfortable' },
  { id: 'custom-fash-sheer', name: 'Sheer / See-Through', category: 'fashion', icon: '🫧', hint: 'sheer translucent fabric layers, see-through mesh or organza, layered styling, elegant and daring, soft backlighting showing fabric transparency' },
  { id: 'custom-fash-layered', name: 'Layered / Stacked', category: 'fashion', icon: '🧅', hint: 'heavily layered outfit, multiple coats, scarves, and textures stacked, maximalist mix-and-match, eclectic street style, rich textural depth and volume' },

  // ── Places (cotidian / everyday) ──
  { id: 'custom-place-bedroom', name: 'Bedroom', category: 'place', icon: '🛏️', featured: true, hint: 'cozy bedroom setting, unmade bed with soft linens, warm lamp light, personal items on nightstand, intimate and private atmosphere, natural window glow' },
  { id: 'custom-place-bathroom', name: 'Bathroom Mirror', category: 'place', icon: '🪞', hint: 'bathroom mirror shot, white tile background, vanity lights framing the mirror, toiletries visible, steam on glass, clean bright bathroom aesthetic' },
  { id: 'custom-place-kitchen', name: 'Kitchen', category: 'place', icon: '🍳', hint: 'modern kitchen setting, marble countertops, hanging pendant lights, cooking utensils visible, warm morning light, clean and lived-in, culinary atmosphere' },
  { id: 'custom-place-livingroom', name: 'Living Room', category: 'place', icon: '🛋️', hint: 'stylish living room, comfortable sofa, soft throw blankets, houseplants, natural daylight through large windows, curated home decor, relaxed at-home vibe' },
  { id: 'custom-place-balcony', name: 'Balcony', category: 'place', icon: '🌇', hint: 'standing on a balcony, city skyline or garden view, railing in foreground, golden hour or twilight sky, urban residential atmosphere, breezy and open' },
  { id: 'custom-place-closet', name: 'Walk-in Closet', category: 'place', icon: '👗', hint: 'inside a walk-in closet, organized racks of clothing and shoes, full-length mirror, soft overhead lighting, fashion and luxury, getting-dressed moment' },
  { id: 'custom-place-bathtub', name: 'Bathtub', category: 'place', icon: '🛁', hint: 'relaxing in a freestanding bathtub, bubbles or flower petals in water, candles on ledge, steam rising, soft warm diffused lighting, spa-like tranquility' },
  { id: 'custom-place-gym', name: 'Gym', category: 'place', icon: '🏋️', featured: true, hint: 'inside a gym, weight racks and machines in background, rubber floor, overhead fluorescent lights, mirrors on walls, athletic environment, workout energy' },
  { id: 'custom-place-yogastudio', name: 'Yoga Studio', category: 'place', icon: '🧘', hint: 'serene yoga studio, bamboo or wooden floors, large mirrors, natural light, minimalist zen decor, yoga mats and blocks, peaceful and balanced atmosphere' },
  { id: 'custom-place-boxingring', name: 'Boxing Ring', category: 'place', icon: '🥊', hint: 'standing in a boxing ring, ropes and corner posts, gym lighting from above, boxing gloves on or around neck, gritty athletic determination, fighter stance' },
  { id: 'custom-place-pool', name: 'Pool Deck', category: 'place', icon: '🏊', hint: 'pool deck setting, turquoise water, white sun loungers, palm trees, bright midday sun, tropical resort or backyard pool, summer luxury and relaxation' },
  { id: 'custom-place-restaurant', name: 'Restaurant', category: 'place', icon: '🍽️', featured: true, hint: 'upscale restaurant setting, white tablecloth, wine glasses, warm ambient candlelight, exposed brick or elegant decor, sophisticated dinner atmosphere' },
  { id: 'custom-place-bar', name: 'Bar / Club', category: 'place', icon: '🍸', hint: 'dimly-lit bar or nightclub, bottles and glasses on counter, neon signs, moody ambient colored lighting, cocktail in hand, nightlife atmosphere' },
  { id: 'custom-place-rooftop', name: 'Rooftop Terrace', category: 'place', icon: '🌃', hint: 'rooftop terrace at dusk, city skyline panorama, string lights or lounge furniture, cocktail in hand, golden-blue twilight sky, elevated urban glamour' },
  { id: 'custom-place-hotellobby', name: 'Hotel Lobby', category: 'place', icon: '🏨', hint: 'grand hotel lobby, marble floors, crystal chandelier, plush furniture, warm elegant lighting, luxury travel atmosphere, concierge desk in background' },
  { id: 'custom-place-hotelroom', name: 'Hotel Room', category: 'place', icon: '🛏️', hint: 'boutique hotel room, crisp white bedding, city view through large window, modern minimalist decor, warm bedside lamp light, travel luxury' },
  { id: 'custom-place-elevator', name: 'Elevator', category: 'place', icon: '🔼', hint: 'inside an elevator, reflective metal walls and doors, harsh overhead light, compact space, mirrored selfie angle, urban transit moment' },
  { id: 'custom-place-parking', name: 'Parking Lot', category: 'place', icon: '🅿️', hint: 'empty parking lot or garage, concrete pillars, harsh sodium-vapor overhead lights, cars in background, urban gritty atmosphere, industrial and raw' },
  { id: 'custom-place-gasstation', name: 'Gas Station', category: 'place', icon: '⛽', hint: 'gas station at night, fluorescent canopy lights, fuel pumps, convenience store glow, Americana roadside setting, cinematic and lonely atmosphere' },
  { id: 'custom-place-laundromat', name: 'Laundromat', category: 'place', icon: '🧺', hint: 'retro laundromat, rows of washing machines and dryers, fluorescent overhead lights, sitting on machine or folding clothes, indie film aesthetic' },
  { id: 'custom-place-subway', name: 'Subway / Metro', category: 'place', icon: '🚇', hint: 'underground subway station, tiled walls, platform edge, train arriving or departing, fluorescent and neon map lights, urban commuter atmosphere' },
  { id: 'custom-place-stairwell', name: 'Stairwell', category: 'place', icon: '🪜', hint: 'concrete stairwell, geometric railing lines, overhead fluorescent light, urban building interior, looking up or down the spiral, gritty architectural setting' },
  { id: 'custom-place-alley', name: 'Back Alley', category: 'place', icon: '🌆', hint: 'narrow back alley between buildings, fire escapes overhead, graffiti on brick walls, single light source, moody and cinematic, urban edge atmosphere' },
  { id: 'custom-place-mall', name: 'Shopping Mall', category: 'place', icon: '🏬', hint: 'bright shopping mall interior, escalators and storefronts, polished marble floors, commercial overhead lighting, shopping bags in hand, retail atmosphere' },
  { id: 'custom-place-luxurystore', name: 'Luxury Store', category: 'place', icon: '💎', hint: 'inside a luxury brand boutique, glass display cases, marble and gold accents, minimal product displays, spotlit merchandise, high-end shopping experience' },
  { id: 'custom-place-thrift', name: 'Thrift Shop', category: 'place', icon: '🛍️', hint: 'inside a thrift or vintage shop, packed clothing racks, eclectic colorful items, warm nostalgic lighting, browsing through hangers, treasure-hunting vibe' },
  { id: 'custom-place-bookstore', name: 'Bookstore', category: 'place', icon: '📚', hint: 'cozy independent bookstore, tall wooden shelves packed with books, reading nook, warm overhead light, literary atmosphere, browsing spines, quiet and cultured' },
  { id: 'custom-place-supermarket', name: 'Supermarket', category: 'place', icon: '🛒', hint: 'supermarket aisle, colorful product shelves on both sides, shopping cart, harsh fluorescent overhead lighting, everyday mundane setting made aesthetic' },
  { id: 'custom-place-forest', name: 'Forest', category: 'place', icon: '🌲', hint: 'deep forest setting, tall trees with dappled sunlight filtering through canopy, moss-covered ground, green and earthy tones, peaceful and enchanted' },
  { id: 'custom-place-waterfall', name: 'Waterfall', category: 'place', icon: '💧', hint: 'standing near a cascading waterfall, mist in air, lush green vegetation, rushing white water, wet rocks, powerful nature backdrop, fresh and invigorating' },
  { id: 'custom-place-flowerfield', name: 'Flower Field', category: 'place', icon: '🌻', hint: 'standing in a vast colorful flower field — sunflowers, lavender, or wildflowers — bright sunny day, flowers reaching waist-height, romantic and picturesque' },
  { id: 'custom-place-vineyard', name: 'Vineyard', category: 'place', icon: '🍇', hint: 'walking through vineyard rows, grapevines on trellises, rolling hills in distance, warm golden afternoon light, Tuscan or wine country atmosphere' },
  { id: 'custom-place-lake', name: 'Lake', category: 'place', icon: '🏞️', hint: 'calm lake setting, mirror-like water reflections, mountains or trees framing the shore, golden or blue hour light, serene and vast, peaceful nature' },
  { id: 'custom-place-cliff', name: 'Cliff Edge', category: 'place', icon: '🏔️', hint: 'standing at the edge of a dramatic cliff, vast landscape or ocean below, wind blowing hair and clothes, epic wide-angle view, adventurous and brave' },
  { id: 'custom-place-carinterior', name: 'Car Interior', category: 'place', icon: '🚗', hint: 'sitting inside a car, steering wheel or dashboard visible, natural light through windows, leather or fabric seats, road trip or commute setting' },
  { id: 'custom-place-backseat', name: 'Back Seat', category: 'place', icon: '🚘', hint: 'relaxing in the backseat of a car, legs stretched, city or landscape passing through window, soft ambient light, passenger vibes, candid and comfortable' },
  { id: 'custom-place-motorcycle', name: 'Motorcycle', category: 'place', icon: '🏍️', hint: 'sitting on or standing beside a motorcycle, leather jacket, urban street or open road, chrome and metal details, rebellious and free, biker aesthetic' },
  { id: 'custom-place-yacht', name: 'Yacht', category: 'place', icon: '🛥️', hint: 'on the deck of a luxury yacht, ocean stretching to horizon, white boat surface, nautical ropes and rails, bright sea light, wealthy and exclusive' },
  { id: 'custom-place-privatejet', name: 'Private Jet', category: 'place', icon: '✈️', hint: 'inside a private jet cabin, cream leather seats, champagne glass, oval window with clouds, luxury and exclusivity, jet-setter lifestyle, warm cabin light' },
];

/**
 * Curated subset (~40 styles) for default display.
 * Featured styles first, then best-of each category.
 * "Show all" reveals the full 99.
 */
const CURATED_IDS = new Set([
  // Featured (10)
  ...SOUL_STYLES.filter(s => s.featured).map(s => s.id),
  // Fashion picks
  '6b9e6b4d-325a-4a78-a0fb-a00ddf612380', // Y2K
  'facaafeb-4ab5-4384-92a1-b4086180e9ac', // 2000s Fashion
  'bd78cfc6-9b92-4889-9347-f21dbf0a269c', // Coquette Core
  'ad9de607-3941-4540-81ea-ba978ef1550b', // Grunge
  '91abc4fe-1cf8-4a77-8ade-d36d46699014', // Green Editorial
  '710f9073-f580-48dc-b5c3-9bbc7cbb7f37', // 90's Editorial
  // Photo picks
  'ca4e6ad3-3e93-4e03-81a0-d1722d2c128b', // DigitalCam
  'f5c094c7-4671-4d86-90d2-369c8fdbd7a5', // 90s Grain
  '83caff04-691c-468c-b4a0-fd6bbabe062b', // Vintage PhotoBooth
  '811de7ab-7aaf-4a6b-b352-cdea6c34c8f1', // Movie
  '40ff999c-f576-443c-b5b3-c7d1391a666e', // Spotlight
  // Selfie picks
  '524be50a-4388-4ff5-a843-a73d2dd7ef87', // Elevator Mirror
  '9de8ed26-c8dd-413c-a5e3-47eec97bc243', // Ring Selfie
  // Mood picks
  '62ba1751-63af-4648-a11c-711ac64e216a', // Night Beach
  '26241c54-ed78-4ea7-b1bf-d881737c9feb', // Sunset Beach
  '5765d07d-1525-4d4d-ae06-9091e2bdac2d', // Afterparty Cam
  'a643a36a-85e6-4e3d-80db-13e4997203cc', // Hallway Noir
  '1fba888b-9ab0-447f-a6a4-9ce5251ec2a6', // Night Rider
  // Concept picks
  '7f21e7bd-4df6-4cef-a9a9-9746bceaea1d', // Fairycore
  '0c636e12-3411-4a65-8d86-67858caf2fa7', // Avant-garde
  '53959c8a-4323-4b78-9888-e9f6fb0f6b98', // 2049
  'a2a42ada-75cc-42a9-be12-cb16c1dec2a8', // Glazed Doll Skin
  'ea6f4dc0-d6dd-4bdf-a8cf-94ed1db91ab2', // Hair Clips
  // Location picks
  'de0118ba-7c27-49f7-9841-38abe2aae8e1', // Mt. Fuji
  'ce9a88c2-c962-45e2-abaa-c8979d48f8d5', // Tokyo Drift
  'd2e8ba04-9935-4dee-8bc4-39ac789746fc', // Subway
  '3f90dc5b-f474-4259-95c4-d29fbd6be645', // Flight Mode
  // Experimental picks
  '62355e77-7096-45ae-9bea-e7c5b88c3b70', // Glitch
  '2fcf02e2-919a-4642-8b31-d58bde5e6bd9', // Mixed Media
  // Lifestyle picks
  'd24c016c-9fb1-47d0-9909-19f57a2830d4', // Selfcare
  '79bfaa63-4e12-4ea2-8ada-7d4406eecece', // It's French
]);

/** Curated styles sorted: featured first, then alphabetical. */
export const SOUL_STYLES_CURATED: SoulStyle[] = SOUL_STYLES
  .filter(s => CURATED_IDS.has(s.id))
  .sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name);
  });

/**
 * Map Photo Session vibe IDs to recommended Soul Styles.
 * When using Soul 2.0 engine, these styles are auto-applied per vibe.
 */
export const VIBE_TO_SOUL_STYLE: Record<string, string> = {
  'selfies':      '8dd89de9-1cff-402e-88a8-580c29d91473', // 0.5 Selfie
  'grwm':         'b7c621b5-9d3c-46a3-8efb-4cdfbc592271', // Babydoll Makeup
  'stories':      '1b798b54-03da-446a-93bf-12fcba1050d7', // iPhone
  'editorial':    '86fc814e-856a-4af0-98b0-d4da75d0030b', // FashionShow
  'portrait':     '1cb4b936-77bf-4f9a-9039-f3d349a4cdbe', // Realistic
  'street':       '99de6fc5-1177-49b9-b2e9-19e17d95bcaf', // Tokyo Streetstyle
  'creator':      'ca4e6ad3-3e93-4e03-81a0-d1722d2c128b', // DigitalCam
  'lifestyle':    '464ea177-8d40-4940-8d9d-b438bab269c7', // General
  'fitness':      '96758335-d1d1-42b7-9c21-5ac38c433485', // Gorpcore
  'nightout':     '5765d07d-1525-4d4d-ae06-9091e2bdac2d', // afterparty cam
  'fotodump':     'f5c094c7-4671-4d86-90d2-369c8fdbd7a5', // 90s Grain
  'datenight':    '5dbb6a20-0541-4f06-8352-a2408d8781dc', // Nicotine Glow
  'pool':         'bc00b419-f8ca-4887-a990-e2760c3cb761', // Sunbathing
  'cozy':         'd24c016c-9fb1-47d0-9909-19f57a2830d4', // Selfcare
};
