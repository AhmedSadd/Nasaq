import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { StatusBar } from "@/components/layout/StatusBar"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { DirectionToggle } from "@/components/core/Editor/DirectionToggle"
import { EditorWrapper } from "@/components/core/Editor/EditorWrapper"
import { FileTree } from "@/components/core/FileTree/FileTree"
import { MarkdownPreview } from "@/components/core/Preview/MarkdownPreview"
import { useFileSystem } from "@/hooks/useFileSystem"
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { useAppStore } from "@/store/useAppStore"
import { Button } from "@/components/ui/button"
import { Save, FileText, Maximize2, Minimize2, Circle, FilePlus, FolderOpen, File, SplitSquareVertical, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useCallback, useEffect, Fragment } from "react"
import { toast } from "@/hooks/use-toast"

function EditorToolbar() {
    const { saveCurrentFile, saveAsNewFile, openSingleFile, openDirectory, newFile } = useFileSystem();
    const currentFile = useAppStore(state => state.currentFile);
    const isDirty = useAppStore(state => state.isDirty);
    const isZenMode = useAppStore(state => state.isZenMode);
    const toggleZenMode = useAppStore(state => state.toggleZenMode);
    
    // تقسيم المسار إلى أجزاء للعرض الهيكلي (Breadcrumbs)
    const pathParts = currentFile ? currentFile.split(/[/\\]/) : [];

    // حالة عدم وجود ملف مفتوح
    if (!currentFile) return (
        <div className="h-10 border-b flex items-center justify-between px-4 bg-muted/20 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
                <Button onClick={openSingleFile} size="sm" variant="ghost" className="h-7 px-2 gap-1.5 hover:bg-primary/10">
                    <File className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs">فتح ملف</span>
                </Button>
                <Button onClick={openDirectory} size="sm" variant="ghost" className="h-7 px-2 gap-1.5 hover:bg-primary/10">
                    <FolderOpen className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs">فتح مجلد</span>
                </Button>
            </div>
            <div className="flex items-center gap-1">
                <Button onClick={saveAsNewFile} size="sm" variant="ghost" className="h-7 px-2 gap-1.5">
                    <FilePlus className="w-3.5 h-3.5" />
                    <span className="text-xs">حفظ كـ</span>
                </Button>
                {isZenMode && (
                    <Button onClick={toggleZenMode} size="icon" variant="ghost" className="h-7 w-7" title="خروج من وضع التركيز">
                        <Minimize2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <div className="h-10 border-b flex items-center justify-between px-3 bg-card/30 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-1 overflow-hidden flex-1 group">
                <FileText className="w-4 h-4 text-primary/70 shrink-0 mr-1" />
                
                {/* شريط المسار الاحترافي (Breadcrumbs) */}
                <div className="flex items-center text-xs font-medium text-muted-foreground/60 overflow-hidden">
                    {pathParts.map((part, index) => {
                        const isLast = index === pathParts.length - 1;
                        return (
                            <Fragment key={index}>
                                <span className={cn(
                                    "truncate transition-colors",
                                    isLast ? "text-foreground max-w-[200px]" : "max-w-[100px] hover:text-muted-foreground cursor-default"
                                )}>
                                    {part}
                                </span>
                                {!isLast && <ChevronRight className="w-3 h-3 mx-0.5 shrink-0 opacity-40" />}
                            </Fragment>
                        );
                    })}
                </div>
                
                {isDirty && (
                    <div className="flex items-center ml-2 shrink-0 animate-pulse" title="تغييرات غير محفوظة">
                        <Circle className="w-2 h-2 fill-orange-500 text-orange-500" />
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-1">
                <Button onClick={newFile} size="sm" variant="ghost" className="h-7 px-2 gap-1.5 hover:bg-primary/5" title="ملف جديد">
                    <FilePlus className="w-3.5 h-3.5 opacity-70" />
                    <span className="text-xs hidden sm:inline">جديد</span>
                </Button>
                <Button onClick={openSingleFile} size="sm" variant="ghost" className="h-7 px-2 gap-1.5 hover:bg-primary/5">
                    <File className="w-3.5 h-3.5 opacity-70" />
                    <span className="text-xs hidden sm:inline">فتح</span>
                </Button>
                <Button 
                    onClick={saveCurrentFile} 
                    size="sm" 
                    variant="ghost" 
                    className={cn(
                        "h-7 px-2 gap-1.5 transition-all duration-300", 
                        isDirty ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20" : "hover:bg-primary/5"
                    )}
                >
                    <Save className="w-3.5 h-3.5" />
                    <span className="text-xs hidden sm:inline">حفظ</span>
                </Button>
                <Button onClick={saveAsNewFile} size="sm" variant="ghost" className="h-7 px-2 gap-1.5 hover:bg-primary/5">
                    <span className="text-xs hidden sm:inline">حفظ كـ...</span>
                    <FilePlus className="w-3.5 h-3.5 opacity-70" />
                </Button>
                
                {isZenMode && (
                    <Button onClick={toggleZenMode} size="icon" variant="ghost" className="h-7 w-7 ml-1" title="خروج من وضع التركيز">
                        <Minimize2 className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}

export function MainLayout() {
  const isZenMode = useAppStore(state => state.isZenMode);
  const toggleZenMode = useAppStore(state => state.toggleZenMode);
  const syncScrollEnabled = useAppStore(state => state.syncScrollEnabled);
  const toggleSyncScroll = useAppStore(state => state.toggleSyncScroll);
  const { restoreBackup } = useFileSystem();
  
  // تفعيل اختصارات لوحة المفاتيح
  useKeyboardShortcuts();

  // محاولة استعادة النسخة الاحتياطية عند بدء التشغيل
  useEffect(() => {
    restoreBackup();
  }, [restoreBackup]);

  // دعم السحب والإفلات
  const [isDragging, setIsDragging] = useState(false);
  const { setContent } = useAppStore.getState();
  const setCurrentFile = useAppStore(state => state.setCurrentFile);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // السماح فقط بملفات النص
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const text = await file.text();
        setContent(text);
        setCurrentFile(file.name);
        toast({
          title: "تم فتح الملف",
          description: file.name,
        });
      } else {
        toast({
          title: "نوع ملف غير مدعوم",
          description: "يرجى سحب ملفات نصية أو Markdown فقط",
          variant: "destructive",
        });
      }
    }
  }, [setContent, setCurrentFile]);

  return (
    <div 
      className={cn(
        "h-screen w-full bg-background text-foreground flex flex-col overflow-hidden",
        isDragging && "ring-4 ring-primary ring-inset"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Top Header / Toolbar - hidden in Zen Mode */}
      {!isZenMode && (
        <header className="h-12 border-b flex items-center justify-between px-4 shrink-0 bg-secondary/20 backdrop-blur-md">
          <div className="flex items-center gap-2">
             <span className="font-bold font-cairo text-lg text-primary tracking-wider">Nasaq</span>
          </div>
          
          <div className="flex items-center gap-2">
              <Button 
                onClick={toggleSyncScroll} 
                size="icon" 
                variant={syncScrollEnabled ? "secondary" : "ghost"} 
                className={cn("h-8 w-8 transition-all", syncScrollEnabled && "text-primary")} 
                title={syncScrollEnabled ? "تعطيل التمرير المتزامن" : "تفعيل التمرير المتزامن"}
              >
                  <SplitSquareVertical className="w-4 h-4" />
              </Button>
              <Button onClick={toggleZenMode} size="icon" variant="ghost" className="h-8 w-8" title="وضع التركيز (Zen Mode)">
                  <Maximize2 className="w-4 h-4" />
              </Button>
              <DirectionToggle />
              <ThemeToggle />
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup
          direction="horizontal"
          id="nasaq-layout-persistence"
          className="h-full w-full"
        >
          {/* File Explorer - hidden in Zen Mode */}
          {!isZenMode && (
            <>
              <ResizablePanel defaultSize={25} minSize={20} maxSize={400}>
                <FileTree />
              </ResizablePanel>
              
              <ResizableHandle withHandle />
            </>
          )}
          
          {/* Editor */}
          <ResizablePanel defaultSize={isZenMode ? 60 : 45} minSize={30}>
            <div className="h-full w-full bg-background relative flex flex-col">
               <EditorToolbar />
               <div className="flex-1 overflow-hidden relative">
                   <EditorWrapper />
               </div>
            </div>
          </ResizablePanel>
          
          <ResizableHandle withHandle />
          
          {/* Preview */}
          <ResizablePanel defaultSize={isZenMode ? 40 : 30} minSize={20}>
            <MarkdownPreview />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      {/* شريط الحالة - يظهر فقط خارج وضع التركيز */}
      {!isZenMode && <StatusBar />}
    </div>
  )
}
