import type { PresetId } from '../presets/types';

export type EditorWorkflowStep = { label: 'Import' | 'Align' | 'Difference' | 'Lens' | 'Export'; meta: string };

const differenceLensWorkflow: EditorWorkflowStep[] = [
  { label: 'Import', meta: '2 assets' },
  { label: 'Align', meta: 'Auto matched' },
  { label: 'Difference', meta: 'Mask ready' },
  { label: 'Lens', meta: 'Interactive' },
  { label: 'Export', meta: 'Commercial ZIP' },
];
const sweepWorkflow: EditorWorkflowStep[] = [
  { label: 'Import', meta: '2 assets' },
  { label: 'Align', meta: 'Auto matched' },
  { label: 'Lens', meta: 'Sweep motion' },
  { label: 'Export', meta: 'Commercial ZIP' },
];
const transformWorkflow: EditorWorkflowStep[] = [
  { label: 'Import', meta: '2 assets' },
  { label: 'Align', meta: 'Auto matched' },
  { label: 'Lens', meta: 'Loop motion' },
  { label: 'Export', meta: 'Mobile bundle' },
];

export function getEditorWorkflow(presetId: PresetId): EditorWorkflowStep[] {
  if (presetId === 'difference-lens') return differenceLensWorkflow;
  if (presetId === 'portal-reveal') return differenceLensWorkflow;
  if (presetId === 'before-after-sweep') return sweepWorkflow;
  if (presetId === 'transformation-loop') return transformWorkflow;
  return differenceLensWorkflow;
}
