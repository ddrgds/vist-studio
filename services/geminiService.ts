
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { InfluencerParams, PoseModificationParams, VideoParams, GeminiImageModel, BatchOutfitItem, IMAGEN4_MODELS, AIEditParams } from "../types";

import { proxyUrl } from './apiAuth';

// In dev, proxyUrl returns relative path — needs origin prefix.
// In prod, proxyUrl returns full Worker URL — use as-is.
const GEMINI_BASE = import.meta.env.PROD
  ? proxyUrl('gemini', '')
  : `${window.location.origin}/gemini-api`;

// API key is injected server-side by the proxy (Vite in dev, Cloudflare Worker in prod).
// We pass a placeholder apiKey (the SDK requires a non-empty string)
// and route all requests through the proxy via httpOptions.baseUrl.
const createGeminiClient = () =>
  new GoogleGenAI({ apiKey: 'PROXIED', httpOptions: { baseUrl: GEMINI_BASE } });

// ─────────────────────────────────────────────
// Relaxed Safety Settings (maximum allowed
// without special approval from Google)
// ─────────────────────────────────────────────
const relaxedSafetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// ─────────────────────────────────────────────
// Maximum Safety Settings (BLOCK_NONE) for
// Nano Banana 2 (gemini-3.1-flash-image-preview)
// which supports safetyFilterLevel: 6
// ─────────────────────────────────────────────
const zeroSafetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fileToPart = async (file: File) => {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Determines if an error is a transient network error (503, 429, etc.)
 * that warrants an automatic retry.
 */
const isRetryableError = (err: unknown): boolean => {
  if (!err) return false;
  const errStr = String(err);
  // Detects HTTP 503 (UNAVAILABLE) and 429 (RESOURCE_EXHAUSTED / Rate Limit)
  return (
    errStr.includes('503') ||
    errStr.includes('UNAVAILABLE') ||
    errStr.includes('429') ||
    errStr.includes('RESOURCE_EXHAUSTED') ||
    errStr.includes('quota') ||
    errStr.includes('rate limit') ||
    errStr.includes('overloaded')
  );
};

/**
 * Exponential Backoff: retries an async function up to maxRetries times.
 * Waits 2^attempt * baseDelayMs between attempts (e.g.: 1s, 2s, 4s, 8s).
 */
const withExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 4,
  baseDelayMs = 1000
): Promise<T> => {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries) break;

      if (!isRetryableError(err)) {
        // Not a transient error; propagate immediately
        throw err;
      }

      const delayMs = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `⏳ Transient error (attempt ${attempt + 1}/${maxRetries + 1}). ` +
        `Retrying in ${delayMs / 1000}s...`,
        err
      );
      await wait(delayMs);
    }
  }
  throw lastErr;
};

/**
 * Limits concurrent promise execution to `concurrency` at a time.
 * Remaining promises are queued and run as slots become available.
 */
const runWithConcurrencyLimit = async <T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> => {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  const worker = async () => {
    while (index < tasks.length) {
      const currentIndex = index++;
      results[currentIndex] = await tasks[currentIndex]();
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
};

/**
 * Replaces terms that commonly trigger safety filters
 * with more neutral but equally descriptive equivalents.
 */
const sanitizePromptForRetry = (text: string): string => {
  return text
    // Only genuinely problematic terms — do not touch editorial fashion vocabulary
    .replace(/\b(seductive|provocative)\b/gi, 'confident and stylish')
    .replace(/\b(skimpy|barely there)\b/gi, 'fashionable')
    .replace(/\b(erotic|explicit)\b/gi, 'artistic')
    .replace(/\b(naked|nude)\b/gi, 'fine art nude photography style')
    .replace(/\b(sexual)\b/gi, 'romantic');
  // Terms we do NOT sanitize: sexy, hot, sensual, sultry, revealing, lingerie, intimate
};

/**
 * Wrapper sobre generateContent que:
 * 1. Uses relaxed safetySettings.
 * 2. Implementa Exponential Backoff para errores 503/429.
 * 3. Si recibe un SAFETY block, sanitiza el prompt y reintenta.
 * 4. If the primary model fails with a transient error exhausting retries,
 *    falls back to the Flash model.
 */
const generateWithFallback = async (
  ai: GoogleGenAI,
  model: string,
  parts: any[],
  imageConfig: { imageSize?: string; aspectRatio?: string }
) => {
  // Nano Banana 2 supports numeric safetyFilterLevel (0–6) and BLOCK_NONE
  const isNB2 = model === GeminiImageModel.Flash2;
  const config: any = {
    safetySettings: isNB2 ? zeroSafetySettings : relaxedSafetySettings,
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: isNB2 ? { ...imageConfig, safetyFilterLevel: 6 } : imageConfig,
  };

  // Internal function that makes ONE call to the specified model
  const callModel = (modelName: string, currentParts: any[]) =>
    withExponentialBackoff(() =>
      ai.models.generateContent({
        model: modelName,
        contents: { parts: currentParts },
        config,
      })
    );

  let response: any;

  try {
    response = await callModel(model, parts);
  } catch (err) {
    // If the primary model exhausts all retries (persistent 503/429),
    // try with the Flash model (more available and faster)
    const fallbackModel = GeminiImageModel.Flash2;
    if (isRetryableError(err) && model !== fallbackModel) {
      console.warn(
        `🔄 Primary model "${model}" unavailable after retries. ` +
        `Falling back to "${fallbackModel}"...`
      );
      response = await callModel(fallbackModel, parts);
    } else {
      throw err;
    }
  }

  const candidate = response.candidates?.[0];

  // Prompt-level block — API returns empty candidates + promptFeedback.blockReason
  if (!response.candidates || response.candidates.length === 0) {
    const blockReason = response.promptFeedback?.blockReason;
    console.warn("⚠️ Prompt-level block. promptFeedback:", JSON.stringify(response.promptFeedback));
    if (blockReason) {
      throw new Error(`Request blocked (${blockReason}). Try a different model or adjust the content.`);
    }
    // No candidates and no blockReason — unexpected response, treat as transient error
    console.warn("⚠️ Response without candidates or blockReason:", JSON.stringify(response));
    throw new Error(`UNAVAILABLE: empty response from model "${model}". Retrying...`);
  }

  if (candidate?.finishReason === 'SAFETY') {
    console.warn("⚠️ Safety block detected — retrying with sanitized prompt...");

    const sanitizedParts = parts.map(p =>
      p.text ? { text: sanitizePromptForRetry(p.text) } : p
    );

    const retryResponse = await withExponentialBackoff(() =>
      ai.models.generateContent({
        model,
        contents: { parts: sanitizedParts },
        config,
      })
    );

    return retryResponse;
  }

  return response;
};

// ─────────────────────────────────────────────
// Enhance Prompt
// ─────────────────────────────────────────────
export const enhancePrompt = async (text: string, category: string): Promise<string> => {
  if (!text.trim()) return "";

  const ai = createGeminiClient();

  try {
    const response = await withExponentialBackoff(() =>
      ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert prompt engineer for high-end fashion editorial and virtual influencer photography (Vogue, Harper's Bazaar, W Magazine level). Your prompts follow 2026 best practices: subject first, then context, then style and emotional vibe.

Prompt structure: [Subject/identity anchors] → [outfit & fabric details] → [pose & body language] → [setting/background] → [lighting style & direction] → [camera/lens specs] → [art style & emotional mood].

Rewrite the following raw input into a highly detailed, photorealistic description for the category: "${category}".

Rules:
- Be visually rich and technically precise (e.g., "shot on 85mm f/1.4, shallow depth of field, golden hour bokeh")
- For OUTFIT: specify fabric textures, fit, color, designer aesthetic
- For LIGHTING: use evocative, specific cues — "golden hour warmth", "dramatic side lighting", "soft north-facing window diffusion", "moody low-key chiaroscuro", "bright airy high-key studio", "neon city backlight". Include color temperature when relevant (e.g., "warm 3200K", "daylight 5600K")
- For SCENARIO: describe depth, architectural details, atmospheric mood, emotional resonance
- For POSE: describe joint angles, weight distribution, gaze direction, emotional energy
- For APPEARANCE: include specific identity markers (eye color, bone structure, skin tone, hair texture) — not vague descriptors
- Keep output under 80 words. Output only the enhanced prompt — no filler, no explanations.
- Match input language (Spanish → Spanish, English → English).

Raw Input: "${text}"`,
        config: {
          safetySettings: relaxedSafetySettings,
        },
      })
    );

    return response.text?.trim() || text;
  } catch (error) {
    console.error("Error enhancing prompt:", error);
    return text;
  }
};

// ─────────────────────────────────────────────
// Generate Influencer Image
// ─────────────────────────────────────────────
export const generateInfluencerImage = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const ai = createGeminiClient();
  if (abortSignal?.aborted) throw new Error("Cancelled by user.");

  if (onProgress) onProgress(10);

  const parts: any[] = [];
  let characterDescriptions = '';

  // Filter out empty characters — only include those with actual content
  const activeCharacters = params.characters.filter(c =>
    (c.modelImages && c.modelImages.length > 0) ||
    c.characteristics?.trim() ||
    c.outfitDescription?.trim() ||
    (c.outfitImages && c.outfitImages.length > 0) ||
    c.poseImage ||
    c.pose?.trim() ||
    c.accessory?.trim()
  );
  // Always have at least 1 character (use first even if empty for the prompt)
  const effectiveCharacters = activeCharacters.length > 0 ? activeCharacters : [params.characters[0]];

  for (const [index, character] of effectiveCharacters.entries()) {
    const charNum = index + 1;

    // 1. Model Reference Images
    if (character.modelImages && character.modelImages.length > 0) {
      for (const file of character.modelImages) {
        parts.push(await fileToPart(file));
      }
      parts.push({ text: `[CHARACTER ${charNum} — FACE/IDENTITY REFERENCE ONLY] Use EXCLUSIVELY for face: bone structure, eye shape, skin tone, nose, lips, hair. ⚠️ COMPLETELY IGNORE any clothing, outfit, or accessories visible in this image — they are irrelevant and must NOT appear in the output.` });
    }

    // 2. Outfit Reference Images
    let outfitFiles: File[] = character.outfitImages || [];
    if (character.usePoseAsOutfit && character.poseImage) {
      outfitFiles = [...outfitFiles, character.poseImage];
    }
    if (outfitFiles.length > 0) {
      for (const file of outfitFiles) {
        parts.push(await fileToPart(file));
      }
      parts.push({ text: `[CHARACTER ${charNum} — OUTFIT REFERENCE — MANDATORY] This is the ONLY clothing the character must wear. Reproduce EVERY garment detail exactly: fabric, color, pattern, cut, fit, stitching. The character's face photo outfit is to be completely discarded and replaced with THIS outfit.` });
    }

    // 3. Pose Reference Image
    if (character.poseImage && !character.usePoseAsOutfit) {
      parts.push(await fileToPart(character.poseImage));
      parts.push({ text: `[CHARACTER ${charNum} — POSE REFERENCE] Copy body position and skeletal structure ONLY. Do NOT copy the face, skin tone, hair, or outfit from this image.` });
    }

    // 4. Accessory Reference Images
    if (character.accessoryImages && character.accessoryImages.length > 0) {
      for (const file of character.accessoryImages) {
        parts.push(await fileToPart(file));
      }
      parts.push({ text: `[CHARACTER ${charNum} — ACCESSORY/OBJECT REFERENCE] Reproduce this object exactly as shown.` });
    }

    const hasOutfitRef = outfitFiles.length > 0;
    const hasOutfitDesc = !!character.outfitDescription;

    characterDescriptions += `
[CHARACTER ${charNum}]
- Face: Use [CHARACTER ${charNum} — FACE/IDENTITY REFERENCE] exclusively. ${character.characteristics ? `Additional traits: ${character.characteristics}.` : ''}
- Outfit: ${hasOutfitRef ? `[CHARACTER ${charNum} — OUTFIT REFERENCE] — reproduce exactly, replace face-photo clothing entirely.${hasOutfitDesc ? ` Additional details: ${character.outfitDescription}.` : ''}` : hasOutfitDesc ? character.outfitDescription : 'Stylish outfit matching character aesthetic.'}
- Pose: ${character.poseImage && !character.usePoseAsOutfit ? `Match [CHARACTER ${charNum} — POSE REFERENCE] body position.` : ''}${character.pose ? ` ${character.pose}.` : ''}${!character.poseImage && !character.pose ? 'Natural confident stance.' : ''}
- Accessories: ${character.accessoryImages && character.accessoryImages.length > 0 ? `[CHARACTER ${charNum} — ACCESSORY/OBJECT REFERENCE].` : ''}${character.accessory ? ` ${character.accessory}.` : ''}
`;
  }

  // SHARED-SCENE Reference Images
  if (params.scenarioImage && params.scenarioImage.length > 0) {
    for (const file of params.scenarioImage) {
      parts.push(await fileToPart(file));
    }
    parts.push({ text: "[SCENARIO REFERENCE] Use ONLY for background environment: location, architecture, colors, atmosphere, lighting mood. ⚠️ COMPLETELY IGNORE any people, characters, or faces visible in this image — they are NOT character references and must NOT influence the characters generated." });
  }

  // ── Gemini/NB2/NB Pro style directive (research-backed 2026):
  // Gemini is highly sensitive to detail order: motif first, then context and style.
  // 2026 trend: "emotional vibe-coding" — define emotional resonance, not just technical specs.
  const styleDirective = params.imageBoost
    ? params.imageBoost
    : 'ultra-photorealistic fashion editorial photograph — emotionally resonant, cinematic presence, Sony A7R V camera, 85mm f/1.4 portrait lens, shallow DOF with natural bokeh, RAW, 4K, Vogue / Harper\'s Bazaar quality';

  // TECHNICAL QUALITY adapts to the rendering style requested
  const technicalQuality = params.imageBoost
    ? `Render quality consistent with the style directive above. Sharp focus on faces, precise fabric detail, no AI artifacts.`
    : `Sharp focus on faces, natural skin texture (pores, subtle imperfections), realistic hair strands, fabric microdetail, no AI artifacts, no plastic skin, no over-smoothing.`;

  // ── JSON-structured prompt for NB2/NB Pro (research-backed 2026):
  // Gemini processes JSON blocks as distinct semantic units — fields don't bleed into each other.
  // Technique from community: "extract visual DNA as JSON → feed back to NB for consistency"
  // (promptlibrary.space 3-step workflow + godofprompt.ai JSON prompt guide)
  const hasFaceRefs = effectiveCharacters.some(c => c.modelImages && c.modelImages.length > 0);

  const characterSpecs = effectiveCharacters.map((ch, i) => ({
    character: i + 1,
    identity: (ch.modelImages && ch.modelImages.length > 0)
      ? {
          source: `[CHARACTER ${i + 1} — FACE/IDENTITY REFERENCE]`,
          face_lock: "ABSOLUTE — reproduce faithfully, same person recognizable instantly",
          preserve: ["bone_structure", "eye_shape", "eye_color", "nose_form", "lip_shape", "skin_tone", "skin_texture", "hair_color", "hair_texture"],
          ...(ch.characteristics ? { traits: ch.characteristics } : {}),
        }
      : {
          description: ch.characteristics || "photorealistic person",
          ...(ch.characteristics ? { traits: ch.characteristics } : {}),
        },
    costume: {
      source: (ch.outfitImages?.length ?? 0) > 0
        ? `[CHARACTER ${i + 1} — OUTFIT REFERENCE] — reproduce every detail exactly`
        : (ch.outfitDescription || "stylish editorial outfit"),
      rule: "Replace any clothing visible in FACE reference entirely",
    },
    pose: ch.pose || "natural confident editorial stance",
    ...(ch.accessory ? { accessory: ch.accessory } : {}),
  }));

  const sceneSpec = {
    style: styleDirective,
    environment: params.scenario || (params.scenarioImage?.length ? "[SCENARIO REFERENCE] — match location, colors, atmosphere" : "clean neutral studio"),
    lighting: {
      description: params.lighting || "soft directional studio light, slight rim highlight, warm skin tones, gentle diffusion",
      rule: "natural and flattering, no harsh shadows",
    },
    camera: {
      lens: params.camera || "85mm f/1.4 portrait",
      depth_of_field: "shallow — natural bokeh",
      focus: "sharp on faces and eyes",
    },
    quality: technicalQuality,
    ...(params.negativePrompt ? { exclude: params.negativePrompt } : {}),
  };

  const charCount = effectiveCharacters.length;
  const charCountText = charCount === 1 ? 'exactly ONE person (solo subject — no other people)' : `exactly ${charCount} characters`;

  const finalPrompt = `Generate a single cohesive fashion editorial image featuring ${charCountText}.

CHARACTERS:
\`\`\`json
${JSON.stringify(characterSpecs, null, 2)}
\`\`\`

SCENE & STYLE:
\`\`\`json
${JSON.stringify(sceneSpec, null, 2)}
\`\`\`

ABSOLUTE CONSTRAINTS:
${charCount === 1 ? '- CRITICAL: Generate exactly ONE person. Do NOT add any other people, bystanders, reflections, or background figures.\n' : ''}- ${hasFaceRefs ? 'Face of each character comes ONLY from their [FACE/IDENTITY REFERENCE] — never alter, blend, or idealize it.' : 'Generate the character(s) from the text description provided.'}
${hasFaceRefs ? '- Outfit from [FACE/IDENTITY REFERENCE] images is IRRELEVANT — replace with COSTUME source above.\n' : ''}- [SCENARIO REFERENCE] is for environment only — ignore any people visible in it.
- No watermarks, text, or borders.
`;

  parts.push({ text: finalPrompt });

  const count = params.numberOfImages || 1;

  let currentProgress = 20;
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.random() * 15;
      if (onProgress) onProgress(Math.min(90, currentProgress));
    }
  }, 1500);

  const selectedModel = params.model ?? GeminiImageModel.Flash2;

  // Build tasks as deferred functions (do not execute yet)
  const tasks = Array.from({ length: count }, (_, i) =>
    async () => {
      // Slightly stagger the start to avoid saturation (300ms between tasks)
      if (i > 0) await wait(i * 300);
      try {
        const response = await generateWithFallback(ai, selectedModel, parts, {
          imageSize: params.imageSize,
          aspectRatio: params.aspectRatio,
        });
        return processResponse(response);
      } catch (err) {
        console.error(`generateInfluencerImage: task ${i + 1} failed after all retries`, err);
        throw err; // propagar para que runWithConcurrencyLimit lo capture
      }
    }
  );

  try {
    // Maximum 3 simultaneous API requests
    const results = await runWithConcurrencyLimit(tasks, 3);
    const allImages = results.flat();

    if (allImages.length === 0) {
      throw new Error("Could not generate any images. Please check your inputs and try again.");
    }

    if (onProgress) onProgress(100);
    return allImages;
  } catch (error) {
    // Re-throw the original error with the real status code (503, 429, etc.)
    throw error;
  } finally {
    clearInterval(progressInterval);
  }
};

// ─────────────────────────────────────────────
// Modify Influencer Pose
// ─────────────────────────────────────────────
export interface PoseGenerationResult {
  url: string;
  poseIndex: number;
}

export const modifyInfluencerPose = async (
  params: PoseModificationParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<PoseGenerationResult[]> => {
  const ai = createGeminiClient();
  if (abortSignal?.aborted) throw new Error("Cancelled by user.");
  if (onProgress) onProgress(10);

  const baseImagePart = await fileToPart(params.baseImage);

  let currentProgress = 20;
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.random() * 10;
      if (onProgress) onProgress(Math.min(90, currentProgress));
    }
  }, 1000);

  const count = params.numberOfImages || 1;
  // Imagen 4 models only support generateImages (text-to-image), not generateContent (editing).
  // Fall back to Flash2 which supports multimodal generateContent for pose editing.
  const rawModel = params.model ?? GeminiImageModel.Flash2;
  const selectedModel = IMAGEN4_MODELS.has(rawModel) ? GeminiImageModel.Flash2 : rawModel;

  const buildTask = (index: number) => async (): Promise<PoseGenerationResult | null> => {
    if (index > 0) await wait(index * 800);

    return withExponentialBackoff(async () => {
      const currentParts: any[] = [
        { text: "=== BASE IMAGE (Source for Identity, Face, Hair, and Clothing) ===" },
        baseImagePart
      ];

      let currentPoseText = params.pose;
      let currentPoseImages: File[] = [];
      let currentAccessoryText = params.accessory;
      let currentAccessoryImages: File[] = params.accessoryImages || [];

      if (params.sessionPoses && params.sessionPoses.length > index) {
        currentPoseText = params.sessionPoses[index].text;
        currentPoseImages = params.sessionPoses[index].images;
        currentAccessoryText = params.sessionPoses[index].accessory;
        currentAccessoryImages = params.sessionPoses[index].accessoryImages || [];
      } else if (params.poseImages) {
        currentPoseImages = params.poseImages;
      }

      if (currentPoseImages && currentPoseImages.length > 0) {
        currentParts.push({ text: "\n=== REFERENCE IMAGES (Target Pose) ===" });
        for (const img of currentPoseImages) {
          const poseRefPart = await fileToPart(img);
          currentParts.push(poseRefPart);

          if (params.usePoseAsOutfit) {
            currentParts.push({ text: "Use this image ALSO as the OUTFIT SOURCE. Extract clothing/garments from here." });
          }
        }
      }

      if (currentAccessoryImages && currentAccessoryImages.length > 0) {
        currentParts.push({ text: "\n=== REFERENCE IMAGES (Accessory/Object) ===" });
        for (const img of currentAccessoryImages) {
          currentParts.push(await fileToPart(img));
        }
      }

      // ── FACE LOCK first — Gemini weights early instructions highest ──
      let promptText = `
⚠️ FACE LOCK — ABSOLUTE CONSTRAINT (process before anything else):
The face in the Base Image is FROZEN. You are FORBIDDEN from altering, redesigning, smoothing, idealizing, or blending it in any way.
Reproduce faithfully so the person is instantly recognizable: bone structure, eye shape, eye color, iris color, nose, lips, skin tone, skin texture, hair color, hair style, and every distinguishing facial feature.

TASK: You are a photo retoucher performing a MINIMAL BODY-ONLY EDIT on a professional fashion editorial photograph.

PERMITTED CHANGES:
- Body pose only: limb positions, body angle, skeletal structure

FORBIDDEN CHANGES (do not touch under any circumstance):
- Face or any facial feature
- Skin tone or texture
- Hair (color, style, length)
- Eye color or shape
- Outfit or clothing (unless OUTFIT instruction below explicitly says otherwise)
- Background environment
`;

      if (currentPoseText) {
        promptText += `\nPOSE TARGET: Reposition the body to: "${currentPoseText}". Body only — face remains frozen from Base Image.`;
      } else if (currentPoseImages.length > 0) {
        promptText += `\nPOSE TARGET: Match the body skeletal structure from 'Reference images (TARGET POSE)'. Copy limb positions and body angle ONLY. Face, hair, skin tone, and clothing must come from the Base Image — NOT from the pose reference person.`;
      } else {
        promptText += `\nPOSE TARGET: Natural, confident fashion-editorial stance. Face frozen from Base Image.`;
      }

      if (currentAccessoryText) {
        promptText += `\nACCESSORY: Subject is holding/interacting with: "${currentAccessoryText}". Integrate naturally into the pose.`;
      } else if (currentAccessoryImages.length > 0) {
        promptText += `\nACCESSORY: Subject is holding the exact object from 'Reference images (ACCESSORY/OBJECT)'. Reproduce faithfully and integrate naturally.`;
      }

      if (params.usePoseAsOutfit && currentPoseImages.length > 0) {
        promptText += `\nOUTFIT: Replace clothing with the exact garments from 'Reference images (OUTFIT SOURCE)' — same fabric texture, color, cut, fit, and details. Face remains from Base Image.`;
      } else {
        promptText += `\nOUTFIT: Preserve the exact outfit from the Base Image — same garments, colors, textures, and fit. No clothing changes.`;
      }

      promptText += `\nOUTPUT: Ultra-photorealistic fashion editorial photograph. Sharp facial detail, natural skin texture, realistic fabric rendering. 85mm portrait lens quality. No plastic skin, no AI artifacts, no over-smoothing.`;

      promptText += `\nThe face is the non-negotiable identity anchor of this edit — it must match the Base Image.`;

      if (count > 1 && (!params.sessionPoses || params.sessionPoses.length === 0)) {
        promptText += `\n(Variation ${index + 1} of ${count} — explore pose variation only. Identity and face are locked.)`;
      }

      currentParts.push({ text: promptText });

      const response = await generateWithFallback(ai, selectedModel, currentParts, {
        imageSize: params.imageSize,
        aspectRatio: params.aspectRatio,
      });

      const images = processResponse(response);
      if (images.length > 0) {
        return { url: images[0], poseIndex: index };
      } else {
        // Candidate arrived but without inlineData — probably text-only response
        const parts = response.candidates?.[0]?.content?.parts || [];
        const responseText = parts.map((p: any) => p.text).filter(Boolean).join(" ");
        const finishReason = response.candidates?.[0]?.finishReason;
        console.error("Pose — candidate without image. finishReason:", finishReason, "| text:", responseText || "(empty)");
        throw new Error(responseText ? `Gemini did not return an image, responded: ${responseText}` : "No image generated");
      }
    });
  };

  const tasks = Array.from({ length: count }, (_, i) => buildTask(i));

  try {
    // Maximum 3 simultaneous requests
    const results = await runWithConcurrencyLimit(tasks, 3);
    const successfulImages = results.filter((r): r is PoseGenerationResult => r !== null);

    if (successfulImages.length === 0) {
      throw new Error("Failed to edit any images.");
    }

    if (onProgress) onProgress(100);
    return successfulImages;
  } catch (error) {
    console.error("Error modifying pose:", error);
    throw error;
  } finally {
    clearInterval(progressInterval);
  }
};

// ─────────────────────────────────────────────
// Generate Influencer Video
// ─────────────────────────────────────────────
export const generateInfluencerVideo = async (
  params: VideoParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  const ai = createGeminiClient();
  if (abortSignal?.aborted) throw new Error("Cancelled by user.");
  if (onProgress) onProgress(5);

  const promptText = params.prompt;

  const imagePart = await fileToPart(params.baseImage);

  try {
    let operation = await withExponentialBackoff(() =>
      ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: promptText,
        image: {
          imageBytes: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType,
        },
        config: {
          numberOfVideos: 1,
          aspectRatio: '16:9',
        },
      })
    );

    if (onProgress) onProgress(20);

    let attempts = 0;
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });

      attempts++;
      const estimatedProgress = 20 + (attempts * 10);
      if (onProgress) onProgress(Math.min(95, estimatedProgress));
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("No video URI returned from operation.");
    }

    if (onProgress) onProgress(98);

    // Route video download through the proxy — the proxy appends the real API key
    const proxyVideoUrl = `/gemini-api/${downloadLink.replace('https://generativelanguage.googleapis.com/', '')}`;
    const videoResponse = await fetch(proxyVideoUrl);
    if (!videoResponse.ok) {
      throw new Error("Failed to download generated video.");
    }

    const videoBlob = await videoResponse.blob();
    if (onProgress) onProgress(100);

    return URL.createObjectURL(videoBlob);
  } catch (error) {
    console.error("Error generating video:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// Generate Batch Outfits
// Same face/character, N different outfits in parallel
// ─────────────────────────────────────────────
export interface BatchOutfitResult {
  url: string;
  outfitIndex: number;
}

export const generateBatchOutfits = async (
  baseParams: InfluencerParams,
  outfits: BatchOutfitItem[],
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<BatchOutfitResult[]> => {
  const ai = createGeminiClient();
  if (abortSignal?.aborted) throw new Error("Cancelled by user.");
  if (onProgress) onProgress(5);

  const character = baseParams.characters[0];

  // Shared parts (model/face) — reused in each task
  const sharedModelParts: any[] = [];
  if (character.modelImages && character.modelImages.length > 0) {
    for (const file of character.modelImages) {
      sharedModelParts.push(await fileToPart(file));
    }
    sharedModelParts.push({ text: "Reference images (MODEL — SOURCE OF TRUTH): Meticulously reproduce this exact face and identity in every output. Same bone structure, eye shape, skin tone, and all distinguishing features." });
  }

  const sharedScenarioParts: any[] = [];
  if (baseParams.scenarioImage && baseParams.scenarioImage.length > 0) {
    for (const file of baseParams.scenarioImage) {
      sharedScenarioParts.push(await fileToPart(file));
    }
    sharedScenarioParts.push({ text: "Reference images (SCENARIO): SHARED BACKGROUND ENVIRONMENT." });
  }

  if (onProgress) onProgress(15);

  const buildTask = (outfit: BatchOutfitItem, index: number) => async (): Promise<BatchOutfitResult | null> => {
    if (index > 0) await wait(index * 400);

    const parts: any[] = [...sharedModelParts];

    // Specific outfit for this variation
    if (outfit.outfitImages.length > 0) {
      for (const file of outfit.outfitImages) {
        parts.push(await fileToPart(file));
      }
      parts.push({ text: `Reference images (OUTFIT ${index + 1}): Reproduce EXACTLY this outfit — same fabric texture, color, cut, fit, and all details. This is the ONLY outfit for this variation.` });
    }

    parts.push(...sharedScenarioParts);

    const prompt = `
**BATCH OUTFIT VARIATION ${index + 1} of ${outfits.length}**

**PRIMARY GOAL:** Generate an ultra-photorealistic fashion editorial photograph of the character wearing a specific outfit variation. Shot with Sony A7R V, 85mm f/1.4 portrait lens.

**IDENTITY (NON-NEGOTIABLE):** The face MUST be pixel-faithful to the 'Reference images (MODEL — SOURCE OF TRUTH)'. Same bone structure, eye shape and color, nose, lips, skin tone. Do NOT alter, idealize, or blend the face with anyone else.

**PHYSICAL CHARACTERISTICS:** ${character.characteristics || 'Use all physical traits from the MODEL reference.'}

**OUTFIT (THIS VARIATION):** ${outfit.outfitImages.length > 0
        ? `Reproduce EXACTLY the garments from 'Reference images (OUTFIT ${index + 1})' — same fabric, color, cut, fit, and details.`
        : outfit.outfitText
          ? outfit.outfitText
          : 'Use a high-fashion outfit consistent with the character\'s style.'}
${outfit.outfitText && outfit.outfitImages.length > 0 ? `Additional outfit notes: ${outfit.outfitText}` : ''}

**POSE:** ${character.pose || 'Natural, confident fashion-editorial pose.'}

**SCENARIO:** ${sharedScenarioParts.length > 0 ? "Match the 'Reference images (SCENARIO)'." : ''} ${baseParams.scenario || ''} ${!baseParams.scenario && sharedScenarioParts.length === 0 ? 'Clean studio background.' : ''}

**LIGHTING:** ${baseParams.lighting || 'Soft directional natural light with professional fill.'}

**CAMERA / LENS:** ${baseParams.camera || 'Shot on 85mm lens, sharp focus, beautiful bokeh.'}

**TECHNICAL QUALITY:** Sharp facial detail, natural skin texture, realistic fabric rendering, no AI artifacts, no plastic skin.

**CRITICAL:** Every variation must show the SAME face. Only the outfit changes between variations.
`;

    parts.push({ text: prompt });

    const response = await generateWithFallback(ai, baseParams.model ?? GeminiImageModel.Flash2, parts, {
      imageSize: baseParams.imageSize,
      aspectRatio: baseParams.aspectRatio,
    });

    const images = processResponse(response);
    if (images.length > 0) {
      return { url: images[0], outfitIndex: index };
    }
    return null;
  };

  const tasks = outfits.map((outfit, i) => buildTask(outfit, i));

  let currentProgress = 20;
  const progressInterval = setInterval(() => {
    if (currentProgress < 90) {
      currentProgress += Math.random() * 12;
      if (onProgress) onProgress(Math.min(90, currentProgress));
    }
  }, 1500);

  try {
    const results = await runWithConcurrencyLimit(tasks, 3);
    const successful = results.filter((r): r is BatchOutfitResult => r !== null);

    if (successful.length === 0) {
      throw new Error("Could not generate any outfit variation.");
    }

    if (onProgress) onProgress(100);
    return successful;
  } finally {
    clearInterval(progressInterval);
  }
};

// ─────────────────────────────────────────────
// Generate with Imagen 4
// Uses ai.models.generateImages (dedicated diffusion endpoint)
// — Pure text-to-image, no inline image references —
// ─────────────────────────────────────────────
export const generateWithImagen4 = async (
  params: InfluencerParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const ai = createGeminiClient();
  const selectedModel = params.model ?? GeminiImageModel.Imagen4;
  if (abortSignal?.aborted) throw new Error("Cancelled by user.");

  if (onProgress) onProgress(10);

  // Build a rich text-only prompt from all form fields
  // (Imagen 4 doesn't accept inline image parts — identity preservation is text-driven)
  const character = params.characters[0];
  const characterDesc = character
    ? [
      character.characteristics
        ? `Character physical description: ${character.characteristics}.`
        : '',
      character.pose ? `Pose: ${character.pose}.` : '',
      character.accessory ? `Accessory/object: ${character.accessory}.` : '',
    ]
      .filter(Boolean)
      .join(' ')
    : '';

  const prompt = [
    'Ultra-photorealistic fashion editorial photograph.',
    'Shot with Sony A7R V, 85mm f/1.4 lens, RAW, 4K resolution.',
    'Published quality: Vogue, Harper\'s Bazaar, W Magazine.',
    characterDesc,
    params.scenario ? `Scene/background: ${params.scenario}.` : '',
    params.lighting ? `Lighting: ${params.lighting}.` : 'Soft, directional natural light with cinematic rim light.',
    params.camera ? `Camera/Lens: ${params.camera}.` : 'Shot on 85mm lens, sharp focus.',
    'Sharp focus on face, natural skin texture, no plastic skin, no AI artifacts.',
    params.negativePrompt ? `Avoid: ${params.negativePrompt}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (onProgress) onProgress(20);

  const count = params.numberOfImages || 1;

  // Imagen 4 supports up to 4 images per call — batch them all in one request
  const batchSize = Math.min(count, 4);

  // Map aspect ratio to Imagen 4 format (same strings as AspectRatio enum — perfect match)
  const aspectRatio = params.aspectRatio ?? '3:4';

  // Map ImageSize to Imagen 4 supported sizes (only 1K and 2K supported)
  const imageSize = params.imageSize === '4K' ? '2K' : (params.imageSize ?? '1K');

  let currentProgress = 25;
  const progressInterval = setInterval(() => {
    if (currentProgress < 88) {
      currentProgress += Math.random() * 12;
      if (onProgress) onProgress(Math.min(88, currentProgress));
    }
  }, 2000);

  try {
    const response = await withExponentialBackoff(() =>
      (ai.models as any).generateImages({
        model: selectedModel,
        prompt,
        config: {
          numberOfImages: batchSize,
          aspectRatio,
          // Allow adult people generation (fashion editorial context)
          // Note: imageSize and safetyFilterLevel are Vertex AI-only params —
          // the Gemini API endpoint ignores them and returns 400 if included.
          personGeneration: 'allow_adult',
        },
      })
    );

    const results: string[] = [];
    const resp = response as any;
    for (const generatedImage of (resp.generatedImages ?? [])) {
      const imageBytes: string = generatedImage?.image?.imageBytes;
      if (imageBytes) {
        results.push(`data:image/png;base64,${imageBytes}`);
      }
    }

    if (results.length === 0) {
      throw new Error('Imagen 4 did not return any images. Check your prompt and try again.');
    }

    if (onProgress) onProgress(100);
    return results;
  } finally {
    clearInterval(progressInterval);
  }
};

// ─────────────────────────────────────────────
// Edit Image with AI
// Adds objects, effects, or modifications to an existing image
// ─────────────────────────────────────────────
export const editImageWithAI = async (
  params: AIEditParams,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string[]> => {
  const ai = createGeminiClient();
  if (abortSignal?.aborted) throw new Error("Cancelled by user.");
  if (onProgress) onProgress(10);

  const parts: any[] = [];

  // 1. Base image (always first)
  parts.push(await fileToPart(params.baseImage));
  parts.push({ text: '[BASE IMAGE] This is the original photograph to be edited. It is the source of truth.' });

  // 2. Optional reference image for what to add
  if (params.referenceImage) {
    parts.push(await fileToPart(params.referenceImage));
    parts.push({ text: '[REFERENCE] Use this image as a visual guide for the style, shape, color, or material of the element to add or modify.' });
  }

  // 3. Edit instruction prompt
  const promptText = `
⚠️ PRESERVATION RULE (highest priority): This is a MINIMAL TARGETED EDIT.
Preserve ALL existing elements of the Base Image EXACTLY — the subject's face, body, pose, outfit, background, lighting, color grade, and overall composition must remain unchanged.
ONLY add or modify what the instruction explicitly specifies.

EDIT INSTRUCTION: ${params.instruction}

INTEGRATION RULES:
- The added or modified elements must look seamlessly integrated and photorealistic
- Match the original image's lighting direction, color temperature, and shadows
- Maintain the same image quality, sharpness, and style
- If a [REFERENCE] image is provided, use it for the visual characteristics of the element
- Do NOT add extra elements not mentioned in the instruction
- Do NOT alter the subject's face, skin, hair, or clothing unless explicitly instructed

OUTPUT: Return the complete edited photograph at the same quality and composition as the Base Image, with only the instructed addition or modification applied.
`;

  parts.push({ text: promptText });

  // Imagen 4 models don't support generateContent — fall back to Flash2 for editing.
  const rawModel = params.model ?? GeminiImageModel.Flash2;
  const selectedModel = IMAGEN4_MODELS.has(rawModel) ? GeminiImageModel.Flash2 : rawModel;

  let currentProgress = 20;
  const progressInterval = setInterval(() => {
    if (currentProgress < 88) {
      currentProgress += Math.random() * 15;
      if (onProgress) onProgress(Math.min(88, currentProgress));
    }
  }, 1200);

  try {
    const response = await generateWithFallback(ai, selectedModel, parts, {
      imageSize: params.imageSize,
      aspectRatio: params.aspectRatio,
    });
    const images = processResponse(response);
    if (onProgress) onProgress(100);
    return images;
  } finally {
    clearInterval(progressInterval);
  }
};

// ─────────────────────────────────────────────
// Photo Session Generator
// Generates N shots from different camera angles
// keeping the same subject, outfit and scene.
// ─────────────────────────────────────────────

const SESSION_ANGLES = [
  { camera: "front-facing portrait at eye-level on 85mm lens, relaxed confident expression, slight head tilt, natural warm smile, shoulders angled 15 degrees off axis", env: "background centered behind subject, medium depth, balanced composition" },
  { camera: "three-quarter angle medium shot, weight on one hip, one hand in pocket or touching hair, contemplative expression looking past camera", env: "background shifted left, showing different wall/landscape, parallax visible" },
  { camera: "full body walking toward camera mid-stride, natural arm swing, dynamic movement, candid energy", env: "background is completely different perspective of the space, motion blur on environment" },
  { camera: "looking back over shoulder, body turned away, mysterious half-smile, three-quarter back view with head rotated toward camera", env: "background now shows what was behind the camera, reversed view of the space" },
  { camera: "wide environmental shot, subject leaning against surface or sitting casually, relaxed authentic pose, rule-of-thirds", env: "pull back to show much more environment — floor, ceiling/sky, walls, furniture" },
  { camera: "low angle from knee height, confident power stance with feet apart, assertive expression, looking down at camera", env: "ceiling or sky dominates upper frame, dramatic foreshortening" },
  { camera: "candid mid-laugh, genuine joy with crinkled eyes, head thrown back slightly, natural unposed moment", env: "background soft bokeh, movement energy, spontaneous feel" },
  { camera: "intimate close-up, eyes as focal point, dreamy or intense expression, slight smile, very shallow depth of field", env: "background heavily blurred bokeh, abstract soft colors" },
];

export const generatePhotoSession = async (
  referenceImage: File,
  count: number,
  options: { scenario?: string; lighting?: string; aspectRatio?: string; imageSize?: string; angles?: string[]; realistic?: boolean } = {},
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<PoseGenerationResult[]> => {
  const ai = createGeminiClient();
  if (abortSignal?.aborted) throw new Error('Cancelled by user.');
  if (onProgress) onProgress(5);

  const refPart = await fileToPart(referenceImage);
  if (onProgress) onProgress(15);

  const clampedCount = Math.max(2, Math.min(8, count));
  // Support both old string[] angles and new structured angles
  const useStructuredAngles = !options.angles || options.angles.length === 0;
  const structuredAngles = Array.from({ length: clampedCount }, (_, i) => SESSION_ANGLES[i % SESSION_ANGLES.length]);

  const buildTask = (index: number) => async (): Promise<PoseGenerationResult | null> => {
    if (abortSignal?.aborted) throw new Error('Cancelled by user.');
    if (index > 0) await wait(index * 300);

    const angleData = useStructuredAngles ? structuredAngles[index] : null;
    const cameraDesc = angleData ? angleData.camera : (options.angles?.[index % options.angles.length] || 'natural varied angle');
    const envDesc = angleData ? angleData.env : '';

    const isRealistic = options.realistic !== false;
    const prompt = `PHOTO SESSION — Shot ${index + 1} of ${clampedCount}

⚠️ FACE LOCK — ABSOLUTE CONSTRAINT (process before anything else):
The face in the Base Image is FROZEN. You are FORBIDDEN from altering, redesigning, smoothing, idealizing, or blending it in any way.
Reproduce with pixel-perfect fidelity: bone structure, eye shape, eye color, iris color, nose, lips, skin tone, skin texture, hair color, hair style, and every distinguishing facial feature.

TASK: You are a photo retoucher performing a MINIMAL edit on a photograph. The ONLY permitted change is the body pose and camera angle.
${isRealistic ? `
STYLE: Shot on iPhone 15 Pro. Natural phone camera quality — slight lens softness, shallow depth of field, imperfect framing. Must look like a real Instagram post, NOT an AI render. No perfect symmetry, no airbrushed skin, no studio lighting.
` : ''}
PERSON (identity must match Base Image):
- Same face, bone structure, eye shape, eye color, skin tone, hair — FROZEN from Base Image
- Same body proportions
- Same outfit: clothing, colors, fabrics, fit — PRESERVED from Base Image

CREATIVE DIRECTION: ${cameraDesc}
The person should adopt the pose, expression, and body language described above NATURALLY — do NOT make them stand stiffly or copy the reference pose. Each shot should feel like a different moment with different energy.${isRealistic ? ' Phone should be visible in hand where the pose involves a selfie or mirror shot.' : ''}

OUTFIT: Preserve the exact outfit from the Base Image — same garments, colors, textures, and fit. No clothing changes.

SCENE: ${options.scenario || 'Same type of location as the reference image.'}
${options.lighting ? `LIGHTING: ${options.lighting}` : (isRealistic ? 'LIGHTING: Natural window light, no flash, no ring light.' : '')}

BACKGROUND: ${envDesc || (isRealistic ? 'Real environment with natural clutter — beauty products, towels, flowers, real furniture. Must look different from other shots — different framing of the same space.' : 'Must look different from other shots — different framing of the same space.')}
The camera has physically moved. Background MUST change — different walls, depth, objects visible.

ONE photo only. No collages or grids. Ultra-photorealistic, natural skin, sharp focus.

⚠️ FINAL FACE CHECK: Before rendering — verify the face matches the Base Image exactly. If it does not, correct it to match. The face is the non-negotiable identity anchor.`;

    const parts: any[] = [
      refPart,
      { text: '[BASE IMAGE] Source for Identity, Face, Hair, Outfit, and Clothing. Copy the person\'s face with pixel-perfect fidelity. Preserve the outfit exactly. Ignore the background and camera angle — only the pose changes.' },
      { text: prompt },
    ];

    if (onProgress) onProgress(Math.round(15 + ((index + 1) / clampedCount) * 75));

    try {
      const response = await generateWithFallback(ai, GeminiImageModel.Flash2, parts, {
        imageSize: options.imageSize,
        aspectRatio: options.aspectRatio,
      });
      const images = processResponse(response);
      if (images.length > 0) return { url: images[0], poseIndex: index };

      console.warn(`Shot ${index + 1}: no image in response, skipping`);
      return null;
    } catch (shotErr) {
      console.warn(`Shot ${index + 1} failed:`, shotErr);
      return null;
    }
  };

  const tasks = Array.from({ length: clampedCount }, (_, i) => buildTask(i));
  try {
    const results = await runWithConcurrencyLimit(tasks, 3);
    const successful = results.filter((r): r is PoseGenerationResult => r !== null);
    if (successful.length === 0) throw new Error('No photos generated in session.');
    if (onProgress) onProgress(100);
    return successful;
  } catch (error) {
    console.error('Error generating photo session:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// Face Swap with Gemini NB2 (Flash2)
// baseImage = photo to apply face onto
// faceImage  = source face reference
// ─────────────────────────────────────────────
export const faceSwapWithGemini = async (
  baseImage: File,
  faceImage: File,
  onProgress?: (percent: number) => void,
  abortSignal?: AbortSignal
): Promise<string> => {
  const params: AIEditParams = {
    baseImage,
    instruction: [
      'Replace the face of the person in the Base Image with the face shown in the Reference image.',
      'Keep everything else identical: body pose, body shape, clothing, background, lighting, color grade, composition.',
      'Only the facial identity changes: bone structure, eye shape, eye color, nose, lips, jaw, skin tone.',
      'The new face must match the original lighting direction, color temperature, and shadow angles on the face.',
      'Hair style and color: keep from the Base Image (do NOT import hair from the Reference).',
      'Output: a complete photorealistic image at the same quality as the Base Image.',
    ].join(' '),
    referenceImage: faceImage,
    model: GeminiImageModel.Flash2,
  };
  const results = await editImageWithAI(params, onProgress, abortSignal);
  if (results.length === 0) throw new Error('Face swap: Gemini did not return an image. Try with clearer photos.');
  return results[0];
};

// ─────────────────────────────────────────────
// Generate Caption
// Gemini vision → plataform-specific captions + hashtags
// ─────────────────────────────────────────────
export interface CaptionResult {
  caption: string;
  hashtags: string[];
}

export const generateCaption = async (
  imageDataUrl: string,
  platform: 'instagram' | 'tiktok' | 'x',
  language: 'es' | 'en',
  contextHint?: string
): Promise<CaptionResult> => {
  const ai = createGeminiClient();

  // Extract base64 and mimeType from data URL
  const [header, base64Data] = imageDataUrl.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';

  const platformGuides: Record<string, string> = {
    instagram: 'Instagram (max 2200 chars, engaging, emojis encouraged, 20-30 relevant hashtags in the first comment)',
    tiktok: 'TikTok (short, punchy, viral hooks, 3-5 hashtags, use popular sounds mention if relevant)',
    x: 'X/Twitter (max 280 chars, concise, witty, 1-3 hashtags max)',
  };

  const langInstruction = language === 'es' ? 'Write entirely in Spanish.' : 'Write entirely in English.';

  const prompt = `You are a professional social media copywriter specializing in fashion and lifestyle content.

Analyze the image and create an optimized caption for ${platformGuides[platform]}.
${contextHint ? `Context/theme hint: "${contextHint}".` : ''}
${langInstruction}

Respond ONLY with a valid JSON object, no markdown:
{
  "caption": "the main caption text here",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
}

Rules:
- caption: do NOT include hashtags inside the caption field
- hashtags: array of strings WITHOUT the # symbol
- For Instagram: 20-25 relevant hashtags mixing popular and niche
- For TikTok: 3-5 viral hashtags
- For X: 1-3 concise hashtags
- Make it authentic, not generic`;

  const response = await withExponentialBackoff(() =>
    ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        safetySettings: relaxedSafetySettings,
      },
    })
  );

  const raw = response.text?.trim() || '{}';

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      caption: parsed.caption || '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h: string) => h.replace(/^#/, '')) : [],
    };
  } catch {
    // Fallback: return raw as caption
    return { caption: raw, hashtags: [] };
  }
};

// ─────────────────────────────────────────────
// Process Response
// ─────────────────────────────────────────────
function processResponse(response: any): string[] {
  const generatedImages: string[] = [];
  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];

    if (candidate.finishReason === 'SAFETY') {
      console.warn("⚠️ Safety block en respuesta final — imagen bloqueada.");
    }

    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const base64Data = part.inlineData.data;
          const mimeType = part.inlineData.mimeType || 'image/png';
          generatedImages.push(`data:${mimeType};base64,${base64Data}`);
        }
      }
    }
  }
  return generatedImages;
}
