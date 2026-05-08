/**
 * useAppUpload — React hook that manages the "upload your own photo" state
 * shared by HeadshotPro, Reimaginar, Sesión de Fotos.
 *
 * On native (Capacitor) it opens the native camera/gallery prompt.
 * On web it triggers a hidden file input the caller renders.
 *
 * Returns the state + handlers + a ref to attach to the file input.
 */
import { useRef, useState, useCallback } from 'react';
import { hapticLight, takePhoto, isNativePlatform } from '../../../services/nativeService';

export interface AppUploadState {
  /** Currently uploaded File (null if none) */
  customBaseFile: File | null;
  /** Data URL for preview thumbnail (null if no upload) */
  customBaseUrl: string | null;
  /** Open the native camera or web file picker. */
  openUploadPicker: () => Promise<void>;
  /** Handler for the hidden <input type="file"> change event. */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Clear the current upload. */
  clearCustomBase: () => void;
  /** Ref to attach to a hidden <input type="file" accept="image/*" hidden /> */
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export function useAppUpload(opts?: {
  onError?: (msg: string) => void;
  /** Called after a successful upload — useful to clear the selectedCharId. */
  onUpload?: () => void;
}): AppUploadState {
  const [customBaseFile, setCustomBaseFile] = useState<File | null>(null);
  const [customBaseUrl, setCustomBaseUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onError = opts?.onError ?? (() => {});
  const onUpload = opts?.onUpload ?? (() => {});

  const openUploadPicker = useCallback(async () => {
    hapticLight();
    if (await isNativePlatform()) {
      const photo = await takePhoto({ source: 'prompt', quality: 90 });
      if (photo) {
        setCustomBaseFile(photo.file);
        setCustomBaseUrl(photo.dataUrl);
        onUpload();
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [onUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onError('Solo imágenes (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      onError('Máximo 12 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomBaseUrl(reader.result as string);
      setCustomBaseFile(file);
      onUpload();
      hapticLight();
    };
    reader.readAsDataURL(file);
    // Reset value so re-uploading the same file fires onChange
    e.target.value = '';
  }, [onError, onUpload]);

  const clearCustomBase = useCallback(() => {
    hapticLight();
    setCustomBaseFile(null);
    setCustomBaseUrl(null);
  }, []);

  return {
    customBaseFile,
    customBaseUrl,
    openUploadPicker,
    handleFileChange,
    clearCustomBase,
    fileInputRef,
  };
}
