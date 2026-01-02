import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState } from './slices/types';
import { createEditorSlice } from './slices/editorSlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createFileSystemSlice } from './slices/fileSlice';

export const useAppStore = create<AppState>()(
  persist(
    (...a) => ({
      ...createEditorSlice(...a),
      ...createSettingsSlice(...a),
      ...createFileSystemSlice(...a),
    }),
    {
      name: 'nasaq-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist settings and maybe last open file path, but not content usually?
        // For now, let's persist settings. Content persistence depends on 'backup' strategy.
        directionMode: state.directionMode,
        theme: state.theme,
        isZenMode: state.isZenMode,
      }),
    }
  )
);
