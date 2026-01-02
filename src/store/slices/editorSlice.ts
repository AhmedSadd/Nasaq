import { type StateCreator } from 'zustand';
import type { AppState, EditorSlice } from './types';

export const createEditorSlice: StateCreator<AppState, [], [], EditorSlice> = (set) => ({
  content: '',
  setContent: (content) => set({ content, isDirty: true }),
  isDirty: false,
  setIsDirty: (isDirty) => set({ isDirty }),
  // التمرير المتزامن
  scrollRatio: 0,
  setScrollRatio: (scrollRatio) => set({ scrollRatio }),
});
