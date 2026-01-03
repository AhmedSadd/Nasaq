import { useState, useCallback, useEffect } from 'react';
import { ChevronRight, ChevronDown, Trash2, FilePlus, FolderPlus, Edit, Folder as FolderIcon, File as FileIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFileSystem } from '@/hooks/useFileSystem';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { FileTypeIcon } from './FileTypeIcon';

interface FileTreeItemProps {
  name: string;
  handle: FileSystemHandle;
  path: string;
  parentHandle?: FileSystemDirectoryHandle;
  onRefresh?: () => void;
  collapseSignal?: number;
  expandSignal?: number;
}

export function FileTreeItem({ name, handle, path, parentHandle, onRefresh, collapseSignal, expandSignal }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileSystemHandle[]>([]);
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(name);
  const [newName, setNewName] = useState('');
  
  const { readFile, deleteEntry, createFile, createDirectory, renameEntry } = useFileSystem(); 
  const currentFile = useAppStore(state => state.currentFile);

  const isFolder = handle.kind === 'directory';
  const isActive = path === currentFile;

  useEffect(() => {
    if (collapseSignal) setIsOpen(false);
  }, [collapseSignal]);

  useEffect(() => {
    if (expandSignal && isFolder) {
        setIsOpen(true);
    }
  }, [expandSignal, isFolder]);

  const loadChildren = useCallback(async () => {
    if (!isFolder) return;
    const dirHandle = handle as FileSystemDirectoryHandle;
    const handles: FileSystemHandle[] = [];
    // @ts-ignore
    for await (const entry of dirHandle.values()) {
      handles.push(entry);
    }
    handles.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
    setChildren(handles);
  }, [handle, isFolder]);

  useEffect(() => {
    if (isOpen && isFolder) {
      loadChildren();
    }
  }, [isOpen, isFolder, loadChildren]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!parentHandle) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete ${name}?`);
    if (confirmed) {
        const success = await deleteEntry(parentHandle, name);
        if (success && onRefresh) {
            onRefresh();
        }
    }
  };

  const handleRename = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!parentHandle || !renameValue.trim() || renameValue === name) {
          setIsRenaming(false);
          setRenameValue(name);
          return;
      }
      
      const success = await renameEntry(handle, renameValue.trim());
      if (success) {
          setIsRenaming(false);
          if (onRefresh) onRefresh();
      } else {
          setRenameValue(name);
          setIsRenaming(false);
      }
  };

  const submitCreate = async (e: React.FormEvent | React.FocusEvent) => {
      if (e) (e as any).preventDefault?.();
      if (!isCreating || !newName.trim()) {
          setIsCreating(null);
          setNewName('');
          return;
      }

      try {
          if (isCreating === 'file') {
              await createFile(handle as FileSystemDirectoryHandle, newName.trim());
          } else {
              await createDirectory(handle as FileSystemDirectoryHandle, newName.trim());
          }
          setIsCreating(null);
          setNewName('');
          if (!isOpen) setIsOpen(true);
          else loadChildren();
      } catch (err) {
          console.error("Creation failed:", err);
          setIsCreating(null);
      }
  };

  const handleCreateFile = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating('file');
  };

  const handleCreateFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreating('folder');
  };

  const handleClick = useCallback(async (e: any) => {
    e.stopPropagation();
    if (isRenaming) return; 

    if (!isFolder) {
        await readFile(path, handle as FileSystemFileHandle);
        return;
    }
    setIsOpen(!isOpen);
  }, [isOpen, isFolder, handle, path, readFile, isRenaming]);

  return (
    <div className="pl-2">
      <div 
        className={cn(
            "flex items-center gap-2 py-1.5 px-3 rounded-lg cursor-pointer transition-all duration-300 select-none group relative min-h-[32px] my-0.5 mx-1",
            isActive 
              ? "bg-primary/10 text-primary shadow-[0_0_15px_-5px_hsl(var(--primary)/0.3)] font-semibold border border-primary/20" 
              : "hover:bg-muted/40 text-muted-foreground/90 hover:text-foreground hover:translate-x-1"
        )}
        onClick={handleClick}
      >
        {isRenaming ? (
            <form onSubmit={handleRename} className="flex-1 flex items-center" onClick={e => e.stopPropagation()}>
                <input 
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={handleRename}
                    className="w-full h-6 bg-background border rounded px-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
            </form>
        ) : (
            <>
                <span className="shrink-0 text-muted-foreground/80">
                    {isFolder ? (
                        <div className="flex items-center">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <FolderIcon className={cn("w-4 h-4 ml-1 fill-yellow-500/20 text-yellow-600 dark:text-yellow-500")} />
                        </div>
                    ) : (
                        <FileTypeIcon filename={name} className="ml-5" />
                    )}
                </span>
                <span className={cn("truncate flex-1 pl-1", isFolder && "font-medium")}>
                    {name}
                </span>

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 gap-0.5 bg-background/80 backdrop-blur-sm rounded ml-auto px-1 shadow-sm border border-transparent hover:border-border">
                    {isFolder && (
                        <>
                            <Button 
                                onClick={handleCreateFile} 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 hover:text-primary"
                                title="New File"
                            >
                                <FilePlus className="w-3 h-3" />
                            </Button>
                            <Button 
                                onClick={handleCreateFolder} 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 hover:text-primary"
                                title="New Folder"
                            >
                                <FolderPlus className="w-3 h-3" />
                            </Button>
                        </>
                    )}
                    {parentHandle && (
                        <>
                            <Button 
                                onClick={(e) => { e.stopPropagation(); setIsRenaming(true); }}
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 hover:text-indigo-500"
                                title="Rename"
                            >
                                <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                                onClick={handleDelete} 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 hover:text-destructive"
                                title="Delete"
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </>
                    )}
                </div>
            </>
        )}
      </div>
      
      {isOpen && isFolder && (
        <div className="border-l border-muted/20 ml-2.5">
          {isCreating && (
              <div className="pl-2 py-1 flex items-center gap-1">
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
          {children.map((child) => (
            <FileTreeItem 
                key={child.name} 
                name={child.name} 
                handle={child} 
                path={`${path}/${child.name}`} 
                parentHandle={handle as FileSystemDirectoryHandle}
                onRefresh={loadChildren}
                collapseSignal={collapseSignal}
                expandSignal={expandSignal}
            />
          ))}
          {children.length === 0 && !isCreating && (
             <div className="pl-6 text-xs text-muted-foreground italic py-1 text-nowrap">Empty Folder</div>
          )}
        </div>
      )}
    </div>
  );
}
