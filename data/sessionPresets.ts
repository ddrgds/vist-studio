// data/sessionPresets.ts

export interface SessionPreset {
  id: string;
  icon: string;
  label: string;
  description: string;
  shots: string[];  // Short, action-oriented pose/angle directions for edit models
}

export const PHOTO_SESSION_PRESETS: SessionPreset[] = [
  {
    id: 'selfies',
    icon: '\uD83E\uDD33',
    label: 'Selfies',
    description: 'Close-up self-portrait, phone angles',
    shots: [
      'taking a selfie with arm extended, warm genuine smile, playful head tilt toward camera',
      'mirror selfie showing full outfit, phone at chest height, casual confident stance, relaxed vibe',
      'candid laughing selfie, eyes crinkled with joy, head thrown back slightly, carefree energy',
      'low-angle selfie looking up at camera, chin slightly raised, confident smirk, power pose',
      'puckered-lips selfie, peace sign near face, playful wink, fun flirty energy',
    ],
  },
  {
    id: 'grwm',
    icon: '\uD83D\uDC84',
    label: 'GRWM',
    description: 'Get Ready With Me, beauty close-ups',
    shots: [
      'applying lipstick in mirror, lips parted, focused concentration, beauty close-up',
      'blending eyeshadow with brush, eyes half-closed, one hand near temple, glam routine',
      'checking reflection, turning face side to side, admiring finished makeup, satisfied smile',
      'brushing hair to one side, head tilted, soft morning light on face, getting ready',
      'spritzing perfume on wrist, eyes closed, inhaling scent, luxurious pampering moment',
    ],
  },
  {
    id: 'stories',
    icon: '\uD83D\uDCF1',
    label: 'Stories',
    description: 'Vertical 9:16, casual talking-to-camera',
    shots: [
      'talking animatedly to camera, hands gesturing mid-sentence, expressive eyebrows, direct eye contact',
      'walking toward camera with confident stride, arms swinging naturally, urban backdrop, full body',
      'reacting with surprise, mouth open, hands on cheeks, exaggerated fun expression',
      'whispering a secret to camera, leaning in close, hand cupped near mouth, conspiratorial smile',
      'dancing casually to music, shoulders moving, relaxed groove, carefree happy energy',
    ],
  },
  {
    id: 'editorial',
    icon: '\uD83C\uDF9E\uFE0F',
    label: 'Editorial',
    description: 'High fashion, magazine quality',
    shots: [
      'striking a sharp angular pose, one hand on hip, chin lifted, fierce editorial gaze',
      'turning dramatically mid-step, coat or fabric flowing, caught in motion, fashion runway energy',
      'sitting cross-legged on floor, leaning forward with elbows on knees, intense stare, high fashion',
      'standing with arms crossed, power stance, legs apart, looking straight at camera with authority',
      'reclining on a surface, one arm draped overhead, languid elegance, editorial magazine spread',
    ],
  },
  {
    id: 'portrait',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Portrait',
    description: 'Classic studio portraits, 85mm bokeh',
    shots: [
      'soft three-quarter face turn, resting chin on hand, gentle thoughtful expression, warm light',
      'looking directly at camera, neutral serene expression, shoulders slightly angled, classic portrait',
      'glancing down with a faint smile, eyelashes catching light, intimate contemplative mood',
      'looking over bare shoulder toward camera, mysterious half-smile, soft backlit glow',
      'eyes closed, face tilted upward, peaceful expression, light falling softly across features',
    ],
  },
  {
    id: 'street',
    icon: '\uD83C\uDFD9\uFE0F',
    label: 'Street Style',
    description: 'Urban outdoor fashion, candid vibes',
    shots: [
      'walking mid-stride on sidewalk, looking to the side, outfit on full display, city energy',
      'leaning against brick wall, one foot up, arms crossed, cool unbothered expression',
      'hailing a taxi or waving, caught in action on busy street, candid movement, urban life',
      'sitting on steps, elbows on knees, looking up at camera, relaxed street portrait',
      'adjusting sunglasses while crossing street, mid-step, effortlessly cool, golden hour light',
    ],
  },
  {
    id: 'creator',
    icon: '\u2728',
    label: 'Creator',
    description: 'Influencer content, engaging energy',
    shots: [
      'pointing at camera excitedly, big smile, leaning slightly forward, engaging creator energy',
      'holding up a product near face, genuine excited expression, showing it off to audience',
      'sitting at desk with laptop, looking up at camera mid-thought, creative workspace vibes',
      'doing a thumbs-up with both hands, cheesy grin, approachable goofy energy, relatable',
      'filming behind-the-scenes, phone or camera in hand, candid working moment, hustle mode',
    ],
  },
  {
    id: 'lifestyle',
    icon: '\uD83C\uDF3F',
    label: 'Lifestyle',
    description: 'Everyday moments, warm natural light',
    shots: [
      'sipping coffee at a cafe, both hands on mug, looking out window, peaceful morning moment',
      'strolling through a park, hands in pockets, relaxed smile, dappled sunlight through trees',
      'curled up on couch reading a book, legs tucked under blanket, cozy warm interior light',
      'cooking in kitchen, stirring a pot, laughing at something off-camera, candid domestic joy',
      'stretching by an open window, arms raised, morning light pouring in, fresh start energy',
    ],
  },
  {
    id: 'fitness',
    icon: '\uD83D\uDCAA',
    label: 'Fitness',
    description: 'Athletic action shots, gym energy',
    shots: [
      'mid-rep lifting weights, muscles tensed, jaw clenched, intense focused determination',
      'flexing in gym mirror, proud confident smile, post-workout pump, sweat glistening',
      'mid-sprint with arms pumping, dynamic motion, powerful athletic stride, explosive energy',
      'holding a yoga pose, balanced and centered, calm focused breathing, serene strength',
      'toweling off after workout, catching breath, relaxed satisfied smile, post-exercise glow',
    ],
  },
  {
    id: 'nightout',
    icon: '\uD83C\uDF19',
    label: 'Night Out',
    description: 'Evening glamour, neon and nightlife',
    shots: [
      'dancing under neon lights, arms up, euphoric expression, colorful club glow on skin',
      'leaning on bar counter, cocktail in hand, flirty smirk over the glass, warm amber glow',
      'laughing with head back in a crowd, caught mid-moment, party energy, flash photography feel',
      'posing outside club entrance, confident stance, dressed up, neon sign glowing behind',
      'walking down wet street at night, heels clicking, city lights reflecting on pavement, glamorous exit',
    ],
  },
  {
    id: 'fotodump',
    icon: '\uD83D\uDCF7',
    label: 'Foto Dump',
    description: 'Candid mix, disposable camera feel',
    shots: [
      'caught mid-bite eating something messy, surprised expression, candid and unposed, funny moment',
      'blurry motion shot running or jumping, arms flailing, chaotic joyful energy, disposable camera vibe',
      'picking flowers or touching plants, not looking at camera, peaceful unaware moment',
      'making a silly face, tongue out or crossed eyes, playful goofy energy, unflattering on purpose',
      'walking away from camera, looking back over shoulder, spontaneous wave goodbye, warm light',
      'lying in grass looking up at sky, arms spread out, dreamy expression, lazy afternoon vibes',
    ],
  },
  {
    id: 'datenight',
    icon: '\uD83C\uDF77',
    label: 'Date Night',
    description: 'Romantic, candlelight, intimate',
    shots: [
      'leaning across restaurant table, chin on hand, flirty eyes, candlelight warming face',
      'swirling wine glass gently, soft smile, looking through the glass, intimate close-up',
      'walking hand-in-hand down city street at night, looking at partner, warm streetlight glow',
      'laughing at dinner table, throwing head back, genuine joy, romantic evening atmosphere',
      'gazing out restaurant window, side profile, pensive dreamy expression, soft ambient light',
    ],
  },
  {
    id: 'pool',
    icon: '\uD83C\uDFCA',
    label: 'Pool / Summer',
    description: 'Poolside, splash, golden wet skin',
    shots: [
      'lounging on poolside chair, sunglasses pushed up on forehead, lazy sun-kissed smile, golden light',
      'emerging from pool water, slicking wet hair back with both hands, water dripping, refreshed',
      'sitting on pool edge, feet splashing in water, looking over shoulder, playful summer energy',
      'sipping tropical drink by pool, sunhat on, relaxed vacation pose, vibrant warm colors',
      'floating on back in pool, eyes closed, arms spread, total relaxation, water reflecting sunlight',
    ],
  },
  {
    id: 'cozyhome',
    icon: '\uD83C\uDFE0',
    label: 'Cozy Home',
    description: 'Morning bed, couch, warm interior',
    shots: [
      'just waking up in bed, stretching arms overhead, sleepy smile, tangled sheets, soft morning light',
      'wrapped in blanket on couch, holding warm mug close, looking at camera, cozy evening glow',
      'baking in kitchen, flour on nose, laughing, messy apron, warm domestic chaos, candid joy',
      'brushing teeth at bathroom mirror, half-awake squint, towel on head, honest morning routine',
      'reading by window seat, legs curled up, lost in the book, afternoon golden light streaming in',
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
