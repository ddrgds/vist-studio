// data/sessionPresets.ts

export interface SessionPreset {
  id: string;
  icon: string;
  label: string;
  description: string;
  shots: string[];  // Short, action-oriented pose/angle directions for edit models
}

/**
 * Realism prefix — injected into every session prompt to force
 * natural, phone-quality output instead of AI-looking imagery.
 */
export const REALISM_PREFIX = 'Shot on iPhone 15 Pro, casual mirror selfie or candid moment. Phone visible in hand with a colored phone case. Natural window light, no flash, no ring light, no studio setup. Slight lens softness and shallow depth of field from a phone camera. Real environment clutter: beauty products on counter, towels, flowers on nightstand, unmade bed, toiletries visible. Imperfect framing — slightly off-center, natural tilt. No AI artifacts, no perfect symmetry, no airbrushed skin, no uncanny smoothness. Looks like a real Instagram post by an actual person, not a render or stock photo.'

/**
 * FACE LOCK — absolute constraint injected into every session prompt.
 * Ensures the face from the base image is never altered across pose variations.
 */
export const FACE_LOCK_PROMPT = `⚠️ FACE LOCK — ABSOLUTE CONSTRAINT (process before anything else):
The face in the Base Image is FROZEN. You are FORBIDDEN from altering, redesigning, smoothing, idealizing, or blending it in any way.
Reproduce with pixel-perfect fidelity: bone structure, eye shape, eye color, iris color, nose, lips, skin tone, skin texture, hair color, hair style, and every distinguishing facial feature.
Any deviation from the Base Image face is a critical failure.`;

/**
 * OUTFIT PRESERVE — keeps the same clothing across all session shots.
 */
export const OUTFIT_PRESERVE_PROMPT = `OUTFIT: Preserve the exact outfit from the Base Image — same garments, colors, textures, fabric, cut, fit, and details. No clothing changes unless explicitly instructed.`;

/**
 * FACE CHECK — final verification appended at end of prompt.
 */
export const FACE_CHECK_PROMPT = `⚠️ FINAL FACE CHECK: Before rendering — verify the face matches the Base Image exactly. If it does not, correct it to match. The face is the non-negotiable identity anchor of this edit.`;

export const PHOTO_SESSION_PRESETS: SessionPreset[] = [
  {
    id: 'selfies',
    icon: '\uD83E\uDD33',
    label: 'Selfies',
    description: 'Selfies de espejo, teléfono visible, cuartos reales',
    shots: [
      'bathroom mirror selfie standing, iPhone with colored case visible in hand, marble tiles and LED backlit mirror behind, beauty products and folded towels on counter, casual confident stance, natural window light',
      'bedroom full-length arch mirror selfie, standing with back slightly turned looking over shoulder at phone screen, bed with white sheets and pillows visible in reflection, pink flowers on nightstand, warm afternoon light',
      'sitting on bathroom marble counter, side profile, legs crossed, phone held up to mirror, glass shower door and toiletries visible behind, relaxed expression, soft overhead light',
      'crouching low in front of bathroom mirror, phone held up at face level, knees together, playful head tilt, marble floor tiles visible, beauty products on counter behind',
      'lying on bed propped on one elbow, phone held up toward bedroom mirror, legs stretched out in jeans, white bedding wrinkled naturally, warm golden light from window, soft subtle smile',
      'standing in front of bedroom mirror applying lipstick with one hand, phone in other hand capturing the moment, concentrated expression, nightstand with lamp and flowers visible',
      'sitting cross-legged on bed, phone held up casually, slight smirk, pillows and throw blanket around, soft natural morning light from window behind',
    ],
  },
  {
    id: 'grwm',
    icon: '\uD83D\uDC84',
    label: 'GRWM',
    description: 'Arreglándose, rutina de belleza, espejo',
    shots: [
      'applying lip gloss in bathroom mirror, phone in other hand filming, beauty products scattered on marble counter, focused concentrated expression, natural light from window',
      'sitting on bathroom counter doing mascara, legs dangling, mirror reflection showing the room behind, towels and skincare bottles visible, morning routine vibe',
      'standing at vanity brushing hair to one side, phone propped against mirror recording, half-dressed getting ready, warm bedroom light',
      'checking makeup in phone front camera, face close to screen, bathroom mirror showing back of head, beauty products on counter, satisfied expression',
      'spritzing perfume on neck, eyes closed, bathroom mirror selfie, iPhone capturing the moment, luxury toiletries visible on counter',
    ],
  },
  {
    id: 'stories',
    icon: '\uD83D\uDCF1',
    label: 'Stories',
    description: 'Contenido vertical, energía casual',
    shots: [
      'front camera selfie talking to phone, arm extended holding iPhone, expressive face mid-sentence, cozy room background slightly blurred, natural indoor light',
      'walking down hallway toward a mirror, phone up recording, casual outfit, natural stride, apartment interior visible',
      'sitting on couch holding phone up for a story, blanket over legs, reacting to something funny on screen, living room background',
      'standing in kitchen making coffee, phone propped on counter filming, looking at camera with sleepy morning smile, natural light from window',
      'dancing in bedroom mirror, phone held up recording, hair bouncing, carefree expression, messy bed visible behind',
    ],
  },
  {
    id: 'editorial',
    icon: '\uD83C\uDF9E\uFE0F',
    label: 'Editorial',
    description: 'Estilizado pero natural, moda vanguardista',
    shots: [
      'mirror selfie in leather jacket over a dress, phone visible in hand, bathroom marble background, confident stance with one hand on hip, natural window light',
      'sitting on windowsill in styled outfit, phone resting on knee, city view behind, natural sidelight, thoughtful gaze toward window',
      'standing in hallway mirror, full outfit visible, heels and bag, phone at chest level, apartment hallway with coat hooks visible behind',
      'sitting on floor leaning against bed, legs stretched out, phone in lap, looking up at camera, styled outfit with accessories, warm bedroom light',
      'walking past a large mirror in a hotel lobby or entrance, caught mid-stride, phone in hand, coat flowing, candid motion blur feel',
    ],
  },
  {
    id: 'portrait',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Retrato',
    description: 'Fotos close-up del rostro, luz natural',
    shots: [
      'close-up selfie with phone at face level, soft three-quarter turn, resting chin on hand, warm window light on face, bedroom or living room blurred behind',
      'looking at phone screen with gentle smile, face lit by screen glow mixed with natural light, hair tucked behind ear, candid intimate moment',
      'selfie looking down with faint smile, phone slightly above eye level, eyelashes catching light, cozy indoor background',
      'looking over shoulder toward a mirror, mysterious half-smile, phone capturing the back view, soft natural backlight from window',
      'face close to phone camera, eyes closed, peaceful expression, morning light falling softly, pillows or bedding visible behind',
    ],
  },
  {
    id: 'street',
    icon: '\uD83C\uDFD9\uFE0F',
    label: 'Street Style',
    description: 'Candid al aire libre, escenarios urbanos',
    shots: [
      'walking on sidewalk, friend taking the photo from a few steps away, looking back over shoulder with a smile, outfit on full display, city street blurred behind',
      'leaning against a wall on a sunny street, phone in hand checking something, one foot up, candid unposed moment, natural daylight',
      'sitting on cafe terrace steps, coffee cup beside, phone resting on knee, looking up at whoever is taking the photo, relaxed expression',
      'crossing a street mid-stride, caught candidly by a friend, sunglasses on head, shopping bag in hand, urban life, golden hour',
      'standing at a crosswalk waiting, phone in hand texting, candid street portrait from the side, city buildings behind, natural overcast light',
    ],
  },
  {
    id: 'creator',
    icon: '\u2728',
    label: 'Creador',
    description: 'Contenido de influencer, teléfono primero',
    shots: [
      'mirror selfie holding up a product next to face, excited genuine expression, bathroom or bedroom setting, phone visible capturing the moment, ring light subtle in background',
      'sitting at desk with laptop and coffee, phone propped up recording, looking at camera mid-sentence, natural workspace clutter, window light',
      'unboxing something on bed, items spread around, phone in one hand filming the reveal, excited expression, cozy bedroom setting',
      'outfit check mirror selfie, full body in bedroom mirror, phone at waist level, showing off the look, closet or hanging clothes visible behind',
      'filming a story walking through a store or market, phone held up in selfie mode, browsing shelves, candid behind-the-scenes moment',
    ],
  },
  {
    id: 'lifestyle',
    icon: '\uD83C\uDF3F',
    label: 'Lifestyle',
    description: 'Momentos del día a día, candid y acogedor',
    shots: [
      'sipping coffee on couch, phone on the cushion beside, both hands on mug, looking out window, blanket over legs, warm morning light',
      'walking through a park, friend took the photo, hands in jacket pockets, relaxed smile, dappled sunlight through trees, phone peeking from pocket',
      'curled up on couch scrolling phone, legs tucked under blanket, face lit by screen, cozy evening, lamp glow in background',
      'cooking in kitchen, stirring a pot, laughing at something on phone propped on counter, candid domestic joy, warm interior light',
      'stretching in front of bedroom mirror, arms raised, phone on bed behind, morning light pouring from window, just woke up vibe',
    ],
  },
  {
    id: 'fitness',
    icon: '\uD83D\uDCAA',
    label: 'Fitness',
    description: 'Selfies de espejo en el gym, candid entrenando',
    shots: [
      'gym mirror selfie in workout clothes, phone at waist level, subtle flex, gym equipment blurred behind, fluorescent gym lighting mixed with natural light',
      'post-workout mirror selfie, towel around neck, sweaty glow, phone held up, gym locker room or weight area behind, proud smile',
      'sitting on gym bench between sets, phone in hand taking a quick selfie, water bottle beside, focused determined expression',
      'yoga mat selfie, sitting in a stretch pose, phone on floor propped against water bottle, peaceful expression, studio or living room setting',
      'walking on treadmill or standing by equipment, candid gym mirror selfie, airpods in, workout playlist vibe, natural relaxed expression',
    ],
  },
  {
    id: 'nightout',
    icon: '\uD83C\uDF19',
    label: 'Noche',
    description: 'Saliendo, espejo del baño, vida nocturna',
    shots: [
      'bathroom mirror selfie before going out, dressed up, phone flash reflecting in mirror, makeup done, clutch in other hand, restaurant or club bathroom',
      'sitting at a bar or restaurant table, cocktail in hand, phone on table, warm ambient candlelight, glammed up, flirty smirk',
      'group bathroom mirror selfie energy but solo, phone up, dressed up outfit visible, club or restaurant restroom, flash on',
      'walking out of a building at night, caught by a friend, city lights behind, heels and outfit visible, phone in hand, candid laughter',
      'elevator mirror selfie going out, full outfit visible, phone at chest level, metallic elevator walls reflecting, dressed up evening look',
    ],
  },
  {
    id: 'fotodump',
    icon: '\uD83D\uDCF7',
    label: 'Foto Dump',
    description: 'Misma escena, diferentes ángulos/momentos',
    shots: [
      'same outfit same location, mirror selfie straight on, phone visible, casual expression, natural light, unfiltered vibe',
      'same outfit same location, slightly turned to the side, looking at phone screen instead of mirror, candid unposed moment',
      'same outfit same location, sitting or crouching down in front of the mirror, different angle, playful expression, phone at a lower angle',
      'same outfit same location, back turned to mirror looking over shoulder, phone capturing the back view, hair tossed to one side',
      'same outfit same location, close-up selfie face only, phone very close, silly expression or duck lips, slightly blurry, fun energy',
      'same outfit same location, walking away from mirror, caught mid-step, looking back with a smile, natural motion blur, candid last shot',
    ],
  },
  {
    id: 'datenight',
    icon: '\uD83C\uDF77',
    label: 'Cita',
    description: 'Cena romántica, selfies con velas',
    shots: [
      'restaurant bathroom mirror selfie before returning to the table, dressed up, phone flash, checking makeup one last time, slight smile',
      'sitting at restaurant table, candlelight on face, chin on hand, wine glass in front, phone on table, flirty eyes looking at camera, someone across the table took the photo',
      'close-up selfie with wine glass, warm amber restaurant lighting, soft smile, blurred restaurant interior behind',
      'walking out of restaurant at night, caught candidly by date, city lights behind, heels on wet pavement, turning back with a laugh',
      'sitting at restaurant window seat, side profile, pensive expression, city lights outside, candle glow on face, candid moment',
    ],
  },
  {
    id: 'pool',
    icon: '\uD83C\uDFCA',
    label: 'Piscina / Verano',
    description: 'Selfies en la piscina, vibra de verano',
    shots: [
      'pool selfie lounging on chair, sunglasses on forehead, phone held up, tropical drink on side table, sun-kissed golden light, lazy vacation energy',
      'sitting on pool edge with feet in water, phone in hand taking a selfie looking over shoulder, water splashing around feet, bright summer sun',
      'mirror selfie in hotel bathroom after pool, wet hair slicked back, towel wrapped, phone visible with waterproof case, steam on mirror',
      'lying on pool lounger, phone held above face blocking the sun, squinting playful expression, tropical resort background, bright midday light',
      'standing by pool railing or fence, golden hour light, phone selfie with water sparkling behind, relaxed vacation smile, sun-kissed skin',
    ],
  },
  {
    id: 'cozyhome',
    icon: '\uD83C\uDFE0',
    label: 'En Casa',
    description: 'Selfies en casa, cama, sofá, mañana',
    shots: [
      'just woke up selfie in bed, phone held above face, sleepy eyes, tangled white sheets, messy hair, soft morning light from window, pillow creases on cheek',
      'mirror selfie in oversized t-shirt, bedroom full-length mirror, messy bed visible behind, phone in hand, barefoot, lazy morning vibe',
      'couch selfie wrapped in blanket, phone held up, warm mug in other hand, TV remote on cushion, evening lamp glow, cozy relaxed expression',
      'bathroom mirror selfie brushing teeth, towel on head, half-awake squint, phone in one hand toothbrush in other, honest morning routine',
      'sitting by window reading, phone abandoned on the sill, friend or self-timer took the photo, afternoon golden light streaming in, legs curled up on window seat',
    ],
  },
];

/**
 * Round-robin mixer: interleaves shots from multiple selected presets
 * so that each vibe gets equal representation.
 *
 * Example: Selfies[S1,S2,S3] + Editorial[E1,E2,E3] with count=4
 * Result:  [S1, E1, S2, E2]
 */
export const mixShots = (
  selectedPresetIds: Set<string>,
  maxCount: number
): string[] => {
  const selected = PHOTO_SESSION_PRESETS.filter(p => selectedPresetIds.has(p.id));
  if (selected.length === 0) return [];

  const result: string[] = [];
  const maxLen = Math.max(...selected.map(p => p.shots.length));

  for (let i = 0; i < maxLen && result.length < maxCount; i++) {
    for (const preset of selected) {
      if (i < preset.shots.length && result.length < maxCount) {
        result.push(preset.shots[i]);
      }
    }
  }

  return result;
};
