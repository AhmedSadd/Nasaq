import { type StateCreator } from 'zustand';
import type { AppState, FileSystemSlice } from './types';

export const createFileSystemSlice: StateCreator<AppState, [], [], FileSystemSlice> = (set) => ({
  currentFile: null,
  setCurrentFile: (path) => set({ currentFile: path }),
  rootHandle: null,
  setRootHandle: (handle) => set({ rootHandle: handle }),
  fileHandles: new Map(),
  setFileHandle: (path, handle) => 
    set((state) => ({ 
      fileHandles: new Map(state.fileHandles).set(path, handle) 
    })),
});
