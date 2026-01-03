import { useEffect, useRef, useCallback, useState } from 'react';
import { basicSetup } from 'codemirror';
import { EditorView, keymap, type Command } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { search, openSearchPanel } from '@codemirror/search';
import { useAppStore } from '@/store/useAppStore';
import { useFileSystem } from '@/hooks/useFileSystem';
import { directionCompartment, getDirectionExtension } from '@/lib/editor-extensions/direction-conf';

/**
 * مكون EditorWrapper
 * يغلف محرر CodeMirror ويوفر منطق التمرير المتزامن واختصارات التنسيق
 */
export function EditorWrapper() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const content = useAppStore(state => state.content);
  const setContent = useAppStore(state => state.setContent);
  const scrollRatio = useAppStore(state => state.scrollRatio);
  const setScrollRatio = useAppStore(state => state.setScrollRatio);
  const currentFile = useAppStore(state => state.currentFile);
  const directionMode = useAppStore(state => state.directionMode);
  const syncScrollEnabled = useAppStore(state => state.syncScrollEnabled);
  const { saveCurrentFile } = useFileSystem();

  // متغير لتتبع آخر ملف تم تحميله
  const lastLoadedFileRef = useRef<string | null>(null);
  const isExternalUpdateRef = useRef(false);
  const isScrollingByMeRef = useRef(false);

  // دالة مساعدة لتنسيق النص المحدد في CodeMirror (للاستخدام مع Keymap)
  const createFormattingCommand = (prefix: string, suffix: string = prefix): Command => {
    return (view: EditorView) => {
      const { state } = view;
      const { from, to } = state.selection.main;
      const selectedText = state.doc.sliceString(from, to);
      
      view.dispatch({
        changes: {
          from,
          to,
          insert: `${prefix}${selectedText}${suffix}`
        },
        selection: {
          anchor: from + prefix.length,
          head: to + prefix.length
        },
        scrollIntoView: true
      });
      return true;
    };
  };

  // دالة الحفظ كـ Command
  const saveCommand: Command = () => {
    saveCurrentFile();
    return true;
  };

  // دالة لتحديث محتوى المحرر من الخارج (عند فتح ملف مثلاً)
  const updateEditorContent = useCallback((newContent: string) => {
    if (!viewRef.current) return;
    
    isExternalUpdateRef.current = true;
    const currentContent = viewRef.current.state.doc.toString();
    
    if (currentContent !== newContent) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: newContent
        }
      });
    }
    
    setTimeout(() => {
      isExternalUpdateRef.current = false;
    }, 50);
  }, []);

  // إنشاء المحرر مرة واحدة عند التحميل
  useEffect(() => {
    if (!editorRef.current) return;

    const extensions = [
      basicSetup,
      markdown(),
      search({ top: true }),
      Prec.highest(
        keymap.of([
          { key: 'Mod-b', run: createFormattingCommand('**'), preventDefault: true },
          { key: 'Mod-i', run: createFormattingCommand('*'), preventDefault: true },
          { key: 'Mod-k', run: createFormattingCommand('[', '](url)'), preventDefault: true },
          { key: 'Mod-e', run: createFormattingCommand('`'), preventDefault: true },
          { key: 'Mod-Alt-c', run: createFormattingCommand('```\n', '\n```'), preventDefault: true },
          { key: 'Mod-s', run: saveCommand, preventDefault: true },
          { key: 'Mod-f', run: (view) => { openSearchPanel(view); return true; }, preventDefault: true }
        ])
      ),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isExternalUpdateRef.current) {
          const text = update.state.doc.toString();
          setContent(text);
        }
      }),
      directionCompartment.of(getDirectionExtension(directionMode)),
    ];

    const state = EditorState.create({
      doc: content,
      extensions
    });

    const view = new EditorView({
      state,
      parent: editorRef.current
    });

    viewRef.current = view;
    lastLoadedFileRef.current = currentFile;
    setIsEditorReady(true);

    return () => {
      view.destroy();
      setIsEditorReady(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

   // إدارة مزامنة التمرير ثنائية الاتجاه مع منع حلقة التكرار (Scroll Jitter Fix)
  const lastScrollTimeRef = useRef(0);
  const lastScrollSourceRef = useRef<'editor' | 'preview' | null>(null);

  useEffect(() => {
    if (!isEditorReady || !viewRef.current) return;
    
    const scrollElement = viewRef.current.scrollDOM;
    const { syncScrollEnabled: enabled } = useAppStore.getState();
    
    // تأكد من أن التحديث قادم من المعاينة وليس انعكاساً لتمرير المحرر نفسه
    if (enabled && lastScrollSourceRef.current === 'preview') {
      const scrollHeight = scrollElement.scrollHeight - scrollElement.clientHeight;
      if (scrollHeight > 0) {
        scrollElement.scrollTop = scrollRatio * scrollHeight;
      }
      // تصفير المصدر بعد الانتهاء لتجنب القفل الدائم
      setTimeout(() => { lastScrollSourceRef.current = null; }, 50);
    }
  }, [scrollRatio, isEditorReady, syncScrollEnabled]);

  useEffect(() => {
    if (!isEditorReady || !viewRef.current) return;
    const scrollElement = viewRef.current.scrollDOM;

    const handleScroll = () => {
      const now = Date.now();
      const { syncScrollEnabled: enabled } = useAppStore.getState();
      
      // إذا كان التثبيت قادم من المعاينة حالياً، لا نرسل تحديثاً مضاداً
      if (enabled && isScrollingByMeRef.current && lastScrollSourceRef.current !== 'preview') {
        const scrollTop = scrollElement.scrollTop;
        const scrollHeight = scrollElement.scrollHeight - scrollElement.clientHeight;
        
        if (scrollHeight > 0) {
          lastScrollTimeRef.current = now;
          lastScrollSourceRef.current = 'editor';
          const ratio = scrollTop / scrollHeight;
          setScrollRatio(ratio);
        }
      }
    };
    
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [isEditorReady, setScrollRatio, syncScrollEnabled]);

  // تحديث المحرر عند تغيير الملف الحالي
  useEffect(() => {
    if (currentFile !== lastLoadedFileRef.current) {
      lastLoadedFileRef.current = currentFile;
      updateEditorContent(content);
    }
  }, [currentFile, content, updateEditorContent]);

  // ========== [جديد] مزامنة المحرر مع التغييرات الخارجية (من المعاينة) ==========
  const lastExternalContentRef = useRef<string>(content);
  useEffect(() => {
    // إذا تغير content في الـ Store ولم يكن التغيير من المحرر نفسه
    if (content !== lastExternalContentRef.current && !isExternalUpdateRef.current) {
      // التحقق من أن المحتوى الحالي للمحرر مختلف عن الجديد
      const editorCurrentContent = viewRef.current?.state.doc.toString() || '';
      if (editorCurrentContent !== content) {
        updateEditorContent(content);
      }
      lastExternalContentRef.current = content;
    }
  }, [content, updateEditorContent]);

  // تحديث اتجاه النص تفاعلياً
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: directionCompartment.reconfigure(getDirectionExtension(directionMode))
      });
    }
  }, [directionMode]);

  // إبقاء مستمع الأحداث العام لبعض الحالات الاستثنائية
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // إذا كان التركيز خارج المحرر، قد نحتاج لحفظ الملف أو غيره
      if (document.activeElement?.closest('.cm-editor')) return;

      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveCurrentFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentFile]);

  return (
    <div 
      ref={editorRef} 
      className="h-full w-full overflow-hidden text-base relative" 
      onMouseEnter={() => { isScrollingByMeRef.current = true; }}
      onMouseLeave={() => { isScrollingByMeRef.current = false; }}
    />
  );
}
