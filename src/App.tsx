import { MainLayout } from "@/components/layout/MainLayout"
import { Toaster } from "@/components/ui/toaster"
import { useAppStore } from "@/store/useAppStore"
import { useEffect } from "react"

import "./index.css"

function App() {
  const isDirty = useAppStore((state) => state.isDirty);
  const theme = useAppStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // إزالة كافة الثيمات السابقة
    root.classList.remove("light", "dark");
    root.removeAttribute("data-theme");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else if (theme === "light" || theme === "dark") {
      root.classList.add(theme);
    } else {
      // للثيمات المتقدمة (Nord, Dracula, إلخ)
      root.classList.add("dark"); // معظمها داكنة أو تحتاج خلفية داكنة كأساس
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

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
    <>
      <MainLayout />
      <Toaster />
    </>
  )
}

export default App

