import { 
  FileText, 
  FileCode, 
  FileJson, 
  FileImage,
  File,
  FileType2,
  Palette,
  Settings,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileIconProps {
  filename: string;
  className?: string;
}

/**
 * مكون لعرض أيقونة الملف بناءً على امتداده
 * يدعم أنواع ملفات متعددة مع ألوان مميزة
 */
export function FileTypeIcon({ filename, className }: FileIconProps) {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const iconMap: Record<string, { icon: React.ElementType; color: string }> = {
    // Markdown
    md: { icon: FileText, color: 'text-blue-500' },
    mdx: { icon: FileText, color: 'text-blue-400' },
    
    // Code
    js: { icon: FileCode, color: 'text-yellow-500' },
    jsx: { icon: FileCode, color: 'text-yellow-400' },
    ts: { icon: FileCode, color: 'text-blue-600' },
    tsx: { icon: FileCode, color: 'text-blue-500' },
    py: { icon: FileCode, color: 'text-green-500' },
    html: { icon: FileCode, color: 'text-orange-500' },
    css: { icon: Palette, color: 'text-purple-500' },
    scss: { icon: Palette, color: 'text-pink-500' },
    
    // Data
    json: { icon: FileJson, color: 'text-yellow-600' },
    yaml: { icon: FileJson, color: 'text-red-400' },
    yml: { icon: FileJson, color: 'text-red-400' },
    xml: { icon: FileJson, color: 'text-orange-400' },
    csv: { icon: FileSpreadsheet, color: 'text-green-600' },
    
    // Config
    env: { icon: Settings, color: 'text-gray-500' },
    gitignore: { icon: Settings, color: 'text-gray-400' },
    
    // Images
    png: { icon: FileImage, color: 'text-emerald-500' },
    jpg: { icon: FileImage, color: 'text-emerald-500' },
    jpeg: { icon: FileImage, color: 'text-emerald-500' },
    gif: { icon: FileImage, color: 'text-emerald-500' },
    svg: { icon: FileImage, color: 'text-orange-400' },
    webp: { icon: FileImage, color: 'text-emerald-400' },
    
    // Text
    txt: { icon: FileType2, color: 'text-gray-500' },
    log: { icon: FileType2, color: 'text-gray-400' },
  };
  
  const config = iconMap[extension] || { icon: File, color: 'text-muted-foreground/70' };
  const IconComponent = config.icon;
  
  return (
    <IconComponent className={cn('w-4 h-4', config.color, className)} />
  );
}
