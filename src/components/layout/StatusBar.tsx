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
    <div className="h-7 border-t bg-background/50 backdrop-blur-lg flex items-center justify-between px-4 text-[10px] sm:text-xs text-muted-foreground select-none shrink-0 shadow-[0_-1px_3px_rgba(0,0,0,0.02)] transition-all duration-300">
      <div className="flex items-center gap-6">
        <span className="flex items-center gap-1.5 group cursor-default">
          <FileText className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" />
          <span className="font-medium">{stats.lines}</span> أسطر
        </span>
        <span className="flex items-center gap-1.5 group cursor-default">
          <Hash className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" />
          <span className="font-medium">{stats.words}</span> كلمات
        </span>
        <span className="flex items-center gap-1.5 group cursor-default">
          <Type className="w-3 h-3 text-primary/50 group-hover:text-primary transition-colors" />
          <span className="font-medium">{stats.chars}</span> أحرف
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10 flex items-center gap-1.5 hover:bg-primary/10 transition-colors cursor-pointer">
           <directionLabel.icon className="w-3 h-3" />
           <span className="font-bold">{directionLabel.label}</span>
        </div>
        <div className="h-3 w-[1px] bg-muted-foreground/20 mx-1" />
        <span className="text-muted-foreground/40 font-mono tracking-tight">UTF-8</span>
      </div>
    </div>
  );
}
