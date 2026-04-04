// ZenBridge interface type
export interface ZenBridgeFile {
  path: string;
  name: string;
  size: number;
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
        files.push({
          name: file.name,
          size: file.size,
          path: '', // Browser cannot get real path
          data,
        });
      }
      resolve(files);
    };

    input.click();
  });
}
