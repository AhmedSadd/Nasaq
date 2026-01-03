export type DirectionMode = 'auto' | 'rtl' | 'ltr';

export interface EditorSlice {
  content: string;
  setContent: (content: string) => void;
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  // التمرير المتزامن
  scrollRatio: number;
  setScrollRatio: (ratio: number) => void;
}

export type AppTheme = 'light' | 'dark' | 'system' | 'nord' | 'dracula' | 'catppuccin' | 'rose-pine';

export interface SettingsSlice {
  directionMode: DirectionMode;
  toggleDirection: () => void;
  setDirection: (mode: DirectionMode) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  isZenMode: boolean;
  toggleZenMode: () => void;
  // التمرير المتزامن
  syncScrollEnabled: boolean;
  toggleSyncScroll: () => void;
}

export interface FileSystemSlice {
  currentFile: string | null;
  setCurrentFile: (path: string | null) => void;
  rootHandle: FileSystemDirectoryHandle | null;
  setRootHandle: (handle: FileSystemDirectoryHandle | null) => void;
  fileHandles: Map<string, FileSystemFileHandle>;
  setFileHandle: (path: string, handle: FileSystemFileHandle) => void;
}

export type AppState = EditorSlice & SettingsSlice & FileSystemSlice;

