# VIST Studio — Joi Aesthetic Evolution + Prompt Engineering

**Date:** 2026-03-13
**Scope:** CSS design system evolution, button/interaction polish, AI prompt engineering rewrite
**Reference:** Blade Runner 2049 / Joi — deep violet atmosphere, holographic presence, ethereal warmth

---

## 1. Aesthetic Evolution — "Deep Violet Joi"

### 1.1 Color Temperature Shift

The palette shifts from hot-pink-dominant to **violet-dominant with warm accents**. The mood moves from "neon nightclub" to "holographic being materializing from darkness."

#### CSS Variable Changes (index.css)

```css
/* Backgrounds — deeper, more purple */
--joi-bg-0: #06040e;          /* was #08070d */
--joi-bg-1: #0a0816;          /* was #0c0b14 */
--joi-bg-2: rgba(14,10,24,0.75);  /* was rgba(18,14,26,0.75) */
--joi-bg-3: rgba(22,16,34,0.60);  /* was rgba(26,20,38,0.60) */
--joi-bg-glass: rgba(16,12,28,0.60); /* was rgba(20,16,30,0.55) */

/* New violet primaries */
--joi-violet: #8b5cf6;
--joi-violet-deep: #6d28d9;
--joi-violet-glow: rgba(139,92,246,0.35);

/* Softened existing accents */
--joi-pink: #e879a8;           /* was #ff6b9d — softer, less neon */
--joi-lavender: #c4b5f0;       /* was #b8a0e8 — brighter */

/* New warm accent (human warmth contrast) */
--joi-warm: #d4a574;

/* Default glow color shifts to violet */
--joi-glow-color: var(--joi-violet);
```

### 1.2 Atmospheric Changes

#### `.joi-mesh` — Add violet center layer
Add a 5th radial gradient layer centered at 50% 50% — violet glow that creates the "face materializing" effect:
```css
radial-gradient(ellipse 40% 40% at 50% 40%, rgba(139,92,246,0.12) 0%, transparent 70%)
```

#### `.joi-glass` — Deeper frosted glass
- `backdrop-filter: blur(28px) saturate(1.4)` (was blur(24px) saturate(1.3))
- Border: `rgba(139,92,246,0.06)` (violet tint instead of pure white)
- Hover border: `rgba(139,92,246,0.15)`

#### `.joi-orb` — Violet spectrum
Shift orb colors toward purple/violet. Primary orb: `var(--joi-violet)`, secondary: `var(--joi-lavender)`, accent: `var(--joi-pink)`.

#### Film grain — More cinematic
Increase SVG noise overlay from 2% → 3% opacity.

#### New: Holographic scan lines
Subtle horizontal lines on `.joi-glass` surfaces:
```css
.joi-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(139,92,246,0.015) 2px,
    rgba(139,92,246,0.015) 4px
  );
  pointer-events: none;
  border-radius: inherit;
  z-index: 1;
}
```

### 1.3 Text & Glow Updates

#### `.joi-text-gradient` — Violet-shifted
```css
background: linear-gradient(135deg, var(--joi-violet), var(--joi-pink), var(--joi-lavender));
```

#### `.joi-glow` — Violet default
Text-shadow layers shift from pink to violet:
```css
text-shadow: 0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.2), 0 0 60px rgba(139,92,246,0.1);
```

#### `.plasma-glow` — Updated cycle
Box-shadow cycles: violet → pink → lavender (instead of coral → magenta → blue).

---

## 2. Buttons & Microinteractions

### 2.1 Button Hierarchy

#### `.joi-btn-solid` (Primary CTA)
```css
.joi-btn-solid {
  background: linear-gradient(135deg, var(--joi-violet) 0%, var(--joi-pink) 100%);
  box-shadow: 0 4px 20px var(--joi-violet-glow);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.joi-btn-solid:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 32px var(--joi-violet-glow);
}
.joi-btn-solid:active {
  transform: translateY(0) scale(0.97);
  box-shadow: 0 2px 8px var(--joi-violet-glow);
  transition-duration: 0.1s;
}
```

#### Click pulse ring (new)
```css
@keyframes pulse-ring-violet {
  0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
  100% { box-shadow: 0 0 0 20px rgba(139,92,246,0); }
}
.joi-btn-solid:active::after {
  animation: pulse-ring-violet 0.4s ease-out;
}
```

#### `.joi-btn-ghost` (Secondary)
```css
.joi-btn-ghost:hover {
  border-color: rgba(139,92,246,0.25);
  background: rgba(139,92,246,0.06);
}
.joi-btn-ghost:active {
  background: rgba(139,92,246,0.12);
  transition-duration: 0.1s;
}
```

#### Generate button breathing effect
```css
.btn-generate {
  animation: pulse-soft 2.5s ease-in-out infinite;
}
.btn-generate:hover {
  animation: none;
  /* intensified static glow on hover */
}
.btn-generate.generating {
  animation: shimmer 1.5s linear infinite;
}
```

### 2.2 Chip/Option Selection

```css
/* Unselected hover — violet tint */
.chip:hover {
  background: rgba(139,92,246,0.06);
  border-color: rgba(139,92,246,0.15);
}

/* Selected — violet accent + left edge glow */
.chip.selected {
  background: rgba(139,92,246,0.10);
  border-color: rgba(139,92,246,0.25);
  box-shadow: inset 2px 0 0 var(--joi-violet), 0 0 16px rgba(139,92,246,0.08);
}

/* Easing — organic feel */
.chip {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
```

### 2.3 Gallery Card Hover

```css
.gallery-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.12);
}
.gallery-card:hover img {
  filter: brightness(1.05);
  transition: filter 0.3s ease;
}
```

### 2.4 Accordion Polish (Director)

- Expand: Header gets violet bottom-border glow (`box-shadow: 0 2px 12px rgba(139,92,246,0.15)`)
- Chevron: Overshoot rotation easing `cubic-bezier(0.34, 1.56, 0.64, 1)`

### 2.5 Page Transitions

```css
/* Hologram materializing effect */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(2px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## 3. AI Prompt Engineering — Professional Art Direction

### 3.1 Design Principles

1. **Specificity over vagueness** — Name cameras, lenses, film stocks, lighting gear
2. **Three-layer structure** — Technical setup + mood/atmosphere + post-processing
3. **Engine-optimized** — Format prompts according to each engine's best practices
4. **Progressive detail** — Core prompt is solid alone; enhancers add layers

### 3.2 Director — Render Style Rewrites

#### Photorealistic
```
Photorealistic portrait photography, shot on Sony A7RV with Zeiss Otus 85mm f/1.4 wide open,
natural skin texture with visible pores and subsurface scattering, Kodak Portra 400 color science,
micro-contrast in fabric textures, accurate eye reflections with catchlights,
shallow depth of field with creamy circular bokeh, subtle film halation on highlights
```

#### Anime/Manga
```
High-end anime illustration in the style of studio Trigger and Makoto Shinkai,
cel-shaded rendering with precise linework, volumetric rim lighting on hair and shoulders,
chromatic aberration on specular highlights, saturated color palette with complementary accent pops,
detailed eye reflections with multi-layer iris, dynamic composition with cinematic 2.35:1 crop,
subtle paper texture grain overlay
```

#### 3D Render
```
Cinematic 3D character render, Octane Render / Unreal Engine 5 quality,
subsurface scattering skin shader with pore-level displacement mapping,
strand-based hair simulation with anisotropic specular, HDRI studio lighting with area soft boxes,
8K PBR texture maps, photogrammetry-quality mesh topology,
ray-traced global illumination with soft contact shadows, subtle depth of field at f/2.8 equivalent
```

#### Illustration
```
Premium digital painting in the style of Artgerm, Ilya Kuvshinov, and Ross Tran,
visible brushwork texture suggesting Procreate or Photoshop, soft ambient occlusion on forms,
hand-painted specular highlights with color variation, muted background with selective detail focus,
sophisticated color harmony with warm/cool temperature shifts across the form,
atmospheric perspective on background elements, painterly light bloom on bright areas
```

#### Stylized
```
High-fashion editorial illustration, elongated elegant proportions,
bold graphic shadow shapes with sharp edges, limited sophisticated palette with strategic accent color pops,
Vogue / Harper's Bazaar cover composition, strong silhouette design,
mixed media texture elements (watercolor washes + vector precision),
dramatic negative space usage, typographic-quality framing
```

### 3.3 Director — Camera Presets (6 existing + 2 new)

#### Portrait 85mm
```
Shot on Canon RF 85mm f/1.2L at f/1.4, medium close-up bust framing at eye level,
creamy circular bokeh with smooth falloff, compressed perspective flattering facial features,
shallow depth of field isolating subject from background, natural skin-tone rendering
```

#### Wide 24mm
```
Shot on Sony 24mm f/1.4 GM, full-body environmental framing,
slight wide-angle perspective with depth emphasis, subject placed using rule of thirds,
deep depth of field showing environment context, leading lines toward subject,
barrel distortion adding dynamic energy to composition
```

#### Macro
```
Shot on Canon RF 100mm f/2.8L Macro, extreme close-up detail shot,
razor-thin depth of field at f/2.8, emphasis on texture and micro-detail,
visible skin texture, fabric weave, jewelry facets, hair strands individually resolved,
soft diffused studio lighting to minimize harsh shadows on close surfaces
```

#### Cinema
```
Shot on Arri Alexa Mini LF with Cooke Anamorphic /i 50mm T2.3,
2.39:1 anamorphic widescreen aspect ratio, oval bokeh with horizontal flare streaks,
warm highlight rolloff characteristic of Cooke glass, cinematic color grading with lifted blacks,
subtle lens breathing on focus pull, filmic halation on practicals and highlights
```

#### Polaroid
```
Shot on Polaroid SX-70 with 116mm f/8 lens, instant film aesthetic,
slightly washed-out colors with warm orange shift, soft corner vignette,
characteristic Polaroid color cast (cyan shadows, warm highlights),
slightly soft focus with dreamy quality, white frame border crop,
subtle light leak artifacts on edges
```

#### Vintage 35mm
```
Shot on Nikon FM2 with Nikkor 50mm f/1.4 AI-S, Fuji Superia 400 film stock,
organic analog grain structure, warm color palette with golden skin tones,
slight color fringing on high-contrast edges, natural vignette from vintage optics,
mechanical shutter motion characteristics, authentic analog highlight rolloff
```

#### NEW: Drone Overhead
```
Shot on DJI Mavic 3 Hasselblad camera, 24mm equivalent f/2.8,
top-down 45-degree aerial perspective, environmental scale showing subject in context,
deep depth of field with crisp detail throughout, geometric composition from above,
dramatic shadow casting revealing time of day, miniature effect on background elements
```

#### NEW: Anamorphic Cinema
```
Shot on Panavision Millennium DXL2 with C-Series Anamorphic 75mm T2.3,
2x anamorphic squeeze with characteristic oval bokeh, horizontal blue lens flares,
extreme widescreen 2.76:1 aspect ratio, filmic highlight blooming,
warm skin rendition with cool shadow separation, shallow depth creating layered depth planes,
cinema-quality motion blur suggestion, IMAX-grade resolution detail
```

### 3.4 Director — Lighting Presets (6 rewritten + 2 new)

#### Natural
```
Natural window light from camera-left at 90 degrees, soft diffused quality through sheer curtains,
warm 5600K color temperature, gentle fill from white wall bounce on shadow side,
natural highlight-to-shadow ratio of 3:1, soft shadow edges with gradual falloff,
subtle ambient light wrapping around form
```

#### Studio
```
Professional three-point studio setup: Profoto B10 key light through 4ft octabox at 45 degrees camera-left,
V-flat white bounce fill at 2:1 ratio, hair light with 10-degree grid from above-behind,
clean 5500K neutral white balance, precise specular control on skin,
sharp but not harsh shadow definition, professional beauty lighting with catchlights at 10 o'clock
```

#### Golden Hour
```
Golden hour sunlight at 15 minutes before sunset, warm 3200K color temperature,
long directional shadows at 15-degree elevation angle, Fresnel rim highlights on hair and shoulders,
atmospheric haze diffusion softening light quality, warm fill bounce from ground surface,
shadow areas shift toward complementary cool blue, lens flare from backlit position
```

#### Neon
```
Mixed neon lighting from urban environment: magenta neon key from left,
cyan LED accent from right creating bi-color split, warm sodium vapor practicals in background,
color spill on skin mixing warm and cool zones, wet surface reflections multiplying light sources,
high-contrast pools of colored light with deep shadow pockets between,
volumetric atmosphere catching light beams
```

#### Dramatic
```
Single hard key light from 60 degrees camera-left and 30 degrees above, Chiaroscuro lighting pattern,
deep shadows on 70% of face, razor-sharp shadow edge on nose bridge,
minimal fill allowing pure black shadows, Rembrandt triangle on shadow-side cheek,
theatrical intensity with 8:1 contrast ratio, single specular highlight in eyes,
background falls to complete darkness
```

#### Dark
```
Ultra-low-key lighting, single small practical light source at close range,
majority of frame in deep shadow with selective illumination on key features,
tungsten warm glow at 2800K on lit areas, absolute black in shadow zones,
skin luminosity emerging from darkness, hint of cool ambient fill at 1% power,
atmospheric noir mood with mystery and tension
```

#### NEW: Blade Runner Neon
```
Cyberpunk night lighting: mixed sodium vapor street lamps (amber) with LED advertising (cyan/magenta),
volumetric fog catching colored light beams, wet asphalt reflecting neon signs as elongated streaks,
rain drops catching light as bright points, deep teal shadows under overhangs,
backlit silhouette with neon rim light, anamorphic flare from bright practicals,
purple-violet atmospheric haze at mid-distance
```

#### NEW: Holographic
```
Ethereal violet-purple key light emanating from subject as if self-luminous,
soft holographic glow creating rim light on all edges simultaneously,
purple-lavender color cast on nearby surfaces, lens flare with violet tint,
skin appears to emit subtle light from within (subsurface scattering pushed to maximum),
cool blue-violet ambient atmosphere, no traditional shadow — light wraps around form,
digital projection quality with subtle scanline artifacts
```

### 3.5 Director — Enhancers (all 12 rewritten)

| Enhancer | New Prompt Snippet |
|----------|-------------------|
| Glossy Skin | `luminous dewy skin with micro-specular highlights, light catching moisture on cheekbones and cupid's bow, makeup-artist-quality skin prep with highlighting balm, visible pore texture under the sheen` |
| Film Grain | `Kodak Vision3 500T grain structure at native ISO, organic silver halide grain clusters, subtle halation bloom on blown highlights, slight color crossover in deep shadows shifting toward teal-cyan, analog warmth in midtones` |
| 3D Rendered | `Unreal Engine 5 Nanite-quality geometry, Lumen global illumination with ray-traced reflections, PBR material response on all surfaces, subsurface scattering on skin and translucent materials, strand-based hair with accurate light transmission` |
| Cinematic Grade | `Hollywood-grade DI color grading, teal-and-orange complementary palette, crushed blacks with lifted shadow detail, desaturated midtones with punchy highlights, FilmConvert Nitrate texture layer, 2.39:1 letterbox composition` |
| Sharp Textures | `Micro-contrast enhancement revealing fabric weave, skin pores, hair strand definition, textile pattern fidelity, 8K-resolution texture detail throughout, clarity-boosted without haloing, tactile surface quality inviting touch` |
| Rim Light | `Dedicated backlight creating bright edge separation on hair and shoulders, 1-stop overexposed rim with natural falloff, light wrapping around form edges, slight flare bloom where rim meets lens axis, halo effect separating subject from background` |
| Soft Glow | `Pro-Mist 1/4 filter effect creating dreamy highlight diffusion, blooming light sources, romantic soft-focus quality while maintaining core sharpness, warm ethereal atmosphere, gentle contrast reduction in highlights, skin-smoothing optical diffusion` |
| High Contrast | `Aggressive contrast curve with deep true blacks and bright clean whites, dramatic tonal separation, minimal midtone transition, graphic poster-quality light and shadow, punchy saturated color in lit areas against pure dark shadows` |
| Vivid Colors | `Fujifilm Velvia 50 color saturation, hyper-vivid color rendering pushing natural tones 30% beyond reality, rich jewel-tone shadows, electric highlight colors, maximum color separation between adjacent hues, saturated without fluorescent artificiality` |
| Shallow DOF | `Shot at f/1.2 maximum aperture, ultra-thin focal plane on eyes only, everything beyond 15cm from focal plane dissolves into creamy bokeh, foreground elements blur softly framing subject, distinct bokeh circles from background lights, smooth focus gradient` |
| Golden Hour | `Magic hour warmth bathing scene in amber-gold light, long shadows stretching across ground, warm rim light on hair creating golden halo, sky gradient from peach horizon to deep blue zenith, nostalgic film-quality color temperature, lens flare from low sun angle` |
| Wet Look | `Rain-soaked aesthetic with water droplets on skin and clothing, wet hair clinging with defined strands, glistening surface reflections on all materials, water beads catching light as bright specular points, wet fabric becoming translucent and form-revealing, puddle reflections on ground surface` |

### 3.6 Photo Session — Vibe Rewrites (5 shots each)

#### Selfies (rewritten)
1. `Smartphone selfie at arm's length, 24mm wide-angle with subtle barrel distortion, ring light catchlights as circular reflections in eyes, soft skin smoothing from front-facing camera processing, Instagram-ready 4:5 crop, natural expression mid-smile`
2. `Eye-level selfie with phone at face height, flat perspective minimizing lens distortion, soft natural window light from left, relaxed genuine expression, sharp focus on eyes with slight background blur from portrait mode, warm color temperature`
3. `Full-body mirror selfie in well-lit space, phone at chest height, flash creating bright specular on mirror surface, reflection showing full outfit and environment, casual authentic pose, visible phone in hand`
4. `Low-angle selfie shot from below chin level, 24mm looking upward, dramatic perspective making jaw and neck prominent, sky or ceiling as background, confident power pose energy, strong jawline definition`
5. `Candid mid-laugh selfie, motion blur on hair suggesting movement, genuine joy with crinkled eyes and open mouth, slightly off-center framing, warm natural lighting, authentic unposed energy captured in motion`

#### GRWM (rewritten)
1. `Beauty close-up with LED ring light creating perfect circular catchlights, macro-quality skin detail, visible makeup texture and product on skin, bathroom mirror environment, warm 4000K lighting, content-creator setup visible in frame`
2. `Extreme macro detail shot of eye area, individual lash definition, iris color and texture visible, eyeshadow blend quality and pigment, professional ring light reflection in pupil, skin texture at microscopic level`
3. `Extreme macro detail of lips, lip product texture and finish visible (gloss sheen or matte powder), cupid's bow definition, natural lip texture underneath product, soft studio lighting, beauty-campaign-quality framing`
4. `Getting-ready candid shot in bathroom/vanity, products scattered on counter, one hand applying product, mirror reflection showing concentration face, warm tungsten vanity bulb lighting, lifestyle documentary style`
5. `Vanity mirror shot showing full beauty setup, ring light visible in mirror edge, products laid out professionally, subject checking final look, selfie-through-mirror composition, warm ambient glowing atmosphere`

#### Stories (9:16 rewritten)
1. `Vertical 9:16 bust shot simulating talking to camera, direct eye contact engagement, shoulders-up framing, soft front lighting, bokeh background at f/2.8, mid-sentence expression with animated gestures, influencer story aesthetic`
2. `Vertical 9:16 full-body walking toward camera, low angle from hip height, confident stride with natural arm swing, urban background with motion blur, dynamic energy, outfit fully visible from shoes up`
3. `Vertical 9:16 genuine mid-laugh reaction, head tilted back slightly, eyes crinkled with joy, candid unposed energy, natural lighting, warm color grade, authentic moment captured, hair in motion`
4. `Vertical 9:16 three-quarter angle medium shot, hands gesturing expressively mid-explanation, passionate body language, soft background blur, ring light or window light, content creator energy`
5. `Vertical 9:16 looking away then glancing back toward camera, over-shoulder angle, mysterious allure, hair falling across face partially, backlit with rim light, shallow depth of field, editorial quality in vertical format`

#### Editorial (rewritten)
1. `High-fashion editorial three-quarter angle, magazine cover quality, precise studio lighting with beauty dish key, sharp eyes with intent gaze, sculptural pose with angular body lines, retouched-quality skin, Vogue-caliber composition`
2. `Pure side profile shot at exact 90-degree angle, silhouette-quality edge definition, single dramatic key light from front creating rim on nose and lips, clean negative space, strong jaw and neck line, architectural pose quality`
3. `Wide environmental editorial full-body shot, model dwarfed by dramatic location, fashion-forward pose with geometric body angles, deep depth of field showing full environment, high-end fashion campaign style, magazine double-spread composition`
4. `Low-angle editorial shot from below eye level looking upward, power stance with wide shoulders, imposing perspective, dramatic sky or architecture as background, strong silhouette outline, editorial authority and confidence`
5. `High-contrast frontal portrait, dramatic single light creating bold shadows, piercing direct eye contact, symmetrical composition, strong graphic quality, editorial minimalism, fashion portrait with attitude`

#### Portrait (rewritten)
1. `Classic bust portrait on 85mm f/1.4 with smooth circular bokeh, Rembrandt or loop lighting pattern, neutral expression with subtle inner life, clean studio background falling to gradient, professional headshot quality with artistic soul`
2. `Three-quarter face turn with Rembrandt lighting triangle on shadow-side cheek, warm key light through softbox, dark moody background, painterly quality suggesting Vermeer or Caravaggio, dramatic yet intimate`
3. `Extreme close-up of eyes only, sharp catch-light detail with lighting reflection visible, iris color and texture at macro level, brow and lash definition, skin texture honest and detailed, emotional depth through eyes alone`
4. `Back three-quarter view looking over shoulder toward camera, mysterious and alluring, backlit with warm rim light on shoulder and hair, face partially in shadow, dramatic noir quality, depth and intrigue`
5. `Side profile silhouette against gradient background, rim light defining every facial contour, clean edge from forehead to chin, elegant neck line, dramatic minimal composition, fine-art portrait quality`

#### Street Style (rewritten)
1. `Full-body street fashion shot with 70-200mm compression, mid-stride capturing natural movement, urban background compressed into bokeh, outfit as hero element, golden hour street lighting, fashion week sidewalk energy`
2. `Low three-quarter angle from hip height, wide-angle 35mm, urban canyon perspective with buildings framing subject, confident stance, street-level authority, converging architectural lines leading to subject`
3. `Side profile leaning against textured wall, shallow depth of field throwing wall texture out of focus, casual cool pose, one foot up on wall, environmental portrait with urban texture, available light`
4. `Wide establishing shot with rule-of-thirds placement, urban environment as co-star, subject small but commanding in frame, architectural context telling location story, deep depth of field, documentary style`
5. `Close-up candid street portrait, documentary style, natural unposed expression, available light creating authentic mood, slight motion blur suggesting real life, film grain texture, raw authentic energy`

#### Creator (rewritten)
1. `Content creator talking to camera setup, confident expressive delivery, professional LED panel lighting, visible microphone or camera rig suggesting studio, direct engagement eye contact, warm approachable energy, YouTube thumbnail composition`
2. `Product showcase pose holding item at chest height toward camera, clean background, soft even lighting highlighting both face and product, commercial quality, brand-partnership aesthetic, genuine enthusiasm expression`
3. `Genuine reaction shot mid-laugh, relatable authentic moment, slightly over-exposed highlight bloom suggesting candid capture, warm color grade, lifestyle content quality, audience-connection moment`
4. `Aspirational upward gaze with soft dramatic lighting, dreaming/thinking expression, creative person aesthetic, bokeh background with warm tones, editorial-meets-lifestyle quality, inspirational content energy`
5. `Over-the-shoulder content shot from behind, showing what subject sees (screen/view/scene), hair and shoulder in soft focus foreground, behind-the-scenes authentic moment, creator lifestyle documentation`

### 3.7 Photo Session — 3 New Vibes

#### Cinematic (NEW)
1. `Anamorphic widescreen 2.39:1 movie still, character entering frame from left, dramatic volumetric lighting with visible atmosphere, teal-orange color grading, lens flare from practical light source, narrative tension in pose and framing`
2. `Over-the-shoulder two-shot composition (empty second position), cinematic 2.39:1 crop, shallow focus on subject with foreground bokeh, warm key light, film noir shadow patterns, mid-conversation expression`
3. `Wide establishing shot with subject small in grand environment, epic scale composition, dramatic sky or architecture, cinematic color grade with crushed blacks, movie poster framing, lone figure narrative`
4. `Extreme close-up cinematic insert, eyes only filling widescreen frame, catch-light revealing dramatic lighting, intense emotional moment, shallow depth with eyelash detail, film grain and subtle lens aberration`
5. `Walking-away shot from behind, long corridor or street perspective, vanishing point composition, backlit creating full silhouette, mysterious narrative moment, smoke or fog atmosphere, Blade Runner mood`

#### Night Out (NEW)
1. `Club entrance shot with neon signage creating colored rim light, confident pose in going-out outfit, wet sidewalk reflections multiplying lights, warm skin under cool neon, nightlife energy, smartphone flash aesthetic`
2. `Dance floor moment with mixed colored LED lighting, motion blur on periphery suggesting movement, sharp focus on face, sweat glistening under lights, euphoric expression, strobe-frozen instant`
3. `Bar-side portrait with warm amber back-bar lighting, cocktail glass creating bokeh in foreground, intimate low-light atmosphere, ISO noise grain adding authenticity, candid social moment, available light portrait`
4. `Flash photography straight-on in dark environment, harsh direct flash creating blown highlights on face and flat shadows behind, party snapshot aesthetic, red-eye possibility, authentic nightlife documentation`
5. `Leaving the club shot, 3am street lighting, slightly disheveled authentic energy, taxi/uber glow from side, mixed sodium and LED street light, candid tired-happy expression, urban night atmosphere with light trails`

#### Fitness (NEW)
1. `Mid-workout action freeze at peak exertion, sweat visible on skin catching gym fluorescent light, determined focused expression, gym equipment in background, dynamic athletic pose, high shutter speed frozen motion`
2. `Gym mirror selfie showing physique, overhead fluorescent creating top-down lighting, pump-enhanced muscle definition, workout outfit, phone visible in hand, authentic fitness-influencer content format`
3. `Post-workout portrait with dewy sweating skin, slightly out of breath expression, warm glowing complexion, gym towel as prop, natural exhaustion beauty, harsh gym lighting softened by skin moisture`
4. `Athletic action shot mid-jump or sprint, motion blur on limbs with sharp torso, outdoor or gym environment, dynamic diagonal composition, peak athleticism captured, sports photography energy`
5. `Yoga or stretching pose in serene setting, elongated body line, morning light flooding through windows, calm focused expression, body-as-sculpture aesthetic, wellness lifestyle quality, warm golden tones`

### 3.8 Upload Character — Render Style Rewrites

#### Photorealistic
```
Ultra-photorealistic digital human, indistinguishable from a real photograph.
Shot on Phase One IQ4 150MP with Schneider Kreuznach 110mm f/2.8,
natural skin with visible pores, fine vellus hair, subsurface blood flow coloring,
accurate eye moisture and sclera detail, individual hair strand rendering,
physically-based material response on clothing and accessories,
studio photography quality with natural imperfections that sell realism.
```

#### Anime/Manga
```
Premium anime character design, Production I.G / studio Bones quality.
Clean precise linework with variable stroke weight, cel-shaded coloring with
sophisticated shadow gradients beyond simple 2-tone, luminous eye design with
multi-layered iris reflections, stylized anatomical proportions (large expressive eyes,
refined features), dynamic hair with individual strand groups,
detailed costume design with anime-specific fabric rendering.
```

#### 3D Render
```
AAA game-quality 3D character render, Unreal Engine 5 / Marmoset Toolbag quality.
High-poly sculpted mesh with clean topology, PBR material workflow on all surfaces,
subsurface scattering skin shader with hand-painted detail maps,
strand-based groomed hair with physics simulation quality,
HDRI environment lighting with ray-traced ambient occlusion,
cinematic depth of field with physically accurate bokeh.
```

#### Illustration
```
High-end digital character illustration, concept art portfolio quality.
Painterly technique blending precise linework with expressive color blocking,
sophisticated light study with warm/cool temperature shifts across form,
character design clarity with strong silhouette readability,
rich texture variation suggesting mixed media (digital paint + traditional feel),
art book or character sheet presentation quality.
```

#### Stylized
```
Distinctive stylized character with exaggerated design language.
Strong graphic silhouette with memorable proportions, bold shape language
defining personality, limited palette with strategic accent colors,
fashion illustration meets character design,
poster-quality composition with negative space awareness,
immediately recognizable character identity in a single frame.
```

#### Pixel Art
```
Premium pixel art character sprite, 64x64 to 128x128 base resolution.
Carefully placed individual pixels with intentional color choice,
limited 32-color palette with strategic dithering for gradient effects,
sub-pixel animation-ready design, clear silhouette at small scale,
retro game aesthetic with modern color sophistication,
inspired by Superbrothers / Hyper Light Drifter visual quality.
```

### 3.9 AI Editor — Relight Presets (all 10 rewritten)

| Preset | New Prompt |
|--------|-----------|
| Golden Hour | `Golden hour at 15 minutes before sunset, warm 3200K color temperature, long shadows at 15° elevation, Fresnel rim highlights on hair and shoulders, atmospheric haze diffusion, warm fill from ground bounce, shadow areas shift toward cool blue` |
| Blue Hour | `Civil twilight blue hour, cool 7500K ambient color, no direct sun, diffused omnidirectional quality, deep blue sky reflecting on all upward surfaces, artificial warm lights becoming prominent practicals, moody contemplative atmosphere` |
| Studio | `Professional beauty dish key light 45° camera-left, white V-flat fill, 5500K neutral, hair light from above-behind with 10° grid, clean specular control, 3:1 lighting ratio, catchlights at 10 o'clock position` |
| Neon Coral | `Neon sign illumination in warm coral #f06848, hard colored light from left creating vivid color cast on skin, deep complementary teal shadows, wet surface reflections, urban night atmosphere, single dominant color source` |
| Dramatic | `Single hard key light at 60° camera-left, Chiaroscuro lighting, 8:1 contrast ratio, minimal fill allowing true black shadows, Rembrandt triangle on shadow cheek, theatrical intensity, background drops to pure black` |
| Moonlight | `Full moonlight simulation at 4100K with slight blue-silver cast, very soft diffused quality, low intensity requiring elevated exposure, gentle shadows with no hard edges, nocturnal atmosphere, cool blue-silver tone on all surfaces` |
| Sunset | `Late sunset with warm amber-gold directional light at 10° elevation, extreme warm color cast 2800K, long dramatic shadows, sky gradient visible from peach to violet, rim light creating golden halo on hair and shoulders, nostalgic warmth` |
| Cool White | `Overcast daylight at 6500K, perfectly diffused shadowless illumination, neutral color rendering, even exposure across entire subject, clinical clean quality, fashion lookbook even lighting, no mood — pure accurate color` |
| Ring Light | `LED ring light directly on camera axis creating signature circular catchlights in both eyes, flat front-fill with minimal shadow, beauty-influencer aesthetic, even illumination on face, slight falloff on body, warm 4500K tone` |
| Rembrandt | `Classic Rembrandt lighting pattern, key light 45° high creating illuminated triangle on shadow-side cheek below eye, nose shadow connecting to cheek shadow, dramatic painterly quality, warm key with cool fill, 4:1 ratio` |

### 3.10 AI Editor — Style Transfer (all 8 rewritten)

| Style | New Prompt |
|-------|-----------|
| Anime | `Transform into high-quality anime illustration style: clean cel-shaded coloring, precise linework with variable weight, large expressive eyes with detailed iris reflections, stylized proportions, vibrant saturated palette, studio Trigger quality` |
| Oil Painting | `Transform into classical oil painting: visible impasto brushwork with texture, Renaissance color mixing with glazing layers, warm Rembrandt-quality lighting, canvas texture visible underneath paint, rich deep shadows with burnt umber and raw sienna undertones` |
| Watercolor | `Transform into delicate watercolor painting: transparent wash layers building form, wet-on-wet bleeding effects on edges, white paper showing through as highlights, granulation texture in pigment settling, soft color blooms, controlled dripping at edges` |
| Pop Art | `Transform into bold Pop Art style: flat graphic colors with Ben-Day dot patterns, strong black outlines, Warhol/Lichtenstein aesthetic, limited palette of 4-6 saturated colors, halftone screening effect, comic-book drama, high contrast graphic impact` |
| Sketch | `Transform into detailed pencil sketch: graphite on textured paper, varied line weight from light construction to dark contour, cross-hatching for shadow values, visible guide lines and construction, white highlights where paper shows, figure drawing quality` |
| Pixel Art | `Transform into pixel art: reduce to visible pixel grid at 128px scale, limited 32-color palette with intentional dithering, each pixel hand-placed quality, clean readable silhouette, retro game aesthetic with modern color sophistication, anti-aliasing only where needed` |
| Vintage Film | `Transform into vintage 1970s film photography: Kodachrome color science with saturated reds and warm skin, heavy organic grain, slight color fading on edges, warm amber color cast, soft focus from vintage optics, light leak artifacts, analog chemical processing character` |
| Cyberpunk | `Transform into cyberpunk digital art: neon-lit futuristic aesthetic, holographic UI elements overlaying skin, circuit-board pattern textures, teal and magenta color split lighting, chrome and glass material accents, digital glitch artifacts, rain-streaked noir atmosphere, Blade Runner 2049 palette` |

### 3.11 Context7 Engine-Specific Optimization

Check latest documentation for prompt format best practices:

- **Gemini Imagen** — structured prompts, aspect ratio parameters, safety settings
- **FLUX (via FAL)** — prompt weighting syntax, LoRA triggers, negative prompts
- **GPT Image (DALL-E)** — natural language vs. technical prompt balance, style parameters
- **Grok Imagine** — generation parameters, prompt structure
- **Replicate models** — per-model prompt syntax differences

Each engine's prompts should be formatted according to its specific documentation rather than using a one-size-fits-all approach.

---

## 4. Files to Modify

### CSS (index.css)
- Color variables (§1.1)
- `.joi-mesh` gradient layers (§1.2)
- `.joi-glass` properties (§1.2)
- `.joi-orb` colors (§1.2)
- Film grain opacity (§1.2)
- New scan lines pseudo-element (§1.2)
- `.joi-text-gradient` (§1.3)
- `.joi-glow` text-shadow (§1.3)
- `.plasma-glow` cycle (§1.3)
- All button classes (§2.1)
- New `pulse-ring-violet` keyframe (§2.1)
- Chip styles (§2.2)
- Gallery card hover (§2.3)
- Page transitions (§2.5)

### Pages
- `Director.tsx` — Render styles, camera, lighting, enhancers, new presets (§3.2–3.5)
- `PhotoSession.tsx` — All 7 vibes rewritten + 3 new vibes (§3.6–3.7)
- `UploadCharacter.tsx` — Render styles, skin textures (§3.8)
- `AIEditor.tsx` — Relight presets, style transfer prompts (§3.9–3.10)

### Interaction Polish (in respective pages)
- Generate buttons: breathing effect + loading state
- Accordion: violet glow + chevron easing
- Gallery cards: lift + glow hover
- Page transitions: blur materializing effect

---

## 5. Out of Scope

- No new pages or routing changes
- No backend/API changes
- No Supabase/auth changes
- No new npm dependencies
- No Sidebar structural changes
- No data model changes
