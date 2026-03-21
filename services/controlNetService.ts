// services/controlNetService.ts
// Extracts pose skeleton via ControlNet openpose.
// Used as an optional pre-pass in Director generation when the user provides a pose reference image.

import { fal } from '@fal-ai/client'

fal.config({ proxyUrl: '/fal-api' })

const unwrap = (result: any): any => result?.data ?? result ?? {}

/**
 * Runs ControlNet openpose on a reference image.
 * Returns a conditioned image URL that captures the pose structure.
 *
 * @param poseImageUrl - fal.storage URL of the uploaded pose reference
 * @param prompt - the compiled generation prompt (used to guide the conditioned output)
 */
export async function runControlNet(poseImageUrl: string, prompt: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/controlnet-union-sdxl', {
    input: {
      image_url: poseImageUrl,
      prompt,
      control_type: 'openpose',
      controlnet_conditioning_scale: 0.8,
      num_inference_steps: 25,
      guidance_scale: 7.5,
      num_images: 1,
    },
    timeout: 90000,
  }) as any

  const data = unwrap(result)
  const url = data.images?.[0]?.url ?? data.image?.url

  if (!url) throw new Error('ControlNet returned no image')
  return url
}
