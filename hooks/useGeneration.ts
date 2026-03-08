import { useState, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import {
  generateInfluencerImage,
  generateWithImagen4,
  modifyInfluencerPose,
  editImageWithAI,
  generateInfluencerVideo,
  faceSwapWithGemini,
  generatePhotoSession,
  PoseGenerationResult,
} from '../services/geminiService';
import {
  generateWithFal,
  editPoseWithFal,
  editImageWithFluxKontext,
  editImageWithSeedream5,
  editImageWithFlux2Pro,
  generateVideoWithKling,
  editImageWithGrokFal,
  generatePhotoSessionWithGrok,
  generateWithZImageTurbo,
} from '../services/falService';
import { generateWithReplicate } from '../services/replicateService';
import { generateWithOpenAI, editImageWithGPT } from '../services/openaiService';
import { generateWithIdeogram } from '../services/ideogramService';
import { generateWithModelsLab, editImageWithModelsLab } from '../services/modelsLabService';
import {
  GeneratedContent, InfluencerParams, PoseModificationParams, VideoParams, AIEditParams,
  AIProvider, FalModel, ReplicateModel, OpenAIModel, IdeogramModel, ModelsLabModel, PoseEngine, AIEditEngine, VideoEngine, VIDEO_ENGINE_LABELS,
  IMAGEN4_MODELS, CREDIT_COSTS, OPERATION_CREDIT_COSTS,
} from '../types';
import { useForm } from '../contexts/FormContext';
import { useGallery } from '../contexts/GalleryContext';
import { useProfile } from '../contexts/ProfileContext';

// ─────────────────────────────────────────────
// Error parser
// ─────────────────────────────────────────────

const parseGenerationError = (err: unknown): string => {
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (msg.includes('403')) return 'Access denied. Check your API Key billing status.';
  if (msg.includes('429')) return 'Quota exceeded. Try again later.';
  if (msg.includes('503') || msg.includes('network') || msg.toLowerCase().includes('fetch'))
    return 'Network error. Check your connection and try again.';
  return msg || 'Error generating content. Please try again.';
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export const useGeneration = (onGenerateStart?: () => void) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    activeMode,
    directorFaceImages,
    characters, scenario, scenarioImage, lighting, camera,
    numberOfImages, negativePrompt, imageBoost, antiFisheye, steps, cfg,
    guidanceScale, strength, seed,
    imageSize, aspectRatio, geminiModel,
    aiProvider, falModel, replicateModel, openaiModel, ideogramModel, modelsLabModel,
    editSubMode, baseImageForEdit, editNumberOfImages, sessionPoses, poseEngine,
    aiEditInstruction, aiEditReferenceImage, aiEditReferenceImages, aiEditEngine,
    photoSessionCount, photoSessionAngles, photoSessionModel,
    videoImage, videoPrompt, videoDialogue, videoVoice, videoResolution, videoEngine,
  } = useForm();

  const { addItems, setError } = useGallery();
  const { decrementCredits, restoreCredits } = useProfile();
  const toast = useToast();

  // ── Credit cost helper ──────────────────────────────────────────────────
  const computeCreditCost = (): number => {
    if (activeMode === 'video') {
      return CREDIT_COSTS[videoEngine as string] ?? 50;
    }
    if (activeMode === 'edit') {
      if (editSubMode === 'session') return OPERATION_CREDIT_COSTS.photoSession * photoSessionCount;
      if (editSubMode === 'ai' && aiEditEngine === AIEditEngine.FaceSwapFal) return OPERATION_CREDIT_COSTS.faceSwap;
      return OPERATION_CREDIT_COSTS.upscale; // cheap edit default (8)
    }
    // create mode — cost per model × numberOfImages
    let costPerImage = 2;
    if (aiProvider === AIProvider.Fal) costPerImage = CREDIT_COSTS[falModel] ?? 10;
    else if (aiProvider === AIProvider.Replicate) costPerImage = CREDIT_COSTS[replicateModel] ?? 15;
    else if (aiProvider === AIProvider.OpenAI) costPerImage = CREDIT_COSTS[openaiModel] ?? 20;
    else if (aiProvider === AIProvider.Ideogram) costPerImage = CREDIT_COSTS[ideogramModel] ?? 10;
    else if (aiProvider === AIProvider.ModelsLab) costPerImage = CREDIT_COSTS[modelsLabModel] ?? 5;
    else costPerImage = CREDIT_COSTS[geminiModel] ?? 2;
    return costPerImage * numberOfImages;
  };

  const handleGenerate = async () => {
    setError(null);

    // ── Validate that the user provided *something* to generate ────────
    if (activeMode === 'create') {
      const hasPrompt = characters.some(c => c.characteristics?.trim() || c.outfitDescription?.trim());
      const hasImages = characters.some(c => c.modelImages?.length);
      const hasScenario = !!scenario?.trim() || !!scenarioImage;
      if (!hasPrompt && !hasImages && !hasScenario) {
        toast.error('Please describe your image or add a reference photo.');
        return;
      }
    } else if (activeMode === 'video') {
      if (!videoPrompt?.trim() && !videoImage) {
        toast.error('Please describe the video or add a reference image.');
        return;
      }
    }

    // ── Deduct credits before API call ──────────────────────────────────
    const creditCost = computeCreditCost();
    const hasCredits = await decrementCredits(creditCost);
    if (!hasCredits) {
      const msg = 'Insufficient credits. Please upgrade your plan.';
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    onGenerateStart?.();

    abortControllerRef.current = new AbortController();
    const abortSignal = abortControllerRef.current.signal;

    try {
      let newItems: GeneratedContent[] = [];
      let params: any;

      if (activeMode === 'create') {
        const finalNegativePrompt = antiFisheye
          ? (negativePrompt ? `${negativePrompt}, fisheye lens, distorted perspective, wide angle distortion, warped anatomy` : 'fisheye lens, distorted perspective, wide angle distortion, warped anatomy')
          : negativePrompt;

        // If DirectorStudio loaded face photos, inject them into the first character
        const effectiveCharacters = directorFaceImages.length > 0
          ? characters.map((c, i) => i === 0 ? { ...c, modelImages: directorFaceImages } : c)
          : characters;

        params = {
          characters: effectiveCharacters,
          scenario,
          scenarioImage,
          lighting,
          camera,
          negativePrompt: finalNegativePrompt,
          imageBoost,
          imageSize,
          aspectRatio,
          numberOfImages,
          steps,
          cfg,
          guidanceScale,
          strength,
          seed,
          model: geminiModel,
        } as InfluencerParams;

        let urls: string[] = [];

        if (aiProvider === AIProvider.Fal && falModel === FalModel.ZImageTurbo) {
          // Z-Image Turbo — text-to-image only, no reference needed
          urls = await generateWithZImageTurbo(params, (p) => setProgress(p), abortSignal);
        } else if (aiProvider === AIProvider.Fal) {
          // All other fal.ai models require at least 1 reference photo for identity
          if (!characters[0]?.modelImages?.length) {
            throw new Error('fal.ai requires at least one model reference photo to preserve identity.');
          }
          urls = await generateWithFal(params, falModel, (p) => setProgress(p), abortSignal);
        } else if (aiProvider === AIProvider.Replicate) {
          const replicateNoRefNeeded = replicateModel === ReplicateModel.Flux2Max || replicateModel === ReplicateModel.GrokImagine;
          if (!replicateNoRefNeeded && !characters[0]?.modelImages?.length) {
            throw new Error('Replicate requires at least one model reference photo to preserve identity.');
          }
          urls = await generateWithReplicate(params, replicateModel as ReplicateModel, (p) => setProgress(p), abortSignal);
        } else if (aiProvider === AIProvider.OpenAI) {
          urls = await generateWithOpenAI(params, openaiModel as OpenAIModel, (p) => setProgress(p), abortSignal);
        } else if (aiProvider === AIProvider.Ideogram) {
          urls = await generateWithIdeogram(params, ideogramModel as IdeogramModel, (p) => setProgress(p), abortSignal);
        } else if (aiProvider === AIProvider.ModelsLab) {
          urls = await generateWithModelsLab(params, modelsLabModel as ModelsLabModel, (p) => setProgress(p), abortSignal);
        } else if (IMAGEN4_MODELS.has(geminiModel)) {
          // Imagen 4: pure text-to-image via ai.models.generateImages
          urls = await generateWithImagen4(params, (p) => setProgress(p), abortSignal);
        } else {
          // Default: Gemini Flash / Pro (multimodal generateContent)
          urls = await generateInfluencerImage(params, (p) => setProgress(p), abortSignal);
        }

        newItems = urls.map(url => ({
          id: crypto.randomUUID(),
          url,
          params: { ...params },
          timestamp: Date.now(),
          type: 'create' as const,
          aiProvider,
          ...(aiProvider === AIProvider.Fal && { falModel }),
          ...(aiProvider === AIProvider.Replicate && { replicateModel }),
          ...(aiProvider === AIProvider.OpenAI && { openaiModel }),
          ...(aiProvider === AIProvider.Ideogram && { ideogramModel }),
          ...(aiProvider === AIProvider.ModelsLab && { modelsLabModel }),
        }));

      } else if (activeMode === 'edit') {
        if (!baseImageForEdit) throw new Error('You must upload a base image.');

        if (editSubMode === 'session') {
          // ── Photo Session mode ─────────────────────────────
          const customAngles = photoSessionAngles.length > 0 ? photoSessionAngles : undefined;
          let sessionResults: { url: string; poseIndex: number }[];

          if (photoSessionModel === 'grok') {
            sessionResults = await generatePhotoSessionWithGrok(
              baseImageForEdit,
              photoSessionCount,
              { angles: customAngles },
              (p) => setProgress(p),
              abortSignal
            );
          } else {
            sessionResults = await generatePhotoSession(
              baseImageForEdit,
              photoSessionCount,
              { scenario, lighting, aspectRatio, imageSize, angles: customAngles },
              (p) => setProgress(p),
              abortSignal
            );
          }

          newItems = sessionResults.map((res) => ({
            id: crypto.randomUUID(),
            url: res.url,
            params: { baseImage: baseImageForEdit, instruction: `photo-session:${photoSessionCount}` } as any,
            timestamp: Date.now(),
            type: 'edit' as const,
          }));

        } else if (editSubMode === 'ai') {
          // ── AI Edit mode ──────────────────────────────────
          if (aiEditEngine !== AIEditEngine.FaceSwapFal && !aiEditInstruction.trim()) {
            throw new Error('Describe what you want to add or modify in the image.');
          }
          if (aiEditEngine === AIEditEngine.FaceSwapFal && !aiEditReferenceImage) {
            throw new Error('You must upload a photo with the face you want to swap (Reference Image).');
          }

          params = {
            baseImage: baseImageForEdit,
            instruction: aiEditInstruction,
            referenceImage: aiEditReferenceImage ?? undefined,
            model: geminiModel,
            aspectRatio,
            imageSize,
          } as AIEditParams;

          let aiEditUrls: string[];
          if (aiEditEngine === AIEditEngine.FluxKontext) {
            // FLUX Kontext Pro — text instruction editing (fal.ai)
            aiEditUrls = await editImageWithFluxKontext(
              baseImageForEdit,
              aiEditInstruction,
              (p) => setProgress(p),
              { guidanceScale, seed },
              abortSignal
            );
          } else if (aiEditEngine === AIEditEngine.Seedream5Edit) {
            // Seedream 5 Edit — multimodal editing with references (fal.ai)
            aiEditUrls = await editImageWithSeedream5(
              baseImageForEdit,
              aiEditInstruction,
              aiEditReferenceImages,
              (p) => setProgress(p),
              { guidanceScale, seed },
              abortSignal
            );
          } else if (aiEditEngine === AIEditEngine.FaceSwapFal) {
            // Face Swap — Gemini NB2 (Flash2) multimodal face swap
            const url = await faceSwapWithGemini(
              baseImageForEdit,
              aiEditReferenceImage!,
              (p) => setProgress(p),
              abortSignal
            );
            aiEditUrls = [url];
          } else if (aiEditEngine === AIEditEngine.Flux2ProEdit) {
            // FLUX.2 Pro Edit — multi-reference editing (fal.ai)
            aiEditUrls = await editImageWithFlux2Pro(
              baseImageForEdit,
              aiEditInstruction,
              aiEditReferenceImages,
              (p) => setProgress(p),
              { seed },
              abortSignal
            );
          } else if (aiEditEngine === AIEditEngine.GPTImageEdit) {
            // GPT Image Edit — editing with OpenAI (Vite proxy)
            aiEditUrls = await editImageWithGPT(
              baseImageForEdit,
              aiEditInstruction,
              (p) => setProgress(p),
              { aspectRatio },
              abortSignal
            );
          } else if (aiEditEngine === AIEditEngine.GrokImagine) {
            // Grok Imagine Edit — xAI Aurora via fal.ai (xai/grok-imagine-image/edit)
            aiEditUrls = await editImageWithGrokFal(
              baseImageForEdit,
              aiEditInstruction,
              (p) => setProgress(p),
              abortSignal
            );
          } else if (aiEditEngine === AIEditEngine.ModelsLabImg2Img) {
            // ModelsLab img2img — NSFW uncensored image editing
            aiEditUrls = await editImageWithModelsLab(
              baseImageForEdit,
              aiEditInstruction,
              modelsLabModel as ModelsLabModel,
              (p) => setProgress(p),
              { strength, guidanceScale, seed, aspectRatio },
              abortSignal
            );
          } else {
            // Default: Gemini multimodal
            aiEditUrls = await editImageWithAI(params, (p) => setProgress(p), abortSignal);
          }

          newItems = aiEditUrls.map(url => ({
            id: crypto.randomUUID(),
            url,
            params: { ...params },
            timestamp: Date.now(),
            type: 'edit' as const,
          }));

        } else {
          // ── Pose edit mode ────────────────────────────────
          if (editNumberOfImages === 1) {
            if (!sessionPoses[0].text && sessionPoses[0].images.length === 0)
              throw new Error('You must describe the new pose or upload a reference image.');
          } else {
            const missingIndex = sessionPoses.findIndex(p => !p.text && p.images.length === 0);
            if (missingIndex !== -1) {
              throw new Error(`Photo #${missingIndex + 1} in the session has no pose defined (text or image). Please fill in all fields.`);
            }
          }

          params = {
            baseImage: baseImageForEdit,
            sessionPoses,
            pose: sessionPoses[0].text,
            poseImages: sessionPoses[0].images,
            accessory: sessionPoses[0].accessory,
            accessoryImages: sessionPoses[0].accessoryImages,
            usePoseAsOutfit: characters[0]?.usePoseAsOutfit ?? false,
            imageSize,
            aspectRatio,
            numberOfImages: editNumberOfImages,
            model: geminiModel,
          } as PoseModificationParams;

          // Route by selected pose engine
          let results: PoseGenerationResult[];
          if (poseEngine === PoseEngine.FalAI) {
            // fal.ai: Leffa (si hay imagen ref) o FLUX Kontext (si solo texto)
            const falUrls = await editPoseWithFal(params, (p) => setProgress(p), abortSignal);
            results = falUrls.map((url, i) => ({ url, poseIndex: i }));
          } else if (poseEngine === PoseEngine.Flux2ProEdit || poseEngine === PoseEngine.GPTImageEdit || poseEngine === PoseEngine.GrokImagine) {
            // FLUX.2 Pro Edit / GPT Image / Grok Imagine — iteramos sessionPoses igual que fal
            const sessions = (params.sessionPoses && params.sessionPoses.length > 0)
              ? params.sessionPoses
              : [{ text: params.pose || '', images: params.poseImages || [], accessory: params.accessory, accessoryImages: params.accessoryImages || [] }];
            const total = sessions.length;
            const poseResults: PoseGenerationResult[] = [];

            for (let i = 0; i < total; i++) {
              const session = sessions[i];
              const sessionProgress = (p: number) => setProgress(Math.round((i / total + p / 100 / total) * 100));

              // Build instruction from pose text + accessory
              const instructionParts: string[] = [
                session.text
                  ? `Change the pose of the person to: ${session.text}.`
                  : 'Apply the pose shown in the reference image to the person.',
                'Keep the exact same face, skin tone, hair color and style, and clothing.',
                'Preserve the original art style, medium, and overall aesthetic of the image.',
              ];
              if (session.accessory) instructionParts.push(`They are now holding or wearing: ${session.accessory}.`);
              const instruction = instructionParts.join(' ');

              let urls: string[];
              if (poseEngine === PoseEngine.Flux2ProEdit) {
                urls = await editImageWithFlux2Pro(
                  params.baseImage,
                  instruction,
                  session.images || [],
                  sessionProgress,
                  { seed: params.seed },
                  abortSignal
                );
              } else if (poseEngine === PoseEngine.GrokImagine) {
                // Grok Imagine Edit — xAI Aurora via fal.ai (xai/grok-imagine-image/edit)
                urls = await editImageWithGrokFal(
                  params.baseImage,
                  instruction,
                  sessionProgress,
                  abortSignal
                );
              } else {
                // GPT Image Edit
                urls = await editImageWithGPT(
                  params.baseImage,
                  instruction,
                  sessionProgress,
                  { aspectRatio },
                  abortSignal
                );
              }

              poseResults.push(...urls.map((url) => ({ url, poseIndex: i })));
            }
            results = poseResults;
          } else {
            // Default: Gemini multimodal
            results = await modifyInfluencerPose(params, (p) => setProgress(p), abortSignal);
          }
          newItems = results.map((res: PoseGenerationResult) => {
            let specificParams = { ...params };
            if (params.sessionPoses && params.sessionPoses.length > res.poseIndex) {
              const sessionItem = params.sessionPoses[res.poseIndex];
              specificParams = {
                ...params,
                pose: sessionItem.text,
                poseImages: sessionItem.images,
                accessory: sessionItem.accessory,
                accessoryImages: sessionItem.accessoryImages,
              };
            }
            return {
              id: crypto.randomUUID(),
              url: res.url,
              params: specificParams,
              timestamp: Date.now(),
              type: 'edit' as const,
            };
          });
        }

      } else {
        // Video — always Gemini/Veo
        if (!videoImage) throw new Error('You must upload an initial image for the video.');
        if (!videoPrompt && !videoDialogue) throw new Error('Describe what happens in the video or add dialogue.');

        params = {
          baseImage: videoImage,
          prompt: videoPrompt,
          dialogue: videoDialogue,
          voiceFile: videoVoice,
          resolution: videoResolution,
          aspectRatio,
          engine: videoEngine,
        } as VideoParams;

        let videoUrl: string;
        if (videoEngine === VideoEngine.KlingStandard || videoEngine === VideoEngine.KlingPro) {
          videoUrl = await generateVideoWithKling(params, (p) => setProgress(p), abortSignal);
        } else if (videoEngine === VideoEngine.LumaDreamMachine || videoEngine === VideoEngine.RunwayGen3) {
          throw new Error(`The ${VIDEO_ENGINE_LABELS[videoEngine].name} engine is not yet implemented.`);
        } else {
          // Default to Gemini (Veo)
          videoUrl = await generateInfluencerVideo(params, (p) => setProgress(p), abortSignal);
        }
        newItems = [{
          id: crypto.randomUUID(),
          url: videoUrl,
          params,
          timestamp: Date.now(),
          type: 'video' as const,
        }];
      }

      if (newItems.length === 0) throw new Error('No images were generated. Try again.');

      // Tag source workspace
      const itemSource = directorFaceImages.length > 0 ? 'director' : 'generate';
      newItems = newItems.map(item => ({ ...item, source: itemSource as 'generate' | 'director' }));

      // addItems handles both Supabase + IndexedDB persistence with fallback
      await addItems(newItems);

      const label = newItems[0]?.type === 'video' ? 'Video' : newItems.length > 1 ? `${newItems.length} images` : 'Image';
      toast.success(`${label} generated`);
    } catch (err: unknown) {
      // Restore credits on failure
      restoreCredits(creditCost);
      const msg = parseGenerationError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
      setProgress(0);
      abortControllerRef.current = null;
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return { isGenerating, progress, handleGenerate, stopGeneration };
};
