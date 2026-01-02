import { type StateCreator } from 'zustand';
import type { AppState, SettingsSlice } from './types';

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  directionMode: 'auto',
  toggleDirection: () =>
    set((state) => {
      const modes: ('auto' | 'rtl' | 'ltr')[] = ['auto', 'rtl', 'ltr'];
      const nextIndex = (modes.indexOf(state.directionMode) + 1) % modes.length;
      return { directionMode: modes[nextIndex] };
    }),
  setDirection: (mode) => set({ directionMode: mode }),
  theme: 'system',
  setTheme: (theme) => set({ theme }),
  isZenMode: false,
  toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),
  // التمرير المتزامن
  syncScrollEnabled: true,
  toggleSyncScroll: () => set((state) => ({ syncScrollEnabled: !state.syncScrollEnabled })),
});
