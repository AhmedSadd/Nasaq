import { useAppStore } from '@/store/useAppStore';
import { useMemo } from 'react';
import { FileText, Hash, Type, AlignRight, AlignLeft, Wand2 } from 'lucide-react';

/**
 * شريط الحالة - يعرض معلومات عن المستند الحالي
 * عدد الكلمات، الأحرف، الأسطر، ووضع الاتجاه
 */
export function StatusBar() {
  const content = useAppStore(state => state.content);
  const directionMode = useAppStore(state => state.directionMode);
  const currentFile = useAppStore(state => state.currentFile);

  const stats = useMemo(() => {
    if (!content) return { words: 0, chars: 0, lines: 0 };
    
    const lines = content.split('\n').length;
    const chars = content.length;
    const words = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    
    return { words, chars, lines };
  }, [content]);

  const directionLabel = {
    auto: { icon: Wand2, label: 'تلقائي' },
    rtl: { icon: AlignRight, label: 'RTL' },
    ltr: { icon: AlignLeft, label: 'LTR' },
  }[directionMode];

  if (!currentFile) return null;

  return (
    <div className="h-6 border-t bg-muted/30 flex items-center justify-between px-3 text-xs text-muted-foreground select-none shrink-0">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {stats.lines} سطر
        </span>
        <span className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          {stats.words} كلمة
        </span>
        <span className="flex items-center gap-1">
          <Type className="w-3 h-3" />
          {stats.chars} حرف
        </span>
      </div>
      
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <directionLabel.icon className="w-3 h-3" />
          {directionLabel.label}
        </span>
        <span className="text-muted-foreground/60">UTF-8</span>
      </div>
    </div>
  );
}
