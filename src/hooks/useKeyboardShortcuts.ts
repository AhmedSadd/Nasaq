import { useHotkeys } from 'react-hotkeys-hook';
import { useFileSystem } from './useFileSystem';
import { useAppStore } from '@/store/useAppStore';

/**
 * هوك للتعامل مع اختصارات لوحة المفاتيح
 * يوفر اختصارات سريعة للعمليات الشائعة
 */
export function useKeyboardShortcuts() {
  const { saveCurrentFile } = useFileSystem();
  const toggleZenMode = useAppStore(state => state.toggleZenMode);
  const currentFile = useAppStore(state => state.currentFile);

  // Ctrl+S / Cmd+S - حفظ الملف
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    if (currentFile) {
      saveCurrentFile();
    }
  }, { enableOnFormTags: true });

  // Ctrl+Shift+Z / Cmd+Shift+Z - وضع التركيز
  useHotkeys('mod+shift+z', (e) => {
    e.preventDefault();
    toggleZenMode();
  }, { enableOnFormTags: true });

  // F11 - وضع ملء الشاشة
  useHotkeys('f11', (e) => {
    e.preventDefault();
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  });
}
