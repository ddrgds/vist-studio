// data/sessionPresets.ts

export interface SessionPreset {
  id: string;
  icon: string;
  label: string;
  description: string;
  shots: string[];  // Pre-written shot descriptions with specific camera/composition
}

export const PHOTO_SESSION_PRESETS: SessionPreset[] = [
  {
    id: 'selfies',
    icon: '\uD83E\uDD33',
    label: 'Selfies',
    description: 'Close-up self-portrait, phone angles',
    shots: [
      'selfie angle, camera held slightly above eye level at arm\'s length, front-facing, natural warm smile, tight crop on face and upper shoulders',
      'eye-level selfie, camera at exact face height, playful expression, slight head tilt to one side, close crop',
      'mirror selfie, full body visible in reflection, arm extended toward camera, outfit showcase, confident casual stance',
      'low selfie angle, camera just below chin level, subject looking down into lens with a confident smirk, dramatic angle',
      'candid selfie, caught mid-laugh, slightly off-center framing, authentic and unposed',
    ],
  },
  {
    id: 'grwm',
    icon: '\uD83D\uDC84',
    label: 'GRWM',
    description: 'Get Ready With Me, beauty close-ups',
    shots: [
      'beauty close-up, extreme close on face, soft front lighting, looking directly into lens, skin texture and makeup detail fully visible, ring-light catch lights',
      'macro detail on eyes, upper face tightly cropped, eyeshadow blend and lash detail sharp, side-lit for texture',
      'macro detail on lips, extreme close-up, lip color and product texture clearly visible, slight 3/4 angle',
      'getting-ready candid, 3/4 angle slightly above, hand near hair or face mid-gesture, warm vanity or window light',
      'mirror shot, full face visible in vanity mirror, bedroom or bathroom context, backstage getting-ready atmosphere',
    ],
  },
  {
    id: 'stories',
    icon: '\uD83D\uDCF1',
    label: 'Stories',
    description: 'Vertical 9:16, casual talking-to-camera',
    shots: [
      'vertical 9:16 crop, bust shot, front-facing, talking-to-camera pose, expressive and direct, casual conversational energy',
      'vertical 9:16 crop, full body walking toward camera, dynamic movement, urban or indoor setting, candid lifestyle',
      'vertical, close crop face and shoulders, genuine mid-laugh, eyes crinkled, authentic caught-in-the-moment joy',
      'vertical, 3/4 angle, hands gesturing mid-sentence, storytelling energy, expressive body language',
      'vertical, looking away from camera then glancing back, over-the-shoulder candid, relaxed off-guard vibe',
    ],
  },
  {
    id: 'editorial',
    icon: '\uD83C\uDF9E\uFE0F',
    label: 'Editorial',
    description: 'High fashion, magazine quality',
    shots: [
      '3/4 angle, medium shot, chin slightly down, eyes slightly up, looking left of camera, magazine editorial quality, cinematic color',
      'side profile, 90-degree lateral view, full body, clean architectural negative space, elegant and sculptural composition',
      'wide environmental shot, full body, subject placed at rule-of-thirds left, rich storytelling background',
      'low angle, shooting upward, dynamic power stance, dramatic sky or ceiling context, high-fashion energy',
      'high contrast front portrait, 85mm, direct unwavering gaze, minimal background, stark editorial look',
    ],
  },
  {
    id: 'portrait',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Portrait',
    description: 'Classic studio portraits, 85mm bokeh',
    shots: [
      'classic bust portrait, 85mm f/1.4, eye-level, direct warm gaze, creamy bokeh, timeless studio quality',
      '3/4 face turn, looking into middle distance past camera, contemplative mood, soft Rembrandt side lighting',
      'intimate extreme close-up, eyes filling most of frame, eyelashes and iris detail crisp, rest softly blurred',
      'back 3/4, head turned over left shoulder toward camera, nape of neck and jawline visible, mysterious and elegant',
      'profile silhouette, 90-degree side, jaw and neck line sculpted by hard side light, graphic and architectural',
    ],
  },
  {
    id: 'street',
    icon: '\uD83C\uDFD9\uFE0F',
    label: 'Street Style',
    description: 'Urban outdoor fashion, candid vibes',
    shots: [
      'full body candid, mid-stride walking, shot from 15ft with 85mm compression, city architecture blurred background',
      'low 3/4 angle, shooting from hip height, dynamic street energy, shallow depth of field, urban attitude',
      'side profile, leaning against brick wall or doorway, cross-armed or hands in pockets, cool effortless style',
      'wide establishing, subject small in frame at rule-of-thirds, rich urban environment and city life surrounding',
      'close-up candid, looking away from camera, natural unposed expression, street light quality, documentary feel',
    ],
  },
  {
    id: 'creator',
    icon: '\u2728',
    label: 'Creator',
    description: 'Influencer content, engaging energy',
    shots: [
      'front-facing talking, confident expressive pose, slightly above eye level, engaging direct eye contact, creator energy',
      'holding phone or product, looking at it then glancing at camera, lifestyle influencer framing, natural light',
      'genuine mid-laugh, 3/4 angle, eyes crinkled, teeth showing, authentic and relatable, candid joy',
      'looking upward and slightly right, slight smile, thinking-dreaming expression, aspirational creative mood',
      'back-of-shoulder looking back, candid documentary feel, subject unaware then noticing camera, intimate behind-the-scenes',
    ],
  },
  {
    id: 'lifestyle',
    icon: '\uD83C\uDF3F',
    label: 'Lifestyle',
    description: 'Everyday moments, warm natural light',
    shots: [
      'sitting at cafe table, 3/4 angle, hands wrapped around coffee cup, warm window light, cozy intimate atmosphere',
      'walking through park or tree-lined street, candid wide, natural dappled sunlight, relaxed everyday energy',
      'at home, sitting cross-legged on floor or couch, casual relaxed pose, soft interior light, comfortable and personal',
      'looking at phone or book, side angle, absorbed in moment, candid and unposed, lifestyle storytelling',
      'standing by window, side-lit by natural daylight, looking outside pensively, serene and peaceful mood',
    ],
  },
  {
    id: 'fitness',
    icon: '\uD83D\uDCAA',
    label: 'Fitness',
    description: 'Athletic action shots, gym energy',
    shots: [
      'action pose mid-movement, dynamic athletic stance, side angle, powerful and energetic, gym or outdoor setting',
      'low angle looking up, strong confident power stance, arms crossed or hands on hips, athletic authority',
      'stretching pose, full body side profile, flexibility and form on display, clean gym background',
      'post-workout candid, slightly above eye level, hands on hips, catching breath, authentic athletic grit',
      'close-up determination face, intense focus expression, sweat detail, athletic close crop on face and neck',
    ],
  },
  {
    id: 'nightout',
    icon: '\uD83C\uDF19',
    label: 'Night Out',
    description: 'Evening glamour, neon and nightlife',
    shots: [
      'soft glow front portrait, warm candlelight or bar lighting, relaxed confident expression, night atmosphere bokeh',
      'full body wide, dressed up, urban night backdrop, city lights blurred behind, elegant nightlife energy',
      'over-shoulder looking back, neon or ambient light rim, party energy, blurred movement in background',
      '3/4 angle close-medium shot, golden bar light, raised glass or drink, social celebratory mood',
      'side profile, dramatic nightclub or rooftop light, architectural silhouette, mysterious and cinematic',
    ],
  },
  {
    id: 'fotodump',
    icon: '\uD83D\uDCF7',
    label: 'Foto Dump',
    description: 'Candid mix, disposable camera feel',
    shots: [
      'ultra candid, slightly tilted frame, subject caught mid-movement, motion blur on edges, film grain texture, disposable camera aesthetic, raw and unfiltered',
      'extreme close-up detail \u2014 hands, shoes, jewelry, food, or object \u2014 macro, off-center composition, spontaneous and intimate',
      'wide shot, subject very small at edge of frame, environment dominates, documentary snapshot quality, slice-of-life moment',
      'selfie from exaggerated angle \u2014 too close, tilted, or from below \u2014 unfiltered casual expression, wide grin or deadpan face, authentic',
      'over-shoulder walking-away, subject in motion or looking back, spontaneous escape energy, candid street feel',
      'slightly soft-focus portrait, analog film grain, warm or faded color cast, vintage disposable camera feel, imperfect and nostalgic',
    ],
  },
  {
    id: 'datenight',
    icon: '\uD83C\uDF77',
    label: 'Date Night',
    description: 'Romantic, candlelight, intimate',
    shots: [
      'candlelight portrait, warm amber glow on face, soft shadows, intimate restaurant setting, romantic mood',
      'close-up over wine glass, slight smile, eyes reflecting candlelight, shallow depth of field, elegant',
      'full body walking arm-in-arm on city sidewalk at night, streetlights behind, romantic stroll atmosphere',
      '3/4 angle seated at table, leaning forward slightly, engaged and charming expression, date energy',
      'looking away pensively, side profile, ambient restaurant lighting, contemplative and beautiful, stolen moment',
    ],
  },
  {
    id: 'pool',
    icon: '\uD83C\uDFCA',
    label: 'Pool / Summer',
    description: 'Poolside, splash, golden wet skin',
    shots: [
      'poolside lounging, full body on sunbed, sunglasses, golden sunlight, relaxed summer luxury',
      'emerging from water, wet hair slicked back, water droplets on skin, bright natural light, refreshing splash',
      'sitting on pool edge, feet in water, looking over shoulder at camera, backlit by sun, summer glow',
      'cocktail in hand by the pool, 3/4 angle, sunhat, tropical vibes, vibrant colors, vacation energy',
      'underwater-feel close-up, face and shoulders, wet glistening skin, turquoise water reflections, ethereal summer',
    ],
  },
  {
    id: 'cozyhome',
    icon: '\uD83C\uDFE0',
    label: 'Cozy Home',
    description: 'Morning bed, couch, warm interior',
    shots: [
      'morning in bed, tangled in white sheets, soft window light, just waking up, peaceful and natural',
      'couch with blanket, legs tucked up, holding mug, warm interior tones, reading or watching, comfortable',
      'kitchen cooking, candid side angle, natural movement, warm overhead light, domestic and charming',
      'bathroom mirror, getting ready, half-dressed, authentic morning routine, steam and soft light',
      'reading nook by window, curled up with book, afternoon light, serene and focused, cozy corner',
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
