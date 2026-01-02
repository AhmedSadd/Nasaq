import { useRef } from 'react';
import { EditorView } from '@codemirror/view';
import { findNext, findPrevious } from '@codemirror/search';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowUp, ArrowDown, X } from "lucide-react";

interface SearchPanelProps {
  view: EditorView | null;
  onClose: () => void;
}

export function SearchPanel({ view, onClose }: SearchPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (!view) return null;

  // Ideally, this component interacts with the CM search state. 
  // CodeMirror's default search UI is self-contained. 
  // To replace it, we use `search({ createPanel: ... })` config OR just external controls calling commands.
  // The Phase 3 plan suggests "Custom UI... buttons for Next, Previous". 
  // We can just call the commands `findNext(view)`, etc.
  // But we need to feed the search query to the editor state.
  // The standard way is using `SearchQuery` from @codemirror/search but it's not always exported for external manipulation easily.
  // A simpler MVP approach: Use the default panel for now OR customized css.
  // BUT the user asked for "Custom UI".
  // Let's implement a detached panel that calls search commands.
  // Note: `openSearchPanel` opens the *internal* panel.
  // We want to build our own.
  
  // Implementation constraints: Without deeply hacking CM search, building a fully custom external search 
  // that highlights regex matches properly requires re-implementing `find` logic or getting deep into `searchCursor`.
  //
  // FOR NOW: We will implement the UI and wiring it to 'findNext' might strictly require the *internal* query state to be set.
  // If we can't easily set the internal query, we might just style the internal panel to look like "Nasaq" design.
  //
  // Alternative: The `search` extension accepts a `createPanel` option!
  // We can pass a function that returns our DOM element.
  // However, that DOM element lives inside the editor.
  //
  // Let's create a Floating React Portal or just an overlay component in EditorWrapper.
  
  return (
    <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 p-2 bg-background border rounded-lg shadow-lg w-80">
        <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input 
                ref={inputRef} 
                placeholder="Find..." 
                className="h-8" 
                onChange={() => {
                    // Logic to update search query in CM
                    // This is complex without direct access to SearchQuery state
                }}
            />
            <div className="flex items-center">
                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => findPrevious(view)}><ArrowUp className="w-4 h-4" /></Button>
                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => findNext(view)}><ArrowDown className="w-4 h-4" /></Button>
                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}><X className="w-4 h-4" /></Button>
            </div>
        </div>
        {/* Replace section placeholder */}
    </div>
  );
}
