// ZenBridge interface type
export interface ZenBridgeFile {
  path: string;
  name: string;
  size: number;
  type?: string;
  data?: ArrayBuffer;
}

export interface ZenBridge {
  isElectron: boolean;
  platform?: string;
  getVersion?: () => string;

  // File operations
  openFileDialog?: (options?: {
    filters?: { name: string; extensions: string[] }[];
    multiple?: boolean;
  }) => Promise<ZenBridgeFile[] | null>;

  saveFileDialog?: (options?: {
    defaultPath?: string;
    filters?: { name: string; extensions: string[] }[];
  }) => Promise<string | null>;

  readFile?: (path: string) => Promise<ArrayBuffer>;
  writeFile?: (path: string, data: ArrayBuffer) => Promise<void>;

  // Server configuration (Electron only)
  getServerUrl?: () => string;
  setServerUrl?: (url: string) => void;
}

// Get zenBridge instance
export function getZenBridge(): ZenBridge {
  if (typeof window !== 'undefined' && (window as unknown as { zenBridge?: ZenBridge }).zenBridge) {
    return (window as unknown as { zenBridge: ZenBridge }).zenBridge;
  }
  // Browser fallback
  return {
    isElectron: false,
    openFileDialog: browserOpenFileDialog,
  };
}

// Browser fallback: open file picker using <input type="file">
export async function browserOpenFileDialog(options?: {
  filters?: { name: string; extensions: string[] }[];
  multiple?: boolean;
}): Promise<ZenBridgeFile[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = options?.multiple ?? true;

    if (options?.filters?.length) {
      input.accept = options.filters.map((f) => f.extensions.join(',')).join(',');
    }

    input.onchange = async () => {
      if (!input.files?.length) {
        resolve(null);
        return;
      }

      const files: ZenBridgeFile[] = [];
      for (const file of Array.from(input.files)) {
        const data = await file.arrayBuffer();
        // Fallback to inferring type from extension if file.type is empty
        const type = file.type || getMimeTypeFromExtension(file.name);
        files.push({
          name: file.name,
          size: file.size,
          type,
          path: '', // Browser cannot get real path
          data,
        });
      }
      resolve(files);
    };

    input.click();
  });
}

// Infer MIME type from file extension
function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    txt: 'text/plain',
    json: 'application/json',
    zip: 'application/zip',
    mp3: 'audio/mpeg',
    mp4: 'video/mp4',
    wav: 'audio/wav',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
