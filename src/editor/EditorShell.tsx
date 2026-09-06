import type { ReactNode } from 'react';

export function EditorShell({ children }: { children: ReactNode }) {
  return <main className="app-shell">{children}</main>;
}

export function EditorStatusBar({ preset, fps, output, issues }: { preset: string; fps: number; output: string; issues: number }) {
  return <div className="editor-statusbar"><span><i className="good-dot" /> {preset}</span><span>{output}</span><span>{fps} FPS target</span><span className={issues === 0 ? 'status-pass' : 'status-warning'}>{issues === 0 ? 'No blocking issues' : `${issues} blocking issue${issues === 1 ? '' : 's'}`}</span></div>;
}
