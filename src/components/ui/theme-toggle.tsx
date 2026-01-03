import { Moon, Sun, Palette, Check } from "lucide-react"
import { useAppStore } from "@/store/useAppStore"
import type { AppTheme } from "@/store/slices/types"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  const themes: { id: AppTheme, label: string, color?: string }[] = [
    { id: "light", label: "فاتح" },
    { id: "dark", label: "داكن" },
    { id: "system", label: "النظام" },
    { id: "nord", label: "Nord | نورد", color: "bg-[#81A1C1]" },
    { id: "dracula", label: "Dracula | دراكولا", color: "bg-[#FF79C6]" },
    { id: "catppuccin", label: "Catppuccin | قطا", color: "bg-[#C6A0F6]" },
    { id: "rose-pine", label: "Rose Pine | بين", color: "bg-[#EBBCBA]" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full relative group">
          <Palette className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="sr-only">Choose theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 font-cairo">
        <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase px-2 py-1.5">
          إعدادات المظهر (Themes)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {themes.map((t) => (
          <DropdownMenuItem 
            key={t.id} 
            onClick={() => setTheme(t.id)}
            className={cn(
               "flex items-center justify-between gap-2 cursor-pointer",
               theme === t.id && "bg-accent text-accent-foreground font-semibold"
            )}
          >
            <div className="flex items-center gap-2">
              {t.color ? (
                <div className={cn("w-3 h-3 rounded-full border border-primary/10", t.color)} />
              ) : (
                 t.id === 'light' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />
              )}
              <span>{t.label}</span>
            </div>
            {theme === t.id && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
