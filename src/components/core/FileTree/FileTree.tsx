import { FileTreeItem } from './FileTreeItem';
import { useFileSystem } from '@/hooks/useFileSystem';
import { Button } from '@/components/ui/button';
import { FolderOpen, FilePlus, FolderPlus, RotateCcw, File as FileIcon, ChevronRight, ChevronsDown, ChevronsUp } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';

export function FileTree() {
  const { rootHandle, openDirectory, openSingleFile, createFile, createDirectory } = useFileSystem();
  const [refreshKey, setRefreshKey] = useState(0);
  const [collapseSignal, setCollapseSignal] = useState(0);
  const [expandSignal, setExpandSignal] = useState(0);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');

  const refreshAction = useCallback(() => setRefreshKey(prev => prev + 1), []);
  const collapseAll = useCallback(() => setCollapseSignal(prev => prev + 1), []);
  const expandAll = useCallback(() => setExpandSignal(prev => prev + 1), []);

  const handleCreateFile = () => {
    if (!rootHandle) return;
    setIsCreating('file');
  };

  const handleCreateFolder = () => {
    if (!rootHandle) return;
    setIsCreating('folder');
  };

  const submitCreate = async (e: React.FormEvent | React.FocusEvent) => {
      if (e) (e as any).preventDefault?.();
      if (!isCreating || !newName.trim() || !rootHandle) {
          setIsCreating(null);
          setNewName('');
          return;
      }

      try {
          if (isCreating === 'file') {
              await createFile(rootHandle, newName.trim());
          } else {
              await createDirectory(rootHandle, newName.trim());
          }
          setIsCreating(null);
          setNewName('');
          refreshAction();
      } catch (err) {
          console.error("Creation failed:", err);
          setIsCreating(null);
      }
  };

  if (!rootHandle) {
    return (
      <div className="flex flex-col items-center justify-center p-4 h-full text-center gap-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-primary/20 bg-background/50 p-1 shadow-md mb-2 animate-pulse">
           <img src="./pwa-192x192.png" alt="Nasaq Logo" className="w-full h-full object-contain" />
        </div>
        <h3 className="font-bold text-foreground font-cairo text-lg">مرحباً بك في نسق</h3>
        <p className="text-muted-foreground text-sm mb-2">ابدأ بفتح ملف أو مجلد</p>
        
        <div className="flex flex-col gap-2 w-full max-w-[180px]">
          <Button onClick={openSingleFile} variant="default" size="sm" className="gap-2 w-full">
             <FileIcon className="w-4 h-4" />
             فتح ملف
          </Button>
          <Button onClick={openDirectory} variant="outline" size="sm" className="gap-2 w-full">
             <FolderOpen className="w-4 h-4" />
             فتح مجلد
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground/60 mt-4">
          أو اسحب ملفاً وأفلته هنا
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full p-2 flex flex-col animate-nasaq-fade">
        <div className="mb-3 flex items-center justify-between px-2 gap-1 shrink-0 flex-wrap">
            <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] truncate flex-1 min-w-[60px] select-none" title={rootHandle.name}>
              {rootHandle.name}
            </span>
            <div className="flex items-center gap-0.5 bg-muted/30 p-0.5 rounded-lg shadow-inner">
                <Button onClick={handleCreateFile} variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10 transition-colors" title="New File">
                    <FilePlus className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={handleCreateFolder} variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10 transition-colors" title="New Folder">
                    <FolderPlus className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={expandAll} variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10 transition-colors" title="Expand All">
                    <ChevronsDown className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={collapseAll} variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10 transition-colors" title="Collapse All">
                    <ChevronsUp className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={refreshAction} variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-primary/10 transition-colors" title="Refresh">
                    <RotateCcw className="w-3.5 h-3.5" />
                </Button>
            </div>
        </div>
        <div className="flex-1 overflow-auto">
            {isCreating && (
                <div className="px-2 py-1 flex items-center gap-1">
                    <span className="shrink-0 text-muted-foreground">
                        {isCreating === 'file' ? <FileIcon className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <form onSubmit={submitCreate} className="flex-1">
                        <input 
                          autoFocus
                          className="w-full bg-background border rounded px-1 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onBlur={submitCreate}
                          placeholder={isCreating === 'file' ? "file.md" : "folder"}
                        />
                    </form>
                </div>
            )}
            <RootsChildren 
                rootHandle={rootHandle} 
                onRefresh={refreshAction} 
                refreshTrigger={refreshKey}
                collapseSignal={collapseSignal}
                expandSignal={expandSignal}
            />
        </div>
    </div>
  );
}

function RootsChildren({ rootHandle, onRefresh, refreshTrigger, collapseSignal, expandSignal }: 
    { rootHandle: FileSystemDirectoryHandle, onRefresh: () => void, refreshTrigger: number, collapseSignal: number, expandSignal: number }) {
     const [children, setChildren] = useState<FileSystemHandle[]>([]);

     const load = useCallback(async () => {
         const handles: FileSystemHandle[] = [];
         // @ts-ignore
         for await (const entry of rootHandle.values()) {
             handles.push(entry);
         }
         handles.sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'directory' ? -1 : 1;
          });
         setChildren(handles);
     }, [rootHandle]);

     useEffect(() => {
         load();
     }, [load, refreshTrigger]);

     return (
         <div className="flex-col overflow-hidden">
            {children.map(child => (
                <FileTreeItem 
                    key={child.name} 
                    name={child.name} 
                    handle={child} 
                    path={`${rootHandle.name}/${child.name}`} 
                    parentHandle={rootHandle}
                    onRefresh={onRefresh}
                    collapseSignal={collapseSignal}
                    expandSignal={expandSignal}
                />
            ))}
         </div>
     )
}
