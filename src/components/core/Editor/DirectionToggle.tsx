import { Button } from "@/components/ui/button"
import { useAppStore } from "@/store/useAppStore"
import { cn } from "@/lib/utils"

export function DirectionToggle() {
    const { directionMode, setDirection } = useAppStore(state => state);

    return (
        <div className="flex items-center border rounded-md p-1 gap-1">
             <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-7 px-2 text-xs", directionMode === 'auto' && "bg-muted font-bold")}
                onClick={() => setDirection('auto')}
             >
                Auto
             </Button>
             <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-7 px-2 text-xs", directionMode === 'rtl' && "bg-muted font-bold")}
                onClick={() => setDirection('rtl')}
             >
                RTL
             </Button>
             <Button 
                variant="ghost" 
                size="sm" 
                className={cn("h-7 px-2 text-xs", directionMode === 'ltr' && "bg-muted font-bold")}
                onClick={() => setDirection('ltr')}
             >
                LTR
             </Button>
        </div>
    )
}
