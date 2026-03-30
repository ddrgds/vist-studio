// ─────────────────────────────────────────────
// Higgsfield Soul 2.0 — Style Presets
// 100+ curated aesthetic presets with UUIDs
// Pass style_id to Soul API for instant aesthetic direction
// ─────────────────────────────────────────────

export interface SoulStyle {
  id: string;       // UUID for API
  name: string;     // Display name
  category: SoulStyleCategory;
  icon: string;     // Emoji
  featured?: boolean; // Top-tier styles shown first with a badge
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
  { id: '464ea177-8d40-4940-8d9d-b438bab269c7', name: 'General', category: 'general', icon: '✦', featured: true },
  { id: '1cb4b936-77bf-4f9a-9039-f3d349a4cdbe', name: 'Realistic', category: 'general', icon: '📸', featured: true },

  // ── Fashion ──
  { id: '6b9e6b4d-325a-4a78-a0fb-a00ddf612380', name: 'Y2K', category: 'fashion', icon: '💿' },
  { id: 'facaafeb-4ab5-4384-92a1-b4086180e9ac', name: '2000s Fashion', category: 'fashion', icon: '👠' },
  { id: '99de6fc5-1177-49b9-b2e9-19e17d95bcaf', name: 'Tokyo Streetstyle', category: 'fashion', icon: '🗼', featured: true },
  { id: '86fc814e-856a-4af0-98b0-d4da75d0030b', name: 'Fashion Show', category: 'fashion', icon: '👗', featured: true },
  { id: 'ff1ad8a2-94e7-4e70-a12f-e992ca9a0d36', name: 'Quiet Luxury', category: 'fashion', icon: '🤍', featured: true },
  { id: '96758335-d1d1-42b7-9c21-5ac38c433485', name: 'Gorpcore', category: 'fashion', icon: '🏔️' },
  { id: 'bd78cfc6-9b92-4889-9347-f21dbf0a269c', name: 'Coquette Core', category: 'fashion', icon: '🎀' },
  { id: 'ad9de607-3941-4540-81ea-ba978ef1550b', name: 'Grunge', category: 'fashion', icon: '🖤' },
  { id: '5a72fec7-a12e-43db-8ef3-1d193b4f7ab4', name: 'Indie Sleaze', category: 'fashion', icon: '🍺' },
  { id: 'f96913e8-2fcf-4358-8545-75dd6c34c518', name: 'Bimbocore', category: 'fashion', icon: '💅' },
  { id: '84c23cef-7eda-4f8f-9931-e3e6af8192d9', name: 'Burgundy Suit', category: 'fashion', icon: '🍷' },
  { id: '90df2935-3ded-477f-8253-1d67dd939cbe', name: 'Bike Mafia', category: 'fashion', icon: '🏍️' },
  { id: '91abc4fe-1cf8-4a77-8ade-d36d46699014', name: 'Green Editorial', category: 'fashion', icon: '🌿' },
  { id: '710f9073-f580-48dc-b5c3-9bbc7cbb7f37', name: "90's Editorial", category: 'fashion', icon: '📰' },
  { id: '71fecd8c-6696-42df-b5eb-f69e4150ca01', name: '0.5 Outfit', category: 'fashion', icon: '👔' },

  // ── Photography ──
  { id: '1b798b54-03da-446a-93bf-12fcba1050d7', name: 'iPhone', category: 'photo', icon: '📱', featured: true },
  { id: 'ca4e6ad3-3e93-4e03-81a0-d1722d2c128b', name: 'DigitalCam', category: 'photo', icon: '📷' },
  { id: 'f5c094c7-4671-4d86-90d2-369c8fdbd7a5', name: '90s Grain', category: 'photo', icon: '🎞️' },
  { id: '83caff04-691c-468c-b4a0-fd6bbabe062b', name: 'Vintage PhotoBooth', category: 'photo', icon: '🎰' },
  { id: 'cc4e7248-dcfe-4c93-b264-2ab418a7556b', name: 'Fisheye', category: 'photo', icon: '🐟' },
  { id: 'd8a35238-ba42-48a0-a76a-186a97734b9d', name: 'Overexposed', category: 'photo', icon: '☀️' },
  { id: '181b3796-008a-403b-b31e-a9b760219f17', name: '2000s Cam', category: 'photo', icon: '📸' },
  { id: '294bb3ee-eaef-4d2a-93e3-164268803db4', name: '360 Cam', category: 'photo', icon: '🔄' },
  { id: '811de7ab-7aaf-4a6b-b352-cdea6c34c8f1', name: 'Movie', category: 'photo', icon: '🎬' },
  { id: '40ff999c-f576-443c-b5b3-c7d1391a666e', name: 'Spotlight', category: 'photo', icon: '💡' },
  { id: 'd4775423-d214-4862-b061-47baa1978208', name: 'Fish-eye Twin', category: 'photo', icon: '👯' },

  // ── Selfie ──
  { id: '8dd89de9-1cff-402e-88a8-580c29d91473', name: '0.5 Selfie', category: 'selfie', icon: '🤳', featured: true },
  { id: '9de8ed26-c8dd-413c-a5e3-47eec97bc243', name: 'Ring Selfie', category: 'selfie', icon: '💍' },
  { id: '255f4045-d68b-42b1-9e4c-f49d3263a9d7', name: 'Grillz Selfie', category: 'selfie', icon: '😬' },
  { id: '524be50a-4388-4ff5-a843-a73d2dd7ef87', name: 'Elevator Mirror', category: 'selfie', icon: '🪞' },
  { id: '88126a43-86fb-4047-a2d6-c9146d6ca6ce', name: 'Duplicate', category: 'selfie', icon: '👥' },

  // ── Mood ──
  { id: '0fe8ad66-ff61-411f-9186-b392e140b18c', name: 'Foggy Morning', category: 'mood', icon: '🌫️', featured: true },
  { id: '62ba1751-63af-4648-a11c-711ac64e216a', name: 'Night Beach', category: 'mood', icon: '🌊' },
  { id: '53bdadfa-8eb6-4eaa-8923-ebece4faa91c', name: 'Rainy Day', category: 'mood', icon: '🌧️' },
  { id: '26241c54-ed78-4ea7-b1bf-d881737c9feb', name: 'Sunset Beach', category: 'mood', icon: '🌅' },
  { id: '493bda5b-bb4b-46fe-9343-7d5e414534ef', name: 'Clouded Dream', category: 'mood', icon: '☁️' },
  { id: '5dbb6a20-0541-4f06-8352-a2408d8781dc', name: 'Nicotine Glow', category: 'mood', icon: '🚬' },
  { id: 'a643a36a-85e6-4e3d-80db-13e4997203cc', name: 'Hallway Noir', category: 'mood', icon: '🕵️' },
  { id: 'fb9cee2b-632f-4fd4-ae4f-4664deecc0f4', name: 'Static Glow', category: 'mood', icon: '⚡' },
  { id: '5765d07d-1525-4d4d-ae06-9091e2bdac2d', name: 'Afterparty Cam', category: 'mood', icon: '🎉' },
  { id: '1fba888b-9ab0-447f-a6a4-9ce5251ec2a6', name: 'Night Rider', category: 'mood', icon: '🏎️' },
  { id: 'c7ea4e7a-c40c-498d-948c-1f6919631f60', name: 'Rhyme & Blues', category: 'mood', icon: '🎵' },

  // ── Concept ──
  { id: '7f21e7bd-4df6-4cef-a9a9-9746bceaea1d', name: 'Fairycore', category: 'concept', icon: '🧚' },
  { id: '1fc861ed-5923-41a6-9963-b9f04681dddd', name: 'Medieval', category: 'concept', icon: '⚔️' },
  { id: 'b3c8075a-cb4c-42de-b8b3-7099dd2df672', name: 'Creatures', category: 'concept', icon: '🐉' },
  { id: '4c24b43b-1984-407a-a0ae-c514f29b7e66', name: 'Angel Wings', category: 'concept', icon: '👼' },
  { id: '0c636e12-3411-4a65-8d86-67858caf2fa7', name: 'Avant-garde', category: 'concept', icon: '🎨' },
  { id: '373420f7-489e-4a5d-930e-cc4ecfcc23cc', name: 'Fireproof', category: 'concept', icon: '🔥' },
  { id: '53959c8a-4323-4b78-9888-e9f6fb0f6b98', name: '2049', category: 'concept', icon: '🤖' },
  { id: '5b6f467e-f509-4afe-a8db-4c07a6f3770d', name: 'Swords Hill', category: 'concept', icon: '🗡️' },
  { id: '3de71b9e-3973-4828-b246-a34c606e25a7', name: 'Red Balloon', category: 'concept', icon: '🎈' },
  { id: '70fbb531-5ee2-492e-8c53-5dbd6923e8c2', name: 'Giant Accessory', category: 'concept', icon: '🎒' },
  { id: 'a5f63c3b-70eb-4979-af5e-98c7ee1e18e8', name: 'Giant People', category: 'concept', icon: '🏙️' },
  { id: '2d47f079-c021-4b8e-b2c0-3b927a80fc31', name: 'Birthday Mess', category: 'concept', icon: '🎂' },
  { id: '5ad23bca-4a4b-4316-8c59-b80d7709d8ee', name: "Help It's Too Big", category: 'concept', icon: '😱' },
  { id: 'cbefda85-0f76-49bd-82d7-9bcd65be00ca', name: 'Y2K Posters', category: 'concept', icon: '🖼️' },

  // ── Location ──
  { id: 'dab472a6-23f4-4cf8-98fe-f3e256f1b549', name: 'Amalfi Summer', category: 'location', icon: '🇮🇹', featured: true },
  { id: 'de0118ba-7c27-49f7-9841-38abe2aae8e1', name: 'Mt. Fuji', category: 'location', icon: '🗻' },
  { id: 'ce9a88c2-c962-45e2-abaa-c8979d48f8d5', name: 'Tokyo Drift', category: 'location', icon: '🏎️' },
  { id: 'e454956b-caf2-4913-a398-dbc03f1cbedf', name: 'Office Beach', category: 'location', icon: '🏖️' },
  { id: 'd2e8ba04-9935-4dee-8bc4-39ac789746fc', name: 'Subway', category: 'location', icon: '🚇' },
  { id: '36061eb7-4907-4cba-afb1-47afcf699873', name: 'Gallery', category: 'location', icon: '🖼️' },
  { id: '6fb3e1f5-d721-4523-ac38-9902f2b2b850', name: 'Library', category: 'location', icon: '📚' },
  { id: '673cf0d4-c193-4fa2-8ad3-b4db4611e3ae', name: '505 Room', category: 'location', icon: '🚪' },
  { id: 'd3e2b71d-b24b-462e-bd96-12f7a22b5142', name: 'Crossing the Street', category: 'location', icon: '🚶' },
  { id: 'bab6e4bd-9093-4bb5-a371-01ef6cbd58ad', name: 'Escalator', category: 'location', icon: '🛗' },
  { id: '7696fd45-6e67-47d7-b800-096ce21cd449', name: 'Sitting on the Street', category: 'location', icon: '🛋️' },
  { id: '3f90dc5b-f474-4259-95c4-d29fbd6be645', name: 'Flight Mode', category: 'location', icon: '✈️' },

  // ── Experimental ──
  { id: '62355e77-7096-45ae-9bea-e7c5b88c3b70', name: 'Glitch', category: 'experimental', icon: '📺' },
  { id: '7fa63380-64b7-48b1-b684-4c9ef37560a7', name: 'Paper Face', category: 'experimental', icon: '📄' },
  { id: '34c50302-83ff-487d-b3a9-e35e501d80a7', name: 'Pixelated Face', category: 'experimental', icon: '🟩' },
  { id: '07a85fb3-4407-4122-a4eb-42124e57734c', name: 'CCTV', category: 'experimental', icon: '📹' },
  { id: '2fcf02e2-919a-4642-8b31-d58bde5e6bd9', name: 'Mixed Media', category: 'experimental', icon: '🎨' },
  { id: '372cc37b-9add-4952-a415-53db3998139f', name: 'Geominimal', category: 'experimental', icon: '📐' },
  { id: '82edba1e-b093-4484-a25e-9276e0454999', name: 'Invertethereal', category: 'experimental', icon: '🔮' },
  { id: '0b4dac9a-f73a-4e5b-a5a7-1a40ee40d6ac', name: 'Graffiti', category: 'experimental', icon: '🎨' },

  // ── Beauty / Makeup ──
  { id: 'b7c621b5-9d3c-46a3-8efb-4cdfbc592271', name: 'Babydoll Makeup', category: 'concept', icon: '🎀' },
  { id: 'cc099663-9621-422e-8626-c8ee68953a0c', name: 'Bleached Brows', category: 'concept', icon: '👁️' },
  { id: 'a2a42ada-75cc-42a9-be12-cb16c1dec2a8', name: 'Glazed Doll Skin', category: 'concept', icon: '✨' },
  { id: 'b7908955-2868-4e35-87a0-35e50cb92e5d', name: 'Object Makeup', category: 'concept', icon: '💄' },
  { id: 'ea6f4dc0-d6dd-4bdf-a8cf-94ed1db91ab2', name: 'Hair Clips', category: 'concept', icon: '🦋' },

  // ── Lifestyle ──
  { id: '7df83cc9-1e13-4bd0-b6ff-1e6a456b9e5a', name: 'Eating Food', category: 'location', icon: '🍜' },
  { id: 'd24c016c-9fb1-47d0-9909-19f57a2830d4', name: 'Selfcare', category: 'mood', icon: '🧖' },
  { id: 'bc00b419-f8ca-4887-a990-e2760c3cb761', name: 'Sunbathing', category: 'mood', icon: '☀️' },
  { id: 'ba3d7634-447e-455c-98e3-63705d5403b8', name: 'Sand', category: 'mood', icon: '🏖️' },
  { id: '71ac929c-4002-4640-9b65-cb06402844c6', name: 'Sea Breeze', category: 'mood', icon: '🌊' },
  { id: '79bfaa63-4e12-4ea2-8ada-7d4406eecece', name: "It's French", category: 'fashion', icon: '🇫🇷' },
  { id: '0089e17c-d0f0-4d0c-b522-6d25c88a29fc', name: 'Japandi', category: 'concept', icon: '🎋' },
  { id: '0367d609-dfa1-4a81-a983-b2b19ecd6480', name: 'Tumblr', category: 'photo', icon: '📝' },
  { id: 'b9e2d7dc-78e6-4f7d-95dd-b62690e7b200', name: 'Artwork', category: 'experimental', icon: '🖌️' },
  { id: '4b66c2db-8166-4293-b1aa-5269c9effb07', name: 'Nail Check', category: 'selfie', icon: '💅' },
  { id: '30458874-d9c0-4d5a-b2b7-597e0eee2404', name: 'Shoe Check', category: 'selfie', icon: '👟' },
  { id: '1900111a-4ce8-42a7-9394-7367f0e0385c', name: 'Through The Glass', category: 'mood', icon: '🪟' },
  { id: '923e4fb0-d4ea-480c-876d-ac7cad862b9d', name: 'DMV', category: 'photo', icon: '🪪' },
  { id: '2a1898d0-548f-4433-8503-5721157b93a1', name: 'Double Take', category: 'experimental', icon: '👀' },
  { id: 'a13917c7-02a4-450f-b007-e72d53151980', name: 'Street View', category: 'location', icon: '🛣️' },
  { id: '12eda704-18e5-4783-aa0f-deba5296cc83', name: 'Long Legs', category: 'experimental', icon: '🦵' },

  // ── Selfie (expanded) ──
  { id: 'custom-selfie-mirror', name: 'Mirror Selfie', category: 'selfie', icon: '🪞', featured: true },
  { id: 'custom-selfie-gym', name: 'Gym Mirror Selfie', category: 'selfie', icon: '💪' },
  { id: 'custom-selfie-car', name: 'Car Selfie', category: 'selfie', icon: '🚗' },
  { id: 'custom-selfie-bathroom', name: 'Bathroom Selfie', category: 'selfie', icon: '🚿' },
  { id: 'custom-selfie-bed', name: 'Bed Selfie', category: 'selfie', icon: '🛏️' },
  { id: 'custom-selfie-group', name: 'Group Selfie', category: 'selfie', icon: '👯' },
  { id: 'custom-selfie-sunset', name: 'Sunset Selfie', category: 'selfie', icon: '🌅' },
  { id: 'custom-selfie-closeup', name: 'Extreme Close-up', category: 'selfie', icon: '👁️' },
  { id: 'custom-selfie-laughing', name: 'Laughing Selfie', category: 'selfie', icon: '😂' },
  { id: 'custom-selfie-pout', name: 'Duck Face / Pout', category: 'selfie', icon: '💋' },

  // ── Era / Época ──
  { id: 'custom-era-50s', name: '1950s Pin-Up', category: 'era', icon: '🎀', featured: true },
  { id: 'custom-era-60s', name: '1960s Mod', category: 'era', icon: '🌼' },
  { id: 'custom-era-70s', name: '1970s Disco', category: 'era', icon: '🪩' },
  { id: 'custom-era-80s', name: '1980s Neon', category: 'era', icon: '📼' },
  { id: 'custom-era-90s', name: '1990s Grunge', category: 'era', icon: '🎸' },
  { id: 'custom-era-2000s', name: '2000s Y2K', category: 'era', icon: '💿' },
  { id: 'custom-era-victorian', name: 'Victorian', category: 'era', icon: '🏰' },
  { id: 'custom-era-roaring20s', name: 'Roaring 20s', category: 'era', icon: '🥂' },
  { id: 'custom-era-future', name: 'Futuristic 2080', category: 'era', icon: '🚀' },
  { id: 'custom-era-medieval', name: 'Medieval Fantasy', category: 'era', icon: '⚔️' },

  // ── Social / Redes ──
  { id: 'custom-social-instagram', name: 'Instagram Editorial', category: 'social', icon: '📸', featured: true },
  { id: 'custom-social-tiktok', name: 'TikTok Viral', category: 'social', icon: '🎵' },
  { id: 'custom-social-pinterest', name: 'Pinterest Aesthetic', category: 'social', icon: '📌' },
  { id: 'custom-social-linkedin', name: 'LinkedIn Professional', category: 'social', icon: '💼' },
  { id: 'custom-social-dating', name: 'Dating App Profile', category: 'social', icon: '❤️' },
  { id: 'custom-social-ugc', name: 'UGC Creator', category: 'social', icon: '📦' },
  { id: 'custom-social-unboxing', name: 'Unboxing Content', category: 'social', icon: '📦' },
  { id: 'custom-social-storytime', name: 'Story Time', category: 'social', icon: '📱' },
  { id: 'custom-social-ootd', name: 'OOTD (Outfit of the Day)', category: 'social', icon: '👗' },
  { id: 'custom-social-grwm', name: 'GRWM (Get Ready)', category: 'social', icon: '💄' },

  // ── Lifestyle ──
  { id: 'custom-life-coffee', name: 'Coffee Shop', category: 'lifestyle', icon: '☕', featured: true },
  { id: 'custom-life-cooking', name: 'Cooking at Home', category: 'lifestyle', icon: '🍳' },
  { id: 'custom-life-reading', name: 'Reading a Book', category: 'lifestyle', icon: '📚' },
  { id: 'custom-life-yoga', name: 'Yoga / Meditation', category: 'lifestyle', icon: '🧘' },
  { id: 'custom-life-shopping', name: 'Shopping Spree', category: 'lifestyle', icon: '🛍️' },
  { id: 'custom-life-brunch', name: 'Brunch Date', category: 'lifestyle', icon: '🥂' },
  { id: 'custom-life-roadtrip', name: 'Road Trip', category: 'lifestyle', icon: '🚗' },
  { id: 'custom-life-picnic', name: 'Picnic in the Park', category: 'lifestyle', icon: '🧺' },
  { id: 'custom-life-spa', name: 'Spa Day', category: 'lifestyle', icon: '🧖' },
  { id: 'custom-life-nightout', name: 'Night Out', category: 'lifestyle', icon: '🌃' },
  { id: 'custom-life-concert', name: 'At a Concert', category: 'lifestyle', icon: '🎤' },
  { id: 'custom-life-beach', name: 'Beach Day', category: 'lifestyle', icon: '🏖️' },
  { id: 'custom-life-ski', name: 'Ski Resort', category: 'lifestyle', icon: '⛷️' },
  { id: 'custom-life-camping', name: 'Camping', category: 'lifestyle', icon: '⛺' },

  // ── Pose ──
  { id: 'custom-pose-sitting-cafe', name: 'Sitting at Café', category: 'pose', icon: '☕' },
  { id: 'custom-pose-walking-street', name: 'Walking Down Street', category: 'pose', icon: '🚶' },
  { id: 'custom-pose-leaning-wall', name: 'Leaning on Wall', category: 'pose', icon: '🧱' },
  { id: 'custom-pose-lying-bed', name: 'Lying in Bed', category: 'pose', icon: '🛌' },
  { id: 'custom-pose-dancing', name: 'Dancing', category: 'pose', icon: '💃' },
  { id: 'custom-pose-running', name: 'Running / Jogging', category: 'pose', icon: '🏃' },
  { id: 'custom-pose-looking-away', name: 'Looking Away (Candid)', category: 'pose', icon: '👀' },
  { id: 'custom-pose-backview', name: 'Back View (Over Shoulder)', category: 'pose', icon: '↩️' },
  { id: 'custom-pose-crouching', name: 'Crouching / Low Angle', category: 'pose', icon: '🧎' },
  { id: 'custom-pose-jumping', name: 'Jumping / Mid-Air', category: 'pose', icon: '🦘' },

  // ── Profession ──
  { id: 'custom-prof-ceo', name: 'CEO / Executive', category: 'profession', icon: '👔' },
  { id: 'custom-prof-doctor', name: 'Doctor', category: 'profession', icon: '🩺' },
  { id: 'custom-prof-chef', name: 'Chef', category: 'profession', icon: '👨‍🍳' },
  { id: 'custom-prof-artist', name: 'Artist / Painter', category: 'profession', icon: '🎨' },
  { id: 'custom-prof-musician', name: 'Musician', category: 'profession', icon: '🎸' },
  { id: 'custom-prof-athlete', name: 'Athlete', category: 'profession', icon: '🏅' },
  { id: 'custom-prof-pilot', name: 'Pilot', category: 'profession', icon: '✈️' },
  { id: 'custom-prof-scientist', name: 'Scientist', category: 'profession', icon: '🔬' },
  { id: 'custom-prof-teacher', name: 'Teacher', category: 'profession', icon: '📖' },
  { id: 'custom-prof-firefighter', name: 'Firefighter', category: 'profession', icon: '🚒' },

  // ── General (expanded) ──
  { id: 'custom-gen-cinematic', name: 'Cinematic', category: 'general', icon: '🎬' },
  { id: 'custom-gen-magazine', name: 'Magazine Cover', category: 'general', icon: '📰' },
  { id: 'custom-gen-passport', name: 'Passport Photo', category: 'general', icon: '🪪' },
  { id: 'custom-gen-headshot', name: 'Headshot', category: 'general', icon: '🎯' },
  { id: 'custom-gen-bw', name: 'Black & White', category: 'general', icon: '⚫' },
  { id: 'custom-gen-softfocus', name: 'Soft Focus', category: 'general', icon: '🌸' },
  { id: 'custom-gen-highkey', name: 'High Key', category: 'general', icon: '☁️' },
  { id: 'custom-gen-lowkey', name: 'Low Key', category: 'general', icon: '🖤' },
  { id: 'custom-gen-portrait', name: 'Portrait Studio', category: 'general', icon: '📸' },
  { id: 'custom-gen-candid', name: 'Candid Moment', category: 'general', icon: '📷' },

  // ── Fashion (expanded) ──
  { id: 'custom-fash-oldmoney', name: 'Old Money', category: 'fashion', icon: '🏛️' },
  { id: 'custom-fash-streetwear', name: 'Streetwear', category: 'fashion', icon: '🧢' },
  { id: 'custom-fash-cottagecore', name: 'Cottagecore', category: 'fashion', icon: '🌾' },
  { id: 'custom-fash-darkacademia', name: 'Dark Academia', category: 'fashion', icon: '📚' },
  { id: 'custom-fash-coastal', name: 'Coastal Grandmother', category: 'fashion', icon: '🐚' },
  { id: 'custom-fash-ballet', name: 'Balletcore', category: 'fashion', icon: '🩰' },
  { id: 'custom-fash-athleisure', name: 'Athleisure', category: 'fashion', icon: '🏃' },
  { id: 'custom-fash-boho', name: 'Boho Chic', category: 'fashion', icon: '🪶' },
  { id: 'custom-fash-minimal', name: 'Minimalist', category: 'fashion', icon: '◻️' },
  { id: 'custom-fash-powersuit', name: 'Power Suit', category: 'fashion', icon: '👔' },

  // ── Photography (expanded) ──
  { id: 'custom-photo-polaroid', name: 'Polaroid', category: 'photo', icon: '📸' },
  { id: 'custom-photo-medium', name: 'Medium Format', category: 'photo', icon: '🎞️' },
  { id: 'custom-photo-drone', name: 'Drone Aerial', category: 'photo', icon: '🛸' },
  { id: 'custom-photo-disposable', name: 'Disposable Camera', category: 'photo', icon: '📷' },
  { id: 'custom-photo-infrared', name: 'Infrared', category: 'photo', icon: '🔴' },
  { id: 'custom-photo-longexpo', name: 'Long Exposure', category: 'photo', icon: '💫' },
  { id: 'custom-photo-tiltshift', name: 'Tilt-Shift', category: 'photo', icon: '🔍' },
  { id: 'custom-photo-double', name: 'Double Exposure', category: 'photo', icon: '👥' },
  { id: 'custom-photo-noir', name: 'Film Noir', category: 'photo', icon: '🎬' },
  { id: 'custom-photo-paparazzi', name: 'Paparazzi', category: 'photo', icon: '📸' },

  // ── Selfie (expanded) ──
  { id: 'custom-selfie-pool', name: 'Pool Selfie', category: 'selfie', icon: '🏊' },
  { id: 'custom-selfie-airplane', name: 'Airplane Selfie', category: 'selfie', icon: '✈️' },
  { id: 'custom-selfie-messy', name: 'Messy Hair Selfie', category: 'selfie', icon: '💇' },
  { id: 'custom-selfie-nomakeup', name: 'No Makeup Selfie', category: 'selfie', icon: '🧖' },
  { id: 'custom-selfie-drunk', name: 'Drunk Selfie', category: 'selfie', icon: '🍷' },
  { id: 'custom-selfie-wakeup', name: 'Waking Up Selfie', category: 'selfie', icon: '😴' },
  { id: 'custom-selfie-work', name: 'Work Selfie', category: 'selfie', icon: '💼' },
  { id: 'custom-selfie-rainy', name: 'Rainy Day Selfie', category: 'selfie', icon: '🌧️' },
  { id: 'custom-selfie-festival', name: 'Festival Selfie', category: 'selfie', icon: '🎪' },
  { id: 'custom-selfie-foodie', name: 'Foodie Selfie', category: 'selfie', icon: '🍕' },

  // ── Mood (expanded) ──
  { id: 'custom-mood-golden', name: 'Golden Hour', category: 'mood', icon: '🌅', featured: true },
  { id: 'custom-mood-rainywindow', name: 'Rainy Window', category: 'mood', icon: '🌧️' },
  { id: 'custom-mood-cozywinter', name: 'Cozy Winter', category: 'mood', icon: '🧣' },
  { id: 'custom-mood-summerhaze', name: 'Summer Haze', category: 'mood', icon: '☀️' },
  { id: 'custom-mood-melancholic', name: 'Melancholic', category: 'mood', icon: '😔' },
  { id: 'custom-mood-euphoric', name: 'Euphoric', category: 'mood', icon: '🤩' },
  { id: 'custom-mood-mysterious', name: 'Mysterious', category: 'mood', icon: '🌑' },
  { id: 'custom-mood-nostalgic', name: 'Nostalgic', category: 'mood', icon: '📻' },
  { id: 'custom-mood-ethereal', name: 'Ethereal', category: 'mood', icon: '🦋' },
  { id: 'custom-mood-powerful', name: 'Powerful', category: 'mood', icon: '⚡' },

  // ── Concept (expanded) ──
  { id: 'custom-concept-angel', name: 'Angel / Wings', category: 'concept', icon: '😇' },
  { id: 'custom-concept-demon', name: 'Demon / Dark', category: 'concept', icon: '😈' },
  { id: 'custom-concept-mermaid', name: 'Mermaid', category: 'concept', icon: '🧜' },
  { id: 'custom-concept-fairy', name: 'Fairy', category: 'concept', icon: '🧚' },
  { id: 'custom-concept-royalty', name: 'Royalty / Crown', category: 'concept', icon: '👑' },
  { id: 'custom-concept-warrior', name: 'Warrior', category: 'concept', icon: '⚔️' },
  { id: 'custom-concept-cyberpunk', name: 'Cyberpunk', category: 'concept', icon: '🤖' },
  { id: 'custom-concept-steampunk', name: 'Steampunk', category: 'concept', icon: '⚙️' },
  { id: 'custom-concept-superhero', name: 'Superhero', category: 'concept', icon: '🦸' },
  { id: 'custom-concept-goddess', name: 'Goddess', category: 'concept', icon: '🏛️' },

  // ── Location (expanded) ──
  { id: 'custom-loc-tokyo', name: 'Tokyo at Night', category: 'location', icon: '🗼' },
  { id: 'custom-loc-paris', name: 'Paris Café', category: 'location', icon: '🥐' },
  { id: 'custom-loc-nyc', name: 'NYC Times Square', category: 'location', icon: '🗽' },
  { id: 'custom-loc-santorini', name: 'Santorini', category: 'location', icon: '🏝️' },
  { id: 'custom-loc-london', name: 'London Rain', category: 'location', icon: '☔' },
  { id: 'custom-loc-dubai', name: 'Dubai Skyline', category: 'location', icon: '🏙️' },
  { id: 'custom-loc-bali', name: 'Bali Temple', category: 'location', icon: '🛕' },
  { id: 'custom-loc-venice', name: 'Venice Canals', category: 'location', icon: '🛶' },
  { id: 'custom-loc-sahara', name: 'Sahara Desert', category: 'location', icon: '🏜️' },
  { id: 'custom-loc-aurora', name: 'Northern Lights', category: 'location', icon: '🌌' },

  // ── Era (expanded) ──
  { id: 'custom-era-egypt', name: 'Ancient Egypt', category: 'era', icon: '🏺' },
  { id: 'custom-era-greece', name: 'Ancient Greece', category: 'era', icon: '🏛️' },
  { id: 'custom-era-renaissance', name: 'Renaissance', category: 'era', icon: '🎨' },
  { id: 'custom-era-baroque', name: 'Baroque', category: 'era', icon: '🖼️' },
  { id: 'custom-era-artdeco', name: 'Art Deco', category: 'era', icon: '💎' },
  { id: 'custom-era-prohibition', name: 'Prohibition Era', category: 'era', icon: '🎩' },
  { id: 'custom-era-wildwest', name: 'Wild West', category: 'era', icon: '🤠' },
  { id: 'custom-era-space60s', name: 'Space Age 60s', category: 'era', icon: '🛸' },
  { id: 'custom-era-cyber2077', name: 'Cyberpunk 2077', category: 'era', icon: '🌆' },
  { id: 'custom-era-postapoc', name: 'Post-Apocalyptic', category: 'era', icon: '☢️' },

  // ── Social (expanded) ──
  { id: 'custom-social-youtube', name: 'YouTube Thumbnail', category: 'social', icon: '▶️' },
  { id: 'custom-social-twitch', name: 'Twitch Stream', category: 'social', icon: '🎮' },
  { id: 'custom-social-bereal', name: 'BeReal', category: 'social', icon: '📱' },
  { id: 'custom-social-vlog', name: 'Vlog Intro', category: 'social', icon: '🎥' },
  { id: 'custom-social-podcast', name: 'Podcast Cover', category: 'social', icon: '🎙️' },
  { id: 'custom-social-brandcollab', name: 'Brand Collab', category: 'social', icon: '🤝' },
  { id: 'custom-social-haul', name: 'Haul Video', category: 'social', icon: '🛍️' },
  { id: 'custom-social-workout', name: 'Workout Post', category: 'social', icon: '💪' },
  { id: 'custom-social-travel', name: 'Travel Post', category: 'social', icon: '✈️' },
  { id: 'custom-social-foodreview', name: 'Food Review', category: 'social', icon: '🍽️' },

  // ── Lifestyle (expanded) ──
  { id: 'custom-life-wine', name: 'Wine Tasting', category: 'lifestyle', icon: '🍷' },
  { id: 'custom-life-artgallery', name: 'Art Gallery', category: 'lifestyle', icon: '🖼️' },
  { id: 'custom-life-farmersmarket', name: 'Farmers Market', category: 'lifestyle', icon: '🌽' },
  { id: 'custom-life-movienight', name: 'Movie Night', category: 'lifestyle', icon: '🍿' },
  { id: 'custom-life-rooftop', name: 'Rooftop Party', category: 'lifestyle', icon: '🎉' },
  { id: 'custom-life-rainydayin', name: 'Rainy Day In', category: 'lifestyle', icon: '🌧️' },
  { id: 'custom-life-sunsetdrive', name: 'Sunset Drive', category: 'lifestyle', icon: '🌅' },
  { id: 'custom-life-morning', name: 'Morning Routine', category: 'lifestyle', icon: '☀️' },
  { id: 'custom-life-latenight', name: 'Late Night Study', category: 'lifestyle', icon: '📖' },
  { id: 'custom-life-festival', name: 'Festival / Rave', category: 'lifestyle', icon: '🎪' },

  // ── Pose (expanded) ──
  { id: 'custom-pose-floor', name: 'Sitting on Floor', category: 'pose', icon: '🧘' },
  { id: 'custom-pose-grass', name: 'Lying on Grass', category: 'pose', icon: '🌿' },
  { id: 'custom-pose-arms', name: 'Arms Crossed', category: 'pose', icon: '💪' },
  { id: 'custom-pose-hairflip', name: 'Hair Flip', category: 'pose', icon: '💇' },
  { id: 'custom-pose-blowkiss', name: 'Blowing a Kiss', category: 'pose', icon: '💋' },
  { id: 'custom-pose-peace', name: 'Peace Sign', category: 'pose', icon: '✌️' },
  { id: 'custom-pose-pockets', name: 'Hands in Pockets', category: 'pose', icon: '🧍' },
  { id: 'custom-pose-stretch', name: 'Stretching', category: 'pose', icon: '🤸' },
  { id: 'custom-pose-twirl', name: 'Twirling / Spinning', category: 'pose', icon: '💫' },
  { id: 'custom-pose-eating', name: 'Eating / Drinking', category: 'pose', icon: '🍵' },

  // ── Profession (expanded) ──
  { id: 'custom-prof-model', name: 'Model', category: 'profession', icon: '💃' },
  { id: 'custom-prof-dj', name: 'DJ', category: 'profession', icon: '🎧' },
  { id: 'custom-prof-photographer', name: 'Photographer', category: 'profession', icon: '📸' },
  { id: 'custom-prof-architect', name: 'Architect', category: 'profession', icon: '📐' },
  { id: 'custom-prof-astronaut', name: 'Astronaut', category: 'profession', icon: '🧑‍🚀' },
  { id: 'custom-prof-barista', name: 'Barista', category: 'profession', icon: '☕' },
  { id: 'custom-prof-nurse', name: 'Nurse', category: 'profession', icon: '🏥' },
  { id: 'custom-prof-lawyer', name: 'Lawyer', category: 'profession', icon: '⚖️' },
  { id: 'custom-prof-engineer', name: 'Engineer', category: 'profession', icon: '🔧' },
  { id: 'custom-prof-fashiondesigner', name: 'Fashion Designer', category: 'profession', icon: '✂️' },

  // ── Experimental (expanded) ──
  { id: 'custom-exp-hologram', name: 'Hologram', category: 'experimental', icon: '🌀' },
  { id: 'custom-exp-xray', name: 'X-Ray', category: 'experimental', icon: '☠️' },
  { id: 'custom-exp-thermal', name: 'Thermal Vision', category: 'experimental', icon: '🌡️' },
  { id: 'custom-exp-underwater', name: 'Underwater', category: 'experimental', icon: '🫧' },
  { id: 'custom-exp-zerog', name: 'Zero Gravity', category: 'experimental', icon: '🪐' },
  { id: 'custom-exp-miniature', name: 'Miniature / Tilt', category: 'experimental', icon: '🔍' },
  { id: 'custom-exp-mirror', name: 'Mirror Shatter', category: 'experimental', icon: '🪞' },
  { id: 'custom-exp-smoke', name: 'Smoke / Fog', category: 'experimental', icon: '🌫️' },
  { id: 'custom-exp-neonoutline', name: 'Neon Outline', category: 'experimental', icon: '💜' },
  { id: 'custom-exp-clone', name: 'Clone Army', category: 'experimental', icon: '👯' },

  // ── Expressions / Face Gestures ──
  { id: 'custom-expr-bitinglip', name: 'Biting Lip', category: 'expression', icon: '😏' },
  { id: 'custom-expr-sideeye', name: 'Side Eye', category: 'expression', icon: '👀' },
  { id: 'custom-expr-tongueout', name: 'Tongue Out', category: 'expression', icon: '😛' },
  { id: 'custom-expr-wink', name: 'Wink', category: 'expression', icon: '😉' },
  { id: 'custom-expr-smirk', name: 'Smirk', category: 'expression', icon: '😼' },
  { id: 'custom-expr-surprised', name: 'Surprised / Wow', category: 'expression', icon: '😲' },
  { id: 'custom-expr-eyeroll', name: 'Eye Roll', category: 'expression', icon: '🙄' },
  { id: 'custom-expr-bubble', name: 'Blowing Bubble', category: 'expression', icon: '🫧' },
  { id: 'custom-expr-bitingnail', name: 'Biting Nail', category: 'expression', icon: '💅' },
  { id: 'custom-expr-whispering', name: 'Whispering', category: 'expression', icon: '🤫' },
  { id: 'custom-expr-crying', name: 'Crying', category: 'expression', icon: '😢' },
  { id: 'custom-expr-angry', name: 'Angry', category: 'expression', icon: '😤' },
  { id: 'custom-expr-shy', name: 'Shy / Blushing', category: 'expression', icon: '🫣' },
  { id: 'custom-expr-confident', name: 'Confident Stare', category: 'expression', icon: '😎' },
  { id: 'custom-expr-laughing', name: 'Laughing Hard', category: 'expression', icon: '🤣' },
  { id: 'custom-expr-dreamy', name: 'Dreamy / Gazing', category: 'expression', icon: '🥰' },
  { id: 'custom-expr-serious', name: 'Dead Serious', category: 'expression', icon: '😐' },
  { id: 'custom-expr-pouty', name: 'Pouty', category: 'expression', icon: '😤' },
  { id: 'custom-expr-flirty', name: 'Flirty Smile', category: 'expression', icon: '😊' },
  { id: 'custom-expr-scared', name: 'Scared / Shocked', category: 'expression', icon: '😨' },
  { id: 'custom-expr-sleepy', name: 'Sleepy / Tired', category: 'expression', icon: '😴' },
  { id: 'custom-expr-sassy', name: 'Sassy', category: 'expression', icon: '💅' },
  { id: 'custom-expr-thinking', name: 'Thinking / Pensive', category: 'expression', icon: '🤔' },
  { id: 'custom-expr-innocent', name: 'Innocent / Doe Eyes', category: 'expression', icon: '🥺' },
  { id: 'custom-expr-fierce', name: 'Fierce / Model Face', category: 'expression', icon: '🔥' },
  { id: 'custom-expr-peace', name: 'Peace & Smile', category: 'expression', icon: '✌️' },
  { id: 'custom-expr-kissy', name: 'Blowing Kiss', category: 'expression', icon: '😘' },
  { id: 'custom-expr-disgust', name: 'Disgusted', category: 'expression', icon: '🤢' },
  { id: 'custom-expr-eyesclosed', name: 'Eyes Closed Peaceful', category: 'expression', icon: '😌' },

  // ── Coquette / Sensual Poses ──
  { id: 'custom-coq-shoulder', name: 'Over the Shoulder', category: 'pose', icon: '🔙' },
  { id: 'custom-coq-chinonhand', name: 'Chin on Hand', category: 'pose', icon: '🤔' },
  { id: 'custom-coq-playinghair', name: 'Playing with Hair', category: 'pose', icon: '💇' },
  { id: 'custom-coq-crossleg', name: 'Sitting Cross-Legged', category: 'pose', icon: '🧘' },
  { id: 'custom-coq-lyingstomach', name: 'Lying on Stomach', category: 'pose', icon: '🛌' },
  { id: 'custom-coq-handonhip', name: 'Hand on Hip', category: 'pose', icon: '💃' },
  { id: 'custom-coq-lookingup', name: 'Looking Up (Innocent)', category: 'pose', icon: '🥺' },
  { id: 'custom-coq-stretchbed', name: 'Stretching in Bed', category: 'pose', icon: '🛏️' },
  { id: 'custom-coq-hugknees', name: 'Hugging Knees', category: 'pose', icon: '🧸' },
  { id: 'custom-coq-backarched', name: 'Back Arched', category: 'pose', icon: '🐱' },

  // ── Content Creator Specific ──
  { id: 'custom-cc-producthold', name: 'Product Hold', category: 'content', icon: '🧴' },
  { id: 'custom-cc-beforeafter', name: 'Before & After', category: 'content', icon: '↔️' },
  { id: 'custom-cc-reactionface', name: 'Reaction Face', category: 'content', icon: '😱' },
  { id: 'custom-cc-tutorial', name: 'Tutorial Pose', category: 'content', icon: '👩‍🏫' },
  { id: 'custom-cc-testimonial', name: 'Testimonial', category: 'content', icon: '💬' },
  { id: 'custom-cc-hauldisplay', name: 'Haul Display', category: 'content', icon: '🛍️' },
  { id: 'custom-cc-tastetest', name: 'Taste Test', category: 'content', icon: '😋' },
  { id: 'custom-cc-outfitspin', name: 'Outfit Spin', category: 'content', icon: '🔄' },
  { id: 'custom-cc-flatlay', name: 'Flat Lay Style', category: 'content', icon: '📐' },
  { id: 'custom-cc-phonecam', name: 'Phone to Camera', category: 'content', icon: '📱' },
  { id: 'custom-cc-asmr', name: 'ASMR Close-up', category: 'content', icon: '🎧' },
  { id: 'custom-cc-skincare', name: 'Skincare Routine', category: 'content', icon: '🧴' },
  { id: 'custom-cc-mukbang', name: 'Mukbang', category: 'content', icon: '🍜' },
  { id: 'custom-cc-workout', name: 'Workout Demo', category: 'content', icon: '💪' },
  { id: 'custom-cc-pov', name: 'POV / First Person', category: 'content', icon: '👁️' },

  // ── Aesthetic / Vibra ──
  { id: 'custom-aes-cleangirl', name: 'Clean Girl', category: 'aesthetic', icon: '🧼', featured: true },
  { id: 'custom-aes-thatgirl', name: 'That Girl', category: 'aesthetic', icon: '🌿', featured: true },
  { id: 'custom-aes-softgirl', name: 'Soft Girl', category: 'aesthetic', icon: '🧸' },
  { id: 'custom-aes-baddie', name: 'Baddie', category: 'aesthetic', icon: '🔥', featured: true },
  { id: 'custom-aes-egirl', name: 'E-Girl', category: 'aesthetic', icon: '⛓️' },
  { id: 'custom-aes-darkfem', name: 'Dark Feminine', category: 'aesthetic', icon: '🖤' },
  { id: 'custom-aes-lightfem', name: 'Light Feminine', category: 'aesthetic', icon: '🤍' },
  { id: 'custom-aes-tomboy', name: 'Tomboy', category: 'aesthetic', icon: '🧢' },
  { id: 'custom-aes-mobwife', name: 'Mob Wife', category: 'aesthetic', icon: '🦊' },
  { id: 'custom-aes-vanilla', name: 'Vanilla Girl', category: 'aesthetic', icon: '🍦' },
  { id: 'custom-aes-dollette', name: 'Dollette', category: 'aesthetic', icon: '🎀' },
  { id: 'custom-aes-witchcore', name: 'Witchcore', category: 'aesthetic', icon: '🔮' },
  { id: 'custom-aes-angelcore', name: 'Angelcore', category: 'aesthetic', icon: '👼' },
  { id: 'custom-aes-fairycore', name: 'Fairycore', category: 'aesthetic', icon: '🧚' },
  { id: 'custom-aes-royalcore', name: 'Royalcore', category: 'aesthetic', icon: '👑' },
  { id: 'custom-aes-corpcore', name: 'Corpcore', category: 'aesthetic', icon: '🏢' },
  { id: 'custom-aes-normcore', name: 'Normcore', category: 'aesthetic', icon: '👕' },
  { id: 'custom-aes-coastal', name: 'Coastal Cowgirl', category: 'aesthetic', icon: '🤠' },
  { id: 'custom-aes-downtown', name: 'Downtown Girl', category: 'aesthetic', icon: '🌆' },
  { id: 'custom-aes-itgirl', name: 'It Girl', category: 'aesthetic', icon: '💎' },
  { id: 'custom-aes-parisian', name: 'Parisian Chic', category: 'aesthetic', icon: '🇫🇷' },
  { id: 'custom-aes-scandi', name: 'Scandinavian Minimal', category: 'aesthetic', icon: '🏔️' },
  { id: 'custom-aes-miami', name: 'Miami Vice', category: 'aesthetic', icon: '🌴' },
  { id: 'custom-aes-rockstar', name: 'Rockstar Girlfriend', category: 'aesthetic', icon: '🎸' },
  { id: 'custom-aes-offduty', name: 'Off-Duty Model', category: 'aesthetic', icon: '🕶️' },

  // ── Fashion (more) ──
  { id: 'custom-fash-haute', name: 'Haute Couture', category: 'fashion', icon: '👑' },
  { id: 'custom-fash-punk', name: 'Punk', category: 'fashion', icon: '🤘' },
  { id: 'custom-fash-preppy', name: 'Preppy', category: 'fashion', icon: '🎓' },
  { id: 'custom-fash-vintage', name: 'Vintage Thrift', category: 'fashion', icon: '🧥' },
  { id: 'custom-fash-sporty', name: 'Sporty Spice', category: 'fashion', icon: '⚽' },
  { id: 'custom-fash-lingerie', name: 'Lingerie / Boudoir', category: 'fashion', icon: '🩱' },
  { id: 'custom-fash-swimwear', name: 'Swimwear', category: 'fashion', icon: '👙' },
  { id: 'custom-fash-formal', name: 'Black Tie / Gala', category: 'fashion', icon: '🎩' },
  { id: 'custom-fash-denim', name: 'Full Denim', category: 'fashion', icon: '👖' },
  { id: 'custom-fash-leather', name: 'All Leather', category: 'fashion', icon: '🖤' },
  { id: 'custom-fash-monochrome', name: 'Monochrome', category: 'fashion', icon: '⬛' },
  { id: 'custom-fash-neon', name: 'Neon / Rave', category: 'fashion', icon: '💚' },
  { id: 'custom-fash-oversized', name: 'Oversized Everything', category: 'fashion', icon: '🧸' },
  { id: 'custom-fash-sheer', name: 'Sheer / See-Through', category: 'fashion', icon: '🫧' },
  { id: 'custom-fash-layered', name: 'Layered / Stacked', category: 'fashion', icon: '🧅' },

  // ── Places (cotidian / everyday) ──
  { id: 'custom-place-bedroom', name: 'Bedroom', category: 'place', icon: '🛏️', featured: true },
  { id: 'custom-place-bathroom', name: 'Bathroom Mirror', category: 'place', icon: '🪞' },
  { id: 'custom-place-kitchen', name: 'Kitchen', category: 'place', icon: '🍳' },
  { id: 'custom-place-livingroom', name: 'Living Room', category: 'place', icon: '🛋️' },
  { id: 'custom-place-balcony', name: 'Balcony', category: 'place', icon: '🌇' },
  { id: 'custom-place-closet', name: 'Walk-in Closet', category: 'place', icon: '👗' },
  { id: 'custom-place-bathtub', name: 'Bathtub', category: 'place', icon: '🛁' },
  { id: 'custom-place-gym', name: 'Gym', category: 'place', icon: '🏋️', featured: true },
  { id: 'custom-place-yogastudio', name: 'Yoga Studio', category: 'place', icon: '🧘' },
  { id: 'custom-place-boxingring', name: 'Boxing Ring', category: 'place', icon: '🥊' },
  { id: 'custom-place-pool', name: 'Pool Deck', category: 'place', icon: '🏊' },
  { id: 'custom-place-restaurant', name: 'Restaurant', category: 'place', icon: '🍽️', featured: true },
  { id: 'custom-place-bar', name: 'Bar / Club', category: 'place', icon: '🍸' },
  { id: 'custom-place-rooftop', name: 'Rooftop Terrace', category: 'place', icon: '🌃' },
  { id: 'custom-place-hotellobby', name: 'Hotel Lobby', category: 'place', icon: '🏨' },
  { id: 'custom-place-hotelroom', name: 'Hotel Room', category: 'place', icon: '🛏️' },
  { id: 'custom-place-elevator', name: 'Elevator', category: 'place', icon: '🔼' },
  { id: 'custom-place-parking', name: 'Parking Lot', category: 'place', icon: '🅿️' },
  { id: 'custom-place-gasstation', name: 'Gas Station', category: 'place', icon: '⛽' },
  { id: 'custom-place-laundromat', name: 'Laundromat', category: 'place', icon: '🧺' },
  { id: 'custom-place-subway', name: 'Subway / Metro', category: 'place', icon: '🚇' },
  { id: 'custom-place-stairwell', name: 'Stairwell', category: 'place', icon: '🪜' },
  { id: 'custom-place-alley', name: 'Back Alley', category: 'place', icon: '🌆' },
  { id: 'custom-place-mall', name: 'Shopping Mall', category: 'place', icon: '🏬' },
  { id: 'custom-place-luxurystore', name: 'Luxury Store', category: 'place', icon: '💎' },
  { id: 'custom-place-thrift', name: 'Thrift Shop', category: 'place', icon: '🛍️' },
  { id: 'custom-place-bookstore', name: 'Bookstore', category: 'place', icon: '📚' },
  { id: 'custom-place-supermarket', name: 'Supermarket', category: 'place', icon: '🛒' },
  { id: 'custom-place-forest', name: 'Forest', category: 'place', icon: '🌲' },
  { id: 'custom-place-waterfall', name: 'Waterfall', category: 'place', icon: '💧' },
  { id: 'custom-place-flowerfield', name: 'Flower Field', category: 'place', icon: '🌻' },
  { id: 'custom-place-vineyard', name: 'Vineyard', category: 'place', icon: '🍇' },
  { id: 'custom-place-lake', name: 'Lake', category: 'place', icon: '🏞️' },
  { id: 'custom-place-cliff', name: 'Cliff Edge', category: 'place', icon: '🏔️' },
  { id: 'custom-place-carinterior', name: 'Car Interior', category: 'place', icon: '🚗' },
  { id: 'custom-place-backseat', name: 'Back Seat', category: 'place', icon: '🚘' },
  { id: 'custom-place-motorcycle', name: 'Motorcycle', category: 'place', icon: '🏍️' },
  { id: 'custom-place-yacht', name: 'Yacht', category: 'place', icon: '🛥️' },
  { id: 'custom-place-privatejet', name: 'Private Jet', category: 'place', icon: '✈️' },
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
