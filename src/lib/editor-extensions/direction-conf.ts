import { Compartment } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import type { DirectionMode } from '@/store/slices/types';
import { autoRTLPlugin } from './auto-rtl-plugin';

export const directionCompartment = new Compartment();

export function getDirectionExtension(mode: DirectionMode) {
  switch (mode) {
    case 'rtl':
      return [EditorView.contentAttributes.of({ dir: 'rtl' })];
    case 'ltr':
      return [EditorView.contentAttributes.of({ dir: 'ltr' })];
    case 'auto':
    default:
      return [
        EditorView.contentAttributes.of({ dir: 'auto' }),
        autoRTLPlugin
      ];
  }
}
