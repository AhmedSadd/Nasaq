import { ThemeProvider } from "@/components/theme-provider"
import { MainLayout } from "@/components/layout/MainLayout"
import { Toaster } from "@/components/ui/toaster"
import { useAppStore } from "@/store/useAppStore"
import { useEffect } from "react"

import "./index.css"

function App() {
  const isDirty = useAppStore((state) => state.isDirty);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="vite-ui-theme">
      <MainLayout />
      <Toaster />
    </ThemeProvider>
  )
}

export default App

