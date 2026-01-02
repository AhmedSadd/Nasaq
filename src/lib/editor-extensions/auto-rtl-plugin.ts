import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate, Decoration, type DecorationSet } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const RTL_REGEX = /^[\u0590-\u05ff\u0600-\u06ff\u0700-\u074f\u0800-\u083f\u08a0-\u08ff\ufb1d-\ufdfd\ufe70-\ufefc]/;

// Optimization: Check only if line starts with specific characters that denote Markdown blocks
const SKIPPABLE_PREFIXES = /^(\s*[-*+]|\s*\d+\.|\s*>|\s*#+)\s+/;

function getDirForLine(text: string): 'rtl' | 'ltr' | null {
  const cleanText = text.replace(SKIPPABLE_PREFIXES, '').trim();
  if (!cleanText) return null;
  return RTL_REGEX.test(cleanText) ? 'rtl' : 'ltr';
}

const rtlTheme = EditorView.theme({
  "& .cm-line-rtl": { direction: "rtl", textAlign: "right" },
  "& .cm-line-ltr": { direction: "ltr", textAlign: "left" }
});

const rtlDeco = Decoration.line({
  attributes: { class: "cm-line-rtl" }
});

const ltrDeco = Decoration.line({
  attributes: { class: "cm-line-ltr" }
});

const autoRTLViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      
      // Iterate strictly over visible ranges to save CPU
      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = view.state.doc.lineAt(pos);
          const dir = getDirForLine(line.text);
          
          if (dir === 'rtl') {
            builder.add(line.from, line.from, rtlDeco);
          } else if (dir === 'ltr') {
             builder.add(line.from, line.from, ltrDeco);
          }
          
          pos = line.to + 1;
        }
      }
      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations
  }
);

export const autoRTLPlugin: Extension = [
  rtlTheme,
  autoRTLViewPlugin
];
