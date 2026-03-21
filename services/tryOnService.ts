// services/tryOnService.ts
// Virtual try-on via CAT-VTON.
// Applies a garment image onto a generated character photo.
// Runs as a post-processing step AFTER main generation in Director.

import { fal } from '@fal-ai/client'

fal.config({ proxyUrl: '/fal-api' })

const unwrap = (result: any): any => result?.data ?? result ?? {}

/**
 * Applies a garment onto a person photo using CAT-VTON.
 *
 * @param humanImageUrl - URL of the generated character photo (from main generation)
 * @param garmentImageUrl - fal.storage URL of the uploaded outfit/garment image
 * @returns URL of the virtual try-on result
 */
export async function runTryOn(humanImageUrl: string, garmentImageUrl: string): Promise<string> {
  const result = await fal.subscribe('fal-ai/cat-vton', {
    input: {
      human_image_url: humanImageUrl,
      garment_image_url: garmentImageUrl,
      cloth_type: 'overall',
      num_inference_steps: 30,
      guidance_scale: 2.5,
    },
    timeout: 120000,
  }) as any

  const data = unwrap(result)
  const url = data.images?.[0]?.url ?? data.image?.url ?? data.result_url

  if (!url) throw new Error('CAT-VTON returned no image')
  return url
}
