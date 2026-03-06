import { GeneratedContent, CustomPreset, InspirationImage } from "../types";

const DB_NAME = 'VirtualInfluencerStudioDB';
const HISTORY_STORE = 'history';
const PRESETS_STORE = 'customPresets';
const INSPIRATION_STORE = 'inspirationImages';
const CHARACTERS_STORE = 'characters';
const DB_VERSION = 4; // v4: force upgrade for browsers stuck at v3 without 'characters' store

// Helper to open/init DB — exported so characterStorageService can reuse it
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PRESETS_STORE)) {
        db.createObjectStore(PRESETS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(INSPIRATION_STORE)) {
        db.createObjectStore(INSPIRATION_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHARACTERS_STORE)) {
        db.createObjectStore(CHARACTERS_STORE, { keyPath: 'id' });
      }
    };
  });
};

// Helper: Convert Blob to Base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// --- HISTORY STORE ---
export const saveHistoryItem = async (item: GeneratedContent): Promise<void> => {
  try {
    const db = await initDB();
    const itemToSave: any = { ...item };

    if (item.type === 'video' && item.url && item.url.startsWith('blob:')) {
        try {
            const response = await fetch(item.url);
            const blob = await response.blob();
            itemToSave.videoBlob = blob;
            delete itemToSave.url;
        } catch (e) {
            console.warn("Failed to capture video blob for storage", e);
        }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.put(itemToSave);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error saving to history storage:", error);
  }
};

export const loadHistoryItems = async (): Promise<GeneratedContent[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readonly');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const items = request.result.map((item: any) => {
            if (item.type === 'video' && item.videoBlob && !item.url) {
                item.url = URL.createObjectURL(item.videoBlob);
            }
            return item as GeneratedContent;
        });
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error loading history storage:", error);
    return [];
  }
};

export const updateHistoryItem = async (item: GeneratedContent): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);
      // put() replaces the record in-place, preserving the blob/video data
      const request = store.put({ ...item });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error updating history item:", error);
  }
};

export const deleteHistoryItem = async (id: string): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([HISTORY_STORE], 'readwrite');
      const store = transaction.objectStore(HISTORY_STORE);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error deleting from history storage:", error);
  }
};

// --- CUSTOM PRESETS STORE ---
export const saveCustomPreset = async (preset: CustomPreset): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PRESETS_STORE, 'readwrite');
        const store = tx.objectStore(PRESETS_STORE);
        const req = store.put(preset);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

export const loadCustomPresets = async (): Promise<CustomPreset[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PRESETS_STORE, 'readonly');
        const store = tx.objectStore(PRESETS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
};

export const deleteCustomPreset = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PRESETS_STORE, 'readwrite');
        const store = tx.objectStore(PRESETS_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};


// --- INSPIRATION STORE ---
export const saveInspirationImage = async (image: InspirationImage): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(INSPIRATION_STORE, 'readwrite');
        const store = tx.objectStore(INSPIRATION_STORE);
        // We only store the blob, not the temporary URL
        const { url, ...imageToStore } = image;
        const req = store.put(imageToStore);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

export const loadInspirationImages = async (): Promise<InspirationImage[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(INSPIRATION_STORE, 'readonly');
        const store = tx.objectStore(INSPIRATION_STORE);
        const req = store.getAll();
        req.onsuccess = () => {
            const imagesWithUrls = req.result.map((img: InspirationImage) => ({
                ...img,
                url: URL.createObjectURL(img.blob)
            }));
            resolve(imagesWithUrls);
        };
        req.onerror = () => reject(req.error);
    });
};

export const deleteInspirationImage = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(INSPIRATION_STORE, 'readwrite');
        const store = tx.objectStore(INSPIRATION_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
};

// --- DATA MANAGEMENT & EXPORT (BigQuery Support) ---

export const exportDatabaseToJson = async (): Promise<string> => {
  const items = await loadHistoryItems();
  
  const serializedItems = await Promise.all(items.map(async (item: any) => {
      const exportItem = { ...item };
      
      if (item.videoBlob) {
          exportItem.videoBase64 = await blobToBase64(item.videoBlob);
          delete exportItem.videoBlob;
          delete exportItem.url;
      } 
      else if (item.url && item.url.startsWith('blob:')) {
          try {
              const res = await fetch(item.url);
              const blob = await res.blob();
              exportItem.imageBase64 = await blobToBase64(blob);
              delete exportItem.url;
          } catch (e) { console.error(e); }
      }

      return exportItem;
  }));

  return JSON.stringify(serializedItems, null, 2);
};

export const importDatabaseFromJson = async (jsonString: string): Promise<void> => {
    try {
        const items = JSON.parse(jsonString);
        if (!Array.isArray(items)) throw new Error("Invalid format");

        const db = await initDB();
        const transaction = db.transaction([HISTORY_STORE], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE);

        for (const item of items) {
            if (item.videoBase64) {
                const res = await fetch(item.videoBase64);
                item.videoBlob = await res.blob();
                delete item.videoBase64;
            }
            if (item.imageBase64) {
                item.url = item.imageBase64;
                delete item.imageBase64;
            }

            store.put(item);
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });

    } catch (error) {
        console.error("Import failed:", error);
        throw error;
    }
};

export const exportForBigQuery = async (): Promise<string> => {
    const items = await loadHistoryItems();
    
    return items.map(item => {
        const cleanItem: any = {
            id: item.id,
            timestamp: item.timestamp,
            type: item.type,
            params: JSON.stringify(item.params),
            media_reference: item.type === 'video' ? 'VIDEO_BLOB' : 'IMAGE_DATA'
        };
        return JSON.stringify(cleanItem);
    }).join('\n');
};