import { useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { toast } from '@/hooks/use-toast';
import { get, set, del } from 'idb-keyval';

export function useFileSystem() {
  const { 
    setRootHandle, 
    rootHandle, 
    setCurrentFile,
    setFileHandle,
    setContent,
    setIsDirty,
    setScrollRatio,
    content,
    currentFile
  } = useAppStore(state => state);

  // حفظ نسخة احتياطية في IndexedDB
  const autoBackup = useCallback(async (content: string, fileName: string | null) => {
    try {
      await set('nasaq-backup-content', content);
      await set('nasaq-backup-file', fileName);
    } catch (err) {
      console.warn('Backup failed:', err);
    }
  }, []);

  // مسح النسخة الاحتياطية (عند الحفظ اليدوي الناجح مثلاً)
  const clearBackup = useCallback(async () => {
    try {
      await del('nasaq-backup-content');
      await del('nasaq-backup-file');
    } catch (err) {
      console.warn('Could not clear backup:', err);
    }
  }, []);

  // استعادة النسخة الاحتياطية
  const restoreBackup = useCallback(async () => {
    try {
      const backupContent = await get('nasaq-backup-content');
      const backupFile = await get('nasaq-backup-file');
      
      if (backupContent) {
        setContent(backupContent);
        setCurrentFile(backupFile);
        setIsDirty(true);
        toast({
          title: "تم استعادة النسخة الاحتياطية",
          description: backupFile ? `تم استعادة الملف: ${backupFile}` : "تم استعادة المحتوى غير المحفوظ",
        });
        return true;
      }
    } catch (err) {
        console.error('Restore failed:', err);
    }
    return false;
  }, [setContent, setCurrentFile, setIsDirty]);

  // تحديث النسخة الاحتياطية عند تغيير المحتوى
  useEffect(() => {
    if (content) {
      autoBackup(content, currentFile);
    }
  }, [content, currentFile, autoBackup]);

  const openDirectory = useCallback(async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setRootHandle(handle);
      console.log('Root directory opened:', handle.name);
      return handle;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error opening directory:', err);
      }
      return null;
    }
  }, [setRootHandle]);

  // ملف جديد - إفراغ المحرر لبدء كتابة محتوى جديد
  const newFile = useCallback(() => {
    setContent('');
    setCurrentFile(null);
    setIsDirty(false);
    setScrollRatio(0);
    toast({
      title: "ملف جديد",
      description: "تم إفراغ المحرر. يمكنك البدء بالكتابة.",
    });
  }, [setContent, setCurrentFile, setIsDirty, setScrollRatio]);

  // فتح ملف مفرد بدون الحاجة لفتح مجلد
  const openSingleFile = useCallback(async () => {
    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: [
          {
            description: 'Markdown files',
            accept: { 'text/markdown': ['.md', '.mdx', '.markdown'] }
          },
          {
            description: 'Text files',
            accept: { 'text/plain': ['.txt'] }
          }
        ],
        multiple: false
      });
      
      const file = await fileHandle.getFile();
      const content = await file.text();
      
      setContent(content);
      setCurrentFile(fileHandle.name);
      setFileHandle(fileHandle.name, fileHandle);
      setIsDirty(false);
      
      toast({
        title: "تم فتح الملف",
        description: fileHandle.name,
      });
      
      console.log('Opened single file:', fileHandle.name);
      return fileHandle;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error opening file:', err);
        toast({
          title: "خطأ في الفتح",
          description: `تعذر فتح الملف`,
          variant: "destructive",
        });
      }
      return null;
    }
  }, [setContent, setCurrentFile, setFileHandle, setIsDirty]);

  // حفظ كملف جديد (Save As)
  const saveAsNewFile = useCallback(async () => {
    const state = useAppStore.getState();
    const content = state.content;
    
    if (!content.trim()) {
      toast({
        title: "لا يوجد محتوى",
        description: "اكتب شيئاً أولاً قبل الحفظ",
        variant: "destructive",
      });
      return null;
    }
    
    try {
      const fileHandle = await (window as any).showSaveFilePicker({
        suggestedName: 'document.md',
        types: [
          {
            description: 'Markdown file',
            accept: { 'text/markdown': ['.md'] }
          }
        ]
      });
      
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      
      setCurrentFile(fileHandle.name);
      setFileHandle(fileHandle.name, fileHandle);
      setIsDirty(false);
      
      toast({
        title: "✓ تم الحفظ",
        description: fileHandle.name,
      });
      
      console.log('File saved as:', fileHandle.name);
      return fileHandle;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error saving file:', err);
        toast({
          title: "خطأ في الحفظ",
          description: `تعذر حفظ الملف`,
          variant: "destructive",
        });
      }
      return null;
    }
  }, [setCurrentFile, setFileHandle, setIsDirty]);

  const readFile = useCallback(async (path: string, handle: FileSystemFileHandle) => {
      try {
          const file = await handle.getFile();
          const content = await file.text();
          
          useAppStore.getState().setContent(content);
          setCurrentFile(path);
          setFileHandle(path, handle);
          useAppStore.getState().setIsDirty(false);
          
          console.log('Opened file:', path);
      } catch (err) {
          console.error('Error reading file:', err);
          toast({
            title: "خطأ في القراءة",
            description: `تعذر فتح الملف: ${path}`,
            variant: "destructive",
          });
      }
  }, [setCurrentFile, setFileHandle]);

  const saveCurrentFile = useCallback(async () => {
      const state = useAppStore.getState();
      const path = state.currentFile;
      const content = state.content;
      
      // إذا لم يكن هناك ملف مفتوح، استخدم Save As
      if (!path) {
          return saveAsNewFile();
      }
      
      const handle = state.fileHandles.get(path);
      if (!handle) {
          // لا يوجد handle، استخدم Save As
          return saveAsNewFile();
      }
      
      try {
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          state.setIsDirty(false);
          
          // مسح النسخة الاحتياطية عند نجاح الحفظ اليدوي
          clearBackup();
          
          console.log('File saved:', path);
          toast({
            title: "✓ تم الحفظ",
            description: path.split('/').pop() || path,
          });
      } catch (err) {
          console.error('Error saving file:', err);
          toast({
            title: "خطأ في الحفظ",
            description: `تعذر حفظ الملف: ${(err as Error).message}`,
            variant: "destructive",
          });
      }
  }, [saveAsNewFile, clearBackup]);

  const createFile = useCallback(async (parentHandle: FileSystemDirectoryHandle, name: string) => {
      try {
          const fileHandle = await parentHandle.getFileHandle(name, { create: true });
          console.log('File created:', name);
          return fileHandle;
      } catch (err) {
          console.error('Error creating file:', err);
          return null;
      }
  }, []);

  const createDirectory = useCallback(async (parentHandle: FileSystemDirectoryHandle, name: string) => {
      try {
          const dirHandle = await parentHandle.getDirectoryHandle(name, { create: true });
          console.log('Directory created:', name);
          return dirHandle;
      } catch (err) {
          console.error('Error creating directory:', err);
          return null;
      }
  }, []);

  const deleteEntry = useCallback(async (parentHandle: FileSystemDirectoryHandle, name: string) => {
      try {
          await parentHandle.removeEntry(name, { recursive: true });
          console.log('Entry deleted:', name);
          return true;
      } catch (err) {
          console.error('Error deleting entry:', err);
          return false;
      }
  }, []);

  const renameEntry = useCallback(async (handle: FileSystemHandle, newName: string) => {
      try {
          if ((handle as any).move) {
              await (handle as any).move(newName);
              console.log('Entry renamed (native):', newName);
              return true;
          } else {
             console.warn('Rename not supported in this browser version (requires handle.move)');
             alert('Rename is not supported in this browser. Please use Chrome 111+.');
             return false;
          }
      } catch (err) {
          console.error('Error renaming entry:', err);
          return false;
      }
  }, []);

  return {
    openDirectory,
    openSingleFile,
    saveAsNewFile,
    newFile,
    rootHandle,
    readFile,
    saveCurrentFile,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
    restoreBackup,
    clearBackup
  };
}

