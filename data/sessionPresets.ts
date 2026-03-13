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
      'smartphone selfie at arm\'s length, 24mm wide-angle with subtle barrel distortion, ring light catchlights as circular reflections in eyes, natural skin texture, Instagram-ready 4:5 crop, natural warm smile',
      'eye-level selfie with phone at face height, flat perspective minimizing distortion, soft natural window light from left, relaxed genuine expression, portrait mode background blur, warm color temperature',
      'full-body mirror selfie in well-lit space, phone at chest height, flash creating specular on mirror, reflection showing full outfit and environment, casual authentic pose, visible phone in hand',
      'low-angle selfie from below chin level, 24mm looking upward, dramatic perspective emphasizing jaw and neck, sky or ceiling background, confident power energy, strong jawline definition',
      'candid mid-laugh selfie, motion blur on hair suggesting movement, genuine joy with crinkled eyes, slightly off-center framing, warm natural lighting, authentic unposed energy',
    ],
  },
  {
    id: 'grwm',
    icon: '\uD83D\uDC84',
    label: 'GRWM',
    description: 'Get Ready With Me, beauty close-ups',
    shots: [
      'beauty close-up with LED ring light creating circular catchlights, macro-quality skin detail, visible makeup texture on skin, bathroom vanity environment, warm 4000K lighting, content-creator setup',
      'extreme macro detail of eye area, individual lash definition, iris texture visible, eyeshadow blend and pigment, ring light reflection in pupil, skin texture at microscopic level',
      'extreme macro detail of lips, lip product texture and finish visible, cupid\'s bow definition, natural lip texture underneath product, soft studio lighting, beauty-campaign framing',
      'getting-ready candid in bathroom vanity, products on counter, one hand applying product, mirror reflection showing concentration, warm tungsten vanity bulb lighting, documentary style',
      'vanity mirror shot showing full beauty setup, ring light in mirror edge, products laid out, subject checking final look, selfie-through-mirror composition, warm ambient glow',
    ],
  },
  {
    id: 'stories',
    icon: '\uD83D\uDCF1',
    label: 'Stories',
    description: 'Vertical 9:16, casual talking-to-camera',
    shots: [
      'vertical 9:16 bust shot talking to camera, direct eye contact, shoulders-up framing, soft front lighting, bokeh background at f/2.8, mid-sentence animated expression, influencer story aesthetic',
      'vertical 9:16 full-body walking toward camera, low angle from hip height, confident stride with natural arm swing, urban background with motion blur, dynamic energy, full outfit visible',
      'vertical 9:16 genuine mid-laugh reaction, head tilted back slightly, eyes crinkled with joy, unposed energy, natural lighting, warm color grade, authentic moment, hair in motion',
      'vertical 9:16 three-quarter medium shot, hands gesturing expressively mid-explanation, passionate body language, soft background blur, ring light or window light, creator energy',
      'vertical 9:16 looking away then glancing back toward camera, over-shoulder angle, mysterious allure, hair falling across face, backlit with rim light, shallow depth of field, editorial vertical',
    ],
  },
  {
    id: 'editorial',
    icon: '\uD83C\uDF9E\uFE0F',
    label: 'Editorial',
    description: 'High fashion, magazine quality',
    shots: [
      'high-fashion editorial three-quarter angle, magazine cover quality, beauty dish key light, sharp eyes with intent gaze, sculptural pose with angular body lines, Vogue-caliber composition',
      'pure side profile at exact 90-degree angle, silhouette-quality edge definition, single dramatic key light from front on nose and lips, clean negative space, architectural pose',
      'wide environmental editorial full-body, model in dramatic location, fashion-forward pose with geometric angles, deep depth of field, fashion campaign style, magazine double-spread composition',
      'low-angle editorial from below eye level looking upward, power stance with wide shoulders, dramatic sky or architecture background, strong silhouette outline, authority and confidence',
      'high-contrast frontal portrait, dramatic single light creating bold shadows, piercing direct eye contact, symmetrical composition, editorial minimalism, fashion portrait with attitude',
    ],
  },
  {
    id: 'portrait',
    icon: '\uD83D\uDDBC\uFE0F',
    label: 'Portrait',
    description: 'Classic studio portraits, 85mm bokeh',
    shots: [
      'classic bust portrait on 85mm f/1.4 with smooth circular bokeh, Rembrandt or loop lighting, neutral expression with subtle inner life, clean studio background gradient, professional artistry',
      'three-quarter face turn with Rembrandt lighting triangle on shadow-side cheek, warm key through softbox, dark moody background, painterly quality suggesting Vermeer, dramatic yet intimate',
      'extreme close-up of eyes only, sharp catch-light detail with lighting reflection, iris color and texture at macro level, brow and lash definition, emotional depth through eyes alone',
      'back three-quarter view looking over shoulder toward camera, mysterious and alluring, backlit warm rim on shoulder and hair, face partially in shadow, noir quality, intrigue',
      'side profile silhouette against gradient background, rim light defining every facial contour, clean edge from forehead to chin, elegant neck line, fine-art portrait quality',
    ],
  },
  {
    id: 'street',
    icon: '\uD83C\uDFD9\uFE0F',
    label: 'Street Style',
    description: 'Urban outdoor fashion, candid vibes',
    shots: [
      'full-body street fashion on 70-200mm compression, mid-stride natural movement, urban background compressed into bokeh, outfit as hero element, golden hour lighting, fashion week energy',
      'low three-quarter angle from hip height, 35mm wide-angle, urban canyon with buildings framing subject, confident stance, converging architectural lines leading to subject',
      'side profile leaning against textured wall, shallow depth throwing wall out of focus, casual cool pose, one foot up, environmental portrait with urban texture, available light',
      'wide establishing shot with rule-of-thirds placement, urban environment as co-star, subject commanding but small in frame, deep depth of field, documentary style',
      'close-up candid street portrait, documentary style, natural unposed expression, available light creating authentic mood, slight motion blur, film grain texture, raw energy',
    ],
  },
  {
    id: 'creator',
    icon: '\u2728',
    label: 'Creator',
    description: 'Influencer content, engaging energy',
    shots: [
      'content creator talking to camera, confident expressive delivery, professional LED panel lighting, visible mic or camera rig, direct engagement eye contact, warm approachable energy, YouTube thumbnail composition',
      'product showcase holding item at chest height toward camera, clean background, soft even lighting on face and product, commercial quality, brand-partnership aesthetic, genuine enthusiasm',
      'genuine reaction mid-laugh, relatable authentic moment, slightly over-exposed bloom suggesting candid capture, warm color grade, lifestyle content quality, audience-connection energy',
      'aspirational upward gaze with soft dramatic lighting, dreaming-thinking expression, creative person aesthetic, bokeh background warm tones, editorial-meets-lifestyle, inspirational content',
      'over-the-shoulder content shot from behind, showing subject\'s view, hair and shoulder in soft foreground, behind-the-scenes moment, creator lifestyle documentation',
    ],
  },
  {
    id: 'lifestyle',
    icon: '\uD83C\uDF3F',
    label: 'Lifestyle',
    description: 'Everyday moments, warm natural light',
    shots: [
      'sitting at cafe table three-quarter angle, hands wrapped around coffee cup, warm window light casting soft directional glow, cozy intimate atmosphere, lifestyle storytelling',
      'walking through tree-lined street, candid wide with natural dappled sunlight filtering through leaves, relaxed everyday energy, warm green-gold color palette',
      'at home cross-legged on couch, casual relaxed pose with soft interior light, comfortable personal space, warm tungsten ambient, authentic domestic moment',
      'looking at phone or book, side angle absorbed in moment, candid unposed energy, available window light creating gentle contrast, lifestyle documentary style',
      'standing by window side-lit by natural daylight, looking outside pensively, serene peaceful mood, dramatic light-and-shadow on face, contemplative portrait',
    ],
  },
  {
    id: 'fitness',
    icon: '\uD83D\uDCAA',
    label: 'Fitness',
    description: 'Athletic action shots, gym energy',
    shots: [
      'mid-workout action freeze at peak exertion, sweat catching gym light, determined focused expression, equipment in background, dynamic athletic pose, high shutter speed frozen motion',
      'gym mirror selfie showing physique, overhead fluorescent top-down lighting, pump-enhanced definition, workout outfit, phone in hand, authentic fitness-influencer format',
      'post-workout portrait with dewy sweating skin, slightly out of breath, warm glowing complexion, gym towel as prop, natural exhaustion beauty, harsh gym lighting softened by moisture',
      'athletic action mid-jump or sprint, motion blur on limbs with sharp torso, outdoor or gym, dynamic diagonal composition, peak athleticism, sports photography energy',
      'yoga or stretching pose in serene setting, elongated body line, morning light through windows, calm focused expression, body-as-sculpture aesthetic, warm golden tones',
    ],
  },
  {
    id: 'nightout',
    icon: '\uD83C\uDF19',
    label: 'Night Out',
    description: 'Evening glamour, neon and nightlife',
    shots: [
      'club entrance with neon signage creating colored rim light, confident going-out pose, wet sidewalk reflections multiplying lights, warm skin under cool neon, nightlife energy',
      'dance floor with mixed colored LED lighting, motion blur on periphery, sharp face focus, sweat glistening under strobes, euphoric expression, strobe-frozen instant',
      'bar-side portrait with warm amber back-bar lighting, cocktail glass creating foreground bokeh, intimate low-light atmosphere, ISO grain adding authenticity, social moment',
      'flash photography straight-on in dark environment, harsh direct flash creating flat shadows behind, party snapshot aesthetic, authentic nightlife documentation',
      'leaving the club 3am street lighting, slightly disheveled authentic energy, taxi glow from side, mixed sodium and LED street light, tired-happy expression, light trails background',
    ],
  },
  {
    id: 'fotodump',
    icon: '\uD83D\uDCF7',
    label: 'Foto Dump',
    description: 'Candid mix, disposable camera feel',
    shots: [
      'ultra candid slightly tilted frame, caught mid-movement, motion blur on edges, film grain texture, disposable camera aesthetic, raw unfiltered, warm color cast from cheap flash',
      'extreme close-up detail \u2014 hands shoes jewelry or food \u2014 macro off-center composition, spontaneous intimate, shallow depth of field, natural light',
      'wide shot subject small at edge of frame, environment dominates, documentary snapshot quality, slice-of-life moment, deep depth of field, casual composition',
      'selfie from exaggerated angle too close or from below, unfiltered casual expression, wide grin or deadpan, authentic, wide-angle distortion, unflattering but charming',
      'over-shoulder walking-away shot, spontaneous escape energy, candid street feel, slight motion blur, warm afternoon light, nostalgic',
      'soft-focus portrait with analog film grain, warm or faded color cast, vintage disposable camera feel, imperfect and nostalgic, light leak on edge',
    ],
  },
  {
    id: 'datenight',
    icon: '\uD83C\uDF77',
    label: 'Date Night',
    description: 'Romantic, candlelight, intimate',
    shots: [
      'candlelight portrait with warm amber glow on face, soft flickering shadows, intimate restaurant setting with bokeh candles behind, romantic mood, shallow depth of field',
      'close-up over wine glass edge, slight smile, eyes reflecting candlelight catchlights, shallow depth isolating face from restaurant blur, elegant, warm tones',
      'full body walking arm-in-arm on city sidewalk at night, streetlights creating bokeh orbs behind, romantic stroll, warm from nearby storefronts, cinematic couple moment',
      'three-quarter seated at table leaning forward slightly, engaged charming expression, warm restaurant ambient, wine and plates in foreground bokeh, date energy',
      'looking away pensively side profile, ambient restaurant lighting creating soft contour, contemplative and beautiful, stolen moment, warm intimate atmosphere',
    ],
  },
  {
    id: 'pool',
    icon: '\uD83C\uDFCA',
    label: 'Pool / Summer',
    description: 'Poolside, splash, golden wet skin',
    shots: [
      'poolside lounging full body on sunbed, sunglasses, golden direct sunlight creating defined shadows, relaxed summer luxury, saturated warm colors, vacation editorial',
      'emerging from water with wet hair slicked back, water droplets catching sunlight on skin as bright specular points, bright natural light, refreshing splash energy',
      'sitting on pool edge feet in turquoise water, looking over shoulder at camera, backlit by afternoon sun creating golden rim, summer glow, water reflections on face',
      'cocktail in hand by pool three-quarter angle, sunhat, tropical resort vibes, vibrant saturated colors, vacation influencer energy, warm golden light',
      'face and shoulders close-up with wet glistening skin, turquoise water color reflections dancing on face, ethereal summer beauty, bright backlit, water bokeh',
    ],
  },
  {
    id: 'cozyhome',
    icon: '\uD83C\uDFE0',
    label: 'Cozy Home',
    description: 'Morning bed, couch, warm interior',
    shots: [
      'morning in bed tangled in white sheets, soft diffused window light, just waking up expression, peaceful and natural, warm golden morning tones, intimate bedroom atmosphere',
      'couch with blanket legs tucked up holding mug, warm interior tones from table lamp, reading or watching, comfortable domestic, soft side lighting, cozy evening',
      'kitchen cooking candid side angle, natural movement at counter, warm overhead pendant light, domestic charm, steam or flour in air catching light, lifestyle documentary',
      'bathroom mirror getting ready, half-dressed authentic morning routine, steam softening the air, warm vanity lighting, honest intimate moment, reflection composition',
      'reading nook by window curled up with book, afternoon golden light streaming in, serene focused expression, cozy corner with pillows and blankets, peaceful solitude',
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
