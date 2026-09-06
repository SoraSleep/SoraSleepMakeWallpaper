# M1 — Mobile motion authoring

Status: **automatic lens preview implemented**

- Project schema stores `path`, `duration` and `loop` for mobile motion; older projects migrate to Guided Reveal, 8 seconds, Repeat.
- 9:16 Lens inspector provides Guided Reveal, Slow Orbit, Figure Eight and Breathe/Idle presets.
- Duration can be set from 3 to 20 seconds.
- Loop modes: Repeat and Ping Pong.
- Portrait preview drives the existing lens renderer with the selected deterministic auto-path, independent of pointer input.

Next M1 tasks: editable keyframes, dwell time, region-aware guided paths and seamless first/last-frame loop score.
