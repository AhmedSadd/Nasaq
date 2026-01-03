import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import rehypeSlug from "rehype-slug"
import rehypeRaw from "rehype-raw"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import { useAppStore } from "@/store/useAppStore"
import { Mermaid } from "./Mermaid"
import { Check, Copy } from "lucide-react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { useFileSystem as useHooksFileSystem } from "@/hooks/useFileSystem"
import { AlertTriangle, FolderOpen } from "lucide-react"

/**
 * دالة مساعدة لاستخراج النص الصافي من عناصر React المتداخلة
 */
function flattenText(content: any): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(flattenText).join('');
  if (content?.props?.children) return flattenText(content.props.children);
  return '';
}

// تعديل المخطط الأمني للسماح بالمدخلات والصور المحلية
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'mermaid', 'input'],
  protocols: {
    ...defaultSchema.protocols,
    src: ['http', 'https', 'blob', 'data'],
  },
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'dir', 'translate', 'align', 'data-line'],
    'img': [...(defaultSchema.attributes?.['img'] || []), 'src', 'alt', 'title', 'width', 'height'],
    'input': ['type', 'checked', 'className', 'onChange', 'data-line'], 
  }
}

/**
 * Plugin بسيط لحفظ رقم السطر قبل أن يحذفه التطهير (Sanitize)
 */
const rehypePreserveLines = () => (tree: any) => {
    const walk = (node: any) => {
        if (node.type === 'element' && node.tagName === 'input' && node.properties?.type === 'checkbox') {
            if (node.position?.start?.line) {
                node.properties['data-line'] = node.position.start.line;
            }
        }
        if (node.children) node.children.forEach(walk);
    };
    walk(tree);
};

function CopyButton({ text }: { text: string }) {
  const [isCopied, setIsCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/50 backdrop-blur hover:bg-background/80" onClick={copy} title="Copy Code">
      {isCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  )
}

import "highlight.js/styles/github-dark.css"

export function MarkdownPreview() {
  const content = useAppStore((state) => state.content)
  const setContent = useAppStore((state) => state.setContent)
  const directionMode = useAppStore((state) => state.directionMode)
  const scrollRatio = useAppStore((state) => state.scrollRatio)
  const syncScrollEnabled = useAppStore((state) => state.syncScrollEnabled)
  const currentFile = useAppStore((state) => state.currentFile)
  const rootHandle = useAppStore((state) => state.rootHandle)

  const { openDirectory } = useHooksFileSystem(); 
  
  const [localImageUrls, setLocalImageUrls] = useState<Record<string, string>>({})
  const [hasBlockedImages, setHasBlockedImages] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null)
  const isScrollingByMeRef = useRef(false)


  const dir = directionMode === 'auto' ? 'auto' : directionMode

  // دالة لمعالجة المسارات (Path Resolver)
  const resolvePath = (basePath: string, relativePath: string) => {
    const stack = basePath.split('/').filter(Boolean);
    const parts = relativePath.split('/').filter(Boolean);
    
    for (const part of parts) {
      if (part === '.') continue;
      if (part === '..') {
        stack.pop();
      } else {
        stack.push(part);
      }
    }
    return stack.join('/');
  };

  // معالجة الصور المحلية
  useEffect(() => {
    if (!currentFile || !rootHandle) return;
    
    const imgMatches = Array.from(content.matchAll(/!\[.*?\]\((?!https?:\/\/)(.*?)\)/g));
    const localPaths = Array.from(new Set(imgMatches.map(m => m[1])));
    
    if (localPaths.length > 0 && !rootHandle) {
        setHasBlockedImages(true);
        return;
    } else {
        setHasBlockedImages(false);
    }

    if (localPaths.length === 0) return;

    const currentFileParts = currentFile.replace(/\\/g, '/').split('/');
    currentFileParts.shift();
    currentFileParts.pop();
    const currentDirPath = currentFileParts.join('/');

    localPaths.forEach(async (relPath) => {
        if (localImageUrls[relPath]) return;
        
        const rawRelPath = relPath.trim().replace(/\\/g, '/');
        const resolvedPathFromRoot = resolvePath(currentDirPath, rawRelPath);
        
        let targetHandle: FileSystemFileHandle | undefined;

        try {
            const pathParts = resolvedPathFromRoot.split('/').filter(Boolean);
            let currentDirHandle = rootHandle;
            
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    targetHandle = await currentDirHandle.getFileHandle(part);
                } else {
                    currentDirHandle = await currentDirHandle.getDirectoryHandle(part);
                }
            }
        } catch (err) {
            console.warn(`Image traversal failed for ${resolvedPathFromRoot}`, err);
        }

        if (targetHandle instanceof FileSystemFileHandle) {
            try {
                const file = await targetHandle.getFile();
                const url = URL.createObjectURL(file);
                setLocalImageUrls(prev => ({ ...prev, [relPath]: url }));
            } catch (e) {
                console.error("Failed to create blob for image:", resolvedPathFromRoot, e);
            }
        }
    });

    return () => {};
  }, [content, currentFile, rootHandle]);

  const handleCheckboxAtLine = useCallback((lineNum: number, checked: boolean) => {
    console.log(`[Checkbox Debug] Target Line: ${lineNum}, New Status: ${checked}`);
    
    // التعامل مع فواصل الأسطر المختلفة
    const lines = content.split(/\r?\n/);
    const lineIndex = lineNum - 1;
    let targetIdx = -1;
    
    // البحث عن أقرب سطر يحتوي على مربع (تسامح 3 أسطر)
    const listRegex = /^\s*[-*+]\s+\[([ xX])\]/;
    
    for (let offset = 0; offset <= 3; offset++) {
        for (let sign of [1, -1]) {
            if (offset === 0 && sign === -1) continue;
            const idx = lineIndex + (offset * sign);
            if (idx >= 0 && idx < lines.length && listRegex.test(lines[idx])) {
                targetIdx = idx;
                break;
            }
        }
        if (targetIdx !== -1) break;
    }

    if (targetIdx !== -1) {
      console.log(`[Checkbox Debug] Found task at content line ${targetIdx + 1}`);
      const line = lines[targetIdx];
      const newLine = line.replace(/\[([ xX])\]/, `[${checked ? 'x' : ' '}]`); // استبدال أول ظهور
      
      if (newLine !== line) {
        lines[targetIdx] = newLine;
        setContent(lines.join('\n'));
        console.log(`[Checkbox Debug] Content updated at line ${targetIdx + 1}`);
      }
    } else {
        console.error(`[Checkbox Debug] ERROR: Could not find task pattern near line ${lineNum}`);
    }
  }, [content, setContent]);

  useEffect(() => {
    if (!previewRef.current || !syncScrollEnabled || isScrollingByMeRef.current) return;
    const element = previewRef.current;
    const scrollHeight = element.scrollHeight - element.clientHeight;
    if (scrollHeight > 0) {
      element.scrollTop = scrollRatio * scrollHeight;
    }
  }, [scrollRatio, syncScrollEnabled, content]);

  useEffect(() => {
    if (!previewRef.current) return;
    const element = previewRef.current;
    const handleScroll = () => {
      if (!syncScrollEnabled || !isScrollingByMeRef.current) return;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      if (scrollHeight > 0) {
        const ratio = element.scrollTop / scrollHeight;
        useAppStore.getState().setScrollRatio(ratio);
      }
    };
    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [syncScrollEnabled]);



  return (
    <div className="h-full flex flex-col relative">
      {hasBlockedImages && (
         <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 p-3 flex items-center justify-between gap-3 text-sm text-amber-800 dark:text-amber-200 shrink-0">
             <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>الصور المحلية لا تظهر لأنك قمت بفتح ملف واحد فقط. المتصفح يحتاج لإذن الوصول للمجلد كاملاً.</span>
             </div>
             <Button onClick={openDirectory} variant="outline" size="sm" className="h-7 gap-2 bg-background border-amber-200 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/50">
                <FolderOpen className="w-3.5 h-3.5" />
                فتح مجلد المشروع
             </Button>
         </div>
      )}
    <div 
      ref={previewRef}
      className="flex-1 w-full overflow-auto p-6 prose prose-slate dark:prose-invert max-w-none scroll-smooth"
      dir={dir}
      translate="no"
      onMouseEnter={() => { isScrollingByMeRef.current = true }}
      onMouseLeave={() => { isScrollingByMeRef.current = false }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypePreserveLines, // يحفظ السطر قبل التطهير
          rehypeRaw, 
          [rehypeSanitize, sanitizeSchema],
          rehypeHighlight, 
          rehypeSlug
        ]}
        components={{
          a: ({ ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
          input: ({ type, checked, ...props }) => {
            const lineNum = (props as any)['data-line'];
            
            if (type === 'checkbox') {
              console.log(`[Checkbox Debug] UI Checkbox: line ${lineNum}, checked ${checked}`);
              
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={false}
                  onChange={(e) => { 
                      if (lineNum) handleCheckboxAtLine(Number(lineNum), e.target.checked); 
                  }}
                  className="cursor-pointer accent-primary align-middle mx-1 w-4 h-4"
                />
              );
            }
            return <input type={type} checked={checked} {...props} />;
          },
          img: ({ src, alt, ...props }) => {
            const displaySrc = (src && localImageUrls[src]) ? localImageUrls[src] : src;
            return (
              <img
                src={displaySrc}
                alt={alt}
                className="max-w-full h-auto rounded-lg shadow-md my-4 border bg-muted/50 text-xs italic text-muted-foreground"
                {...props}
              />
            );
          },
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const [justCopied, setJustCopied] = useState(false);
            if (language === "mermaid") return <Mermaid chart={String(children).replace(/\n$/, "")} />;
            if (isInline) {
              const handleCopy = () => {
                navigator.clipboard.writeText(String(children));
                setJustCopied(true);
                toast({ title: "تم النسخ!", duration: 1000 });
                setTimeout(() => setJustCopied(false), 600);
              }
              return (
                <code
                  onClick={handleCopy}
                  className={`cursor-pointer transition-all duration-300 border px-1.5 py-0.5 rounded ${
                    justCopied 
                    ? "copy-flash-active border-green-500 bg-green-500/20 text-green-700 dark:text-green-300 scale-110 shadow-lg ring-2 ring-green-500/20" 
                    : "hover:bg-muted-foreground/15 border-transparent"
                  }`}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="relative group my-4 text-left" dir="ltr">
                {language && <div className="absolute right-0 -top-7 bg-muted text-muted-foreground px-2 py-0.5 rounded-t text-xs">{language}</div>}
                <div className="absolute left-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"><CopyButton text={String(children)} /></div>
                <code className={className} {...props}>{children}</code>
              </div>
            );
          },
          blockquote: ({ children, ...props }) => {
            const text = flattenText(children);
            let alertColor = 'border-l-muted-foreground'
            let bgColor = 'bg-muted/30'
            const lowerText = text.toUpperCase();
            
            if (lowerText.includes('[!NOTE]')) {
              alertColor = 'border-l-blue-500'
              bgColor = 'bg-blue-500/10 dark:bg-blue-500/20'
            } else if (lowerText.includes('[!TIP]')) {
              alertColor = 'border-l-green-500'
              bgColor = 'bg-green-500/10 dark:bg-green-500/20'
            } else if (lowerText.includes('[!IMPORTANT]')) {
              alertColor = 'border-l-purple-500'
              bgColor = 'bg-purple-500/10 dark:bg-purple-500/20'
            } else if (lowerText.includes('[!WARNING]')) {
              alertColor = 'border-l-yellow-500'
              bgColor = 'bg-yellow-500/10 dark:bg-yellow-500/20'
            } else if (lowerText.includes('[!CAUTION]')) {
              alertColor = 'border-l-red-500'
              bgColor = 'bg-red-500/10 dark:bg-red-500/20'
            }
            
            return (
              <blockquote className={`border-l-4 ${alertColor} ${bgColor} p-3 my-4 rounded-r-lg relative`} {...props}>
                {children}
              </blockquote>
            )
          },
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-6 border rounded-lg">
              <table {...props} className="border-collapse w-full text-sm" />
            </div>
          ),
        }}
      >
        {content || "# مرحباً! 👋\n\nابدأ الكتابة في المحرر لرؤية المعاينة هنا."}
      </ReactMarkdown>
    </div>
  </div>
  );
}
