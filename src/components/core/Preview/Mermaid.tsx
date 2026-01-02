import { useEffect, useRef } from "react"
import mermaid from "mermaid"
import { useTheme } from "next-themes"

interface MermaidProps {
  chart: string
}

export const Mermaid = ({ chart }: MermaidProps) => {
  const { theme } = useTheme()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: theme === "dark" ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "inherit",
    })
  }, [theme])

  useEffect(() => {
    if (ref.current && chart) {
      ref.current.removeAttribute("data-processed")
      try {
          mermaid.contentLoaded()
      } catch (e) {
          console.error("Mermaid error:", e)
      }
    }
  }, [chart])

  return (
    <div key={theme + chart} className="mermaid flex justify-center py-4 overflow-x-auto bg-muted/50 rounded-lg my-4" ref={ref}>
      {chart}
    </div>
  )
}
