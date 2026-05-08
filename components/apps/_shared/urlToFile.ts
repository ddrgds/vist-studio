/**
 * Convert a remote (or data:) URL to a File object suitable for upload.
 * Used by all premium apps to convert Supabase character refs into the
 * File array that NB2/Grok expect.
 */
export async function urlToFile(url: string, filename = 'character.png'): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}
