import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  ArrowLeftRight,
  ChevronDown,
  CircleCheck,
  Download,
  Eye,
  FolderOpen,
  Image as ImageIcon,
  Layers3,
  Maximize2,
  MousePointer2,
  RotateCcw,
  Save,
  Settings2,
  SlidersHorizontal,
  Upload,
  WandSparkles,
  Zap,
} from 'lucide-react';
import { DifferenceLensCanvas } from './DifferenceLensCanvas';
import { ParallaxCanvas } from './ParallaxCanvas';
import { DepthMapEditor } from './DepthMapEditor';
import { importImageJob } from './jobs/imageImportJob';
import { runAlignmentJob, type AlignmentMetrics } from './jobs/alignmentJob';
import { runDifferenceJob, type DifferenceResult } from './jobs/differenceJob';
import { loadAutosave, saveAutosave } from './project/autosave';
import { downloadProject, exportWallpaperPackage, readProjectFile } from './project/projectFile';
import { createProject, defaultParallaxSettings, type MaskStroke, type MotionPairProject, type ParallaxSettings, type ProjectAsset, type ProjectPreset } from './project/projectSchema';
import { validateWallpaperPackage } from './project/packageValidator';
import { validateMobileCommercialExport } from './project/mobileCommercialValidator';
import { exportMobileVideo } from './export/mobileVideoExport';
import { exportMobileVideoFallback } from './export/mobileMediaRecorderFallback';
import { downloadMobileDistributionBundle } from './export/mobileDistributionBundle';
import { ProjectsPage } from './pages/ProjectsPage';
import { PresetLibraryPage } from './pages/PresetLibraryPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { ExportCenterPage } from './pages/ExportCenterPage';
import { ExportResultPage } from './pages/ExportResultPage';
import type { AppRoute } from './app/routes';
import type { PresetId, PresetTarget } from './presets/types';
import { EditorShell, EditorStatusBar } from './editor/EditorShell';
import { EditorWorkflowRail } from './editor/EditorWorkflowRail';
import { getEditorWorkflow } from './editor/editorWorkflow';
import { getPreset } from './presets/registry';

type Step = 'Import' | 'Align' | 'Difference' | 'Lens' | 'Export';

function App() {
  const defaultAssetA: ProjectAsset = {
    name: 'wallpaper.jpg', source: '/demo/wallpaper.jpg', mimeType: 'image/jpeg',
    width: 1024, height: 1024, size: 721626, rights: 'unknown',
  };
  const defaultAssetB: ProjectAsset = {
    name: 'wallpaper-variant-pink.png', source: '/demo/wallpaper-variant-pink.png', mimeType: 'image/png',
    width: 1254, height: 1254, size: 2250633, rights: 'unknown',
  };
  const [activeStep, setActiveStep] = useState<Step>('Lens');
  const [route, setRoute] = useState<AppRoute>('projects');
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>('difference-lens');
  const [projectPreset, setProjectPreset] = useState<ProjectPreset>({ id: 'difference-lens', version: 1 });
  const [projectTarget, setProjectTarget] = useState<PresetTarget>('both');
  const [radius, setRadius] = useState(18);
  const [feather, setFeather] = useState(14);
  const [magnification, setMagnification] = useState(145);
  const [revealIntensity, setRevealIntensity] = useState(100);
  const [portalGlow, setPortalGlow] = useState(72);
  const [portalRipple, setPortalRipple] = useState(0);
  const [portalRippleEnabled, setPortalRippleEnabled] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [followSpeed, setFollowSpeed] = useState(78);
  const [mobileMotion, setMobileMotion] = useState<MotionPairProject['mobileMotion']>({ path: 'guided', duration: 8, loop: 'repeat' });
  const [mobileRender, setMobileRender] = useState<MotionPairProject['mobileRender']>({ quality: 'standard', width: 1080, height: 1920, fps: 30 });
  const [parallaxSettings, setParallaxSettings] = useState<ParallaxSettings>(() => defaultParallaxSettings());
  const [showDifference, setShowDifference] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'composite' | 'overlay' | 'edges'>('composite');
  const [maskTool, setMaskTool] = useState<MaskStroke['mode']>('reveal');
  const [brushSize, setBrushSize] = useState(4);
  const [brushHardness, setBrushHardness] = useState(70);
  const [previewFps, setPreviewFps] = useState(30);
  const [exportTarget, setExportTarget] = useState<'desktop-web' | 'mobile-video'>('desktop-web');
  const [rendererMetrics, setRendererMetrics] = useState({ fps: 0, frameMs: 0 });
  const [mobileExportProgress, setMobileExportProgress] = useState<number | null>(null);
  const [exportResult, setExportResult] = useState<{ title: string; detail: string; target: string } | null>(null);
  const [assetA, setAssetA] = useState<ProjectAsset>(defaultAssetA);
  const [assetB, setAssetB] = useState<ProjectAsset>(defaultAssetB);
  const [projectMeta, setProjectMeta] = useState<{ id: string; title: string; createdAt: string }>(() => ({
    id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`,
    title: 'Pink blouse study',
    createdAt: new Date().toISOString(),
  }));
  const [projectNotice, setProjectNotice] = useState('Autosave enabled');
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [projectHydrated, setProjectHydrated] = useState(false);
  const [canvasSettings, setCanvasSettings] = useState<MotionPairProject['canvas']>({ aspectRatio: '16:9', fit: 'cover', safeArea: { top: 0, bottom: 0, sides: 0 } });
  const [alignmentSettings, setAlignmentSettings] = useState<MotionPairProject['alignment']>({ status: 'pending', transform: [1, 0, 0, 1, 0, 0] });
  const [differenceSettings, setDifferenceSettings] = useState<MotionPairProject['difference']>({ thresholdLow: 0.1, thresholdHigh: 0.2, strokes: [] });
  const [differenceResult, setDifferenceResult] = useState<DifferenceResult | null>(null);
  const [differenceProgress, setDifferenceProgress] = useState<number | null>(null);
  const [alignmentMetrics, setAlignmentMetrics] = useState<AlignmentMetrics | null>(null);
  const [alignmentProgress, setAlignmentProgress] = useState<number | null>(null);
  const inputA = useRef<HTMLInputElement>(null);
  const inputB = useRef<HTMLInputElement>(null);
  const depthInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);
  const importController = useRef<AbortController | null>(null);
  const alignmentController = useRef<AbortController | null>(null);
  const alignmentAutotestStarted = useRef(false);
  const differenceController = useRef<AbortController | null>(null);

  const imageA = assetA.source;
  const imageB = assetB.source;

  const project = useMemo<MotionPairProject>(() => {
    const snapshot = createProject({
      title: projectMeta.title,
      assets: { imageA: assetA, imageB: assetB },
      lens: { radius, feather, magnification, revealIntensity, followSpeed },
    });
    return {
      ...snapshot,
      id: projectMeta.id,
      createdAt: projectMeta.createdAt,
      canvas: canvasSettings,
      alignment: alignmentSettings,
      difference: differenceSettings,
      mobileMotion,
      mobileRender,
      parallax: parallaxSettings,
      target: projectTarget,
      preset: projectPreset,
      presetSettings: { ...snapshot.presetSettings, portal: { glow: portalGlow, ripple: portalRipple, rippleEnabled: portalRippleEnabled, reducedMotion } },
    };
  }, [alignmentSettings, assetA, assetB, canvasSettings, differenceSettings, feather, followSpeed, magnification, mobileMotion, mobileRender, parallaxSettings, portalGlow, portalRipple, portalRippleEnabled, projectMeta, radius, reducedMotion, revealIntensity]);

  const applyProject = (nextProject: MotionPairProject) => {
    setProjectMeta({ id: nextProject.id, title: nextProject.title, createdAt: nextProject.createdAt });
    setAssetA(nextProject.assets.imageA);
    setAssetB(nextProject.assets.imageB);
    setRadius(nextProject.lens.radius);
    setFeather(nextProject.lens.feather);
    setMagnification(nextProject.lens.magnification);
    setRevealIntensity(nextProject.lens.revealIntensity);
    setFollowSpeed(nextProject.lens.followSpeed);
    setMobileMotion(nextProject.mobileMotion);
    setMobileRender(nextProject.mobileRender);
    setParallaxSettings(nextProject.parallax ?? defaultParallaxSettings());
    setProjectTarget(nextProject.target);
    setProjectPreset(nextProject.preset);
    setSelectedPresetId(nextProject.preset.id);
    const portal = nextProject.presetSettings?.portal;
    if (portal && typeof portal === 'object') {
      const values = portal as { glow?: unknown; ripple?: unknown; rippleEnabled?: unknown; reducedMotion?: unknown };
      if (typeof values.glow === 'number') setPortalGlow(values.glow);
      if (typeof values.ripple === 'number') setPortalRipple(values.ripple);
      if (typeof values.rippleEnabled === 'boolean') setPortalRippleEnabled(values.rippleEnabled);
      if (typeof values.reducedMotion === 'boolean') setReducedMotion(values.reducedMotion);
    }
    setCanvasSettings(nextProject.canvas);
    setAlignmentSettings(nextProject.alignment);
    setDifferenceSettings(nextProject.difference);
  };

  useEffect(() => {
    loadAutosave().then((saved) => {
      if (saved) {
        applyProject(saved);
        setProjectNotice('Autosave restored');
      }
    }).catch(() => setProjectNotice('Autosave unavailable'))
      .finally(() => setProjectHydrated(true));
  }, []);

  useEffect(() => {
    if (!projectHydrated) return;
    const timeout = window.setTimeout(() => {
      saveAutosave(project)
        .then(() => setProjectNotice('Saved locally'))
        .catch(() => setProjectNotice('Autosave failed'));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [project, projectHydrated]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      differenceController.current?.abort();
      const controller = new AbortController();
      differenceController.current = controller;
      setDifferenceProgress(0);
      runDifferenceJob(
        imageA,
        imageB,
        alignmentSettings.transform,
        differenceSettings,
        differenceSettings.strokes,
        controller.signal,
        (stage, progress) => {
          setDifferenceProgress(progress);
          if (activeStep === 'Difference') setProjectNotice(`Difference: ${stage}`);
        },
      ).then((result) => {
        setDifferenceResult(result);
        if (activeStep === 'Difference') setProjectNotice(`${result.regions.length} difference regions found`);
      }).catch((error) => {
        if ((error as DOMException).name !== 'AbortError') setProjectNotice(error instanceof Error ? error.message : 'Difference analysis failed');
      }).finally(() => setDifferenceProgress(null));
    }, 220);
    return () => window.clearTimeout(timeout);
  }, [activeStep, alignmentSettings.transform, differenceSettings, imageA, imageB]);

  const selectFile = async (file: File | undefined, slot: 'A' | 'B') => {
    if (!file) return;
    importController.current?.abort();
    const controller = new AbortController();
    importController.current = controller;
    setImportProgress(0);
    setProjectNotice(`Importing image ${slot}`);
    try {
      const asset = await importImageJob(file, controller.signal, ({ progress }) => setImportProgress(progress));
      if (slot === 'A') setAssetA(asset); else setAssetB(asset);
      setAlignmentSettings({ status: 'pending', transform: [1, 0, 0, 1, 0, 0] });
      setAlignmentMetrics(null);
      setProjectNotice(`Image ${slot} imported`);
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        setProjectNotice(error instanceof Error ? error.message : 'Image import failed');
      }
    } finally {
      setImportProgress(null);
    }
  };

  const selectDepthMap = async (file: File | undefined) => {
    if (!file) return;
    try {
      const asset = await importImageJob(file, new AbortController().signal, () => undefined);
      setParallaxSettings((current) => ({ ...current, mode: 'depth-map', depthMap: asset }));
      setProjectNotice('Depth map imported');
    } catch (error) { setProjectNotice(error instanceof Error ? error.message : 'Depth map import failed'); }
  };

  const runAutoAlignment = async () => {
    alignmentController.current?.abort();
    const controller = new AbortController();
    alignmentController.current = controller;
    setAlignmentProgress(0);
    setProjectNotice('Loading OpenCV alignment worker');
    try {
      const result = await runAlignmentJob(imageA, imageB, controller.signal, (stage, progress) => {
        setAlignmentProgress(progress);
        setProjectNotice(`Alignment: ${stage}`);
      });
      setAlignmentSettings({ status: result.status, transform: result.transform });
      setAlignmentMetrics(result.metrics);
      setProjectNotice(`Alignment ${result.status}`);
    } catch (error) {
      if ((error as DOMException).name !== 'AbortError') {
        setAlignmentSettings((current) => ({ ...current, status: 'rejected' }));
        setProjectNotice(error instanceof Error ? error.message : 'Alignment failed');
      }
    } finally {
      setAlignmentProgress(null);
    }
  };

  useEffect(() => {
    if (alignmentAutotestStarted.current || new URLSearchParams(window.location.search).get('alignment-test') !== '1') return;
    alignmentAutotestStarted.current = true;
    setActiveStep('Align');
    const timeout = window.setTimeout(runAutoAlignment, 300);
    return () => window.clearTimeout(timeout);
  }, []);

  const openProject = async (file: File | undefined) => {
    if (!file) return;
    try {
      const loaded = await readProjectFile(file);
      applyProject(loaded);
      setProjectNotice('Project opened');
    } catch (error) {
      setProjectNotice(error instanceof Error ? error.message : 'Project could not be opened');
    }
  };

  const canvasAspect = canvasSettings.aspectRatio === 'native'
    ? assetA.width / assetA.height
    : ({ '16:9': 16 / 9, '21:9': 21 / 9, '32:9': 32 / 9, '9:16': 9 / 16 } as const)[canvasSettings.aspectRatio];
  const outputLabel = canvasSettings.aspectRatio === '16:9'
    ? '1920 × 1080'
    : canvasSettings.aspectRatio === '21:9'
      ? '3440 × 1440'
      : canvasSettings.aspectRatio === '32:9'
        ? '3840 × 1080'
        : canvasSettings.aspectRatio === '9:16'
          ? '1080 × 1920'
        : `${assetA.width} × ${assetA.height}`;
  const rightsReady = assetA.rights === 'verified' && assetB.rights === 'verified';
  const pairAspectDelta = Math.abs(assetA.width / assetA.height - assetB.width / assetB.height);
  const textureBudgetMb = ((assetA.width * assetA.height + assetB.width * assetB.height) * 4
    + (differenceResult?.width ?? 512) * (differenceResult?.height ?? 512) * 4) / 1024 / 1024;
  const pairScore = alignmentMetrics
    ? Math.max(0, Math.min(100, Math.round(alignmentMetrics.inlierRatio * 55 + alignmentMetrics.validCoverage * 35 + Math.max(0, 10 - alignmentMetrics.reprojectionError))))
    : null;

  const exportPackage = async () => {
    const validation = validateWallpaperPackage(project, Boolean(differenceResult));
    if (validation.errors.length > 0) {
      setProjectNotice(`Export blocked: ${validation.errors[0]}`);
      if (!rightsReady) setActiveStep('Import');
      else if (alignmentSettings.status === 'pending' || alignmentSettings.status === 'rejected') setActiveStep('Align');
      else if (!differenceResult) setActiveStep('Difference');
      return;
    }
    try {
      if (exportTarget === 'mobile-video') {
        setMobileExportProgress(0); setProjectNotice('Encoding mobile video');
        let result: { bytes: number; format?: 'webm'; blob?: Blob };
        try {
          result = await exportMobileVideo(project, differenceResult, (progress) => setMobileExportProgress(progress));
        } catch (error) {
          if (error instanceof Error && /WebCodecs|H\.264|video export/i.test(error.message)) {
            setProjectNotice('WebCodecs unavailable · using browser fallback (WebM)');
            result = await exportMobileVideoFallback(project, differenceResult, (progress) => setMobileExportProgress(progress));
          } else throw error;
        }
        if (result.blob) {
          const bundle = await downloadMobileDistributionBundle(project, result.blob);
          setProjectNotice(`Exported mobile ${result.format === 'webm' ? 'WebM fallback' : 'MP4'} + bundle · ${(bundle.bytes / 1024 / 1024).toFixed(2)} MB`);
          setExportResult({ title: 'Mobile wallpaper bundle is ready.', detail: `${bundle.fileName} was downloaded with the video, fallback image, metadata and checksums.`, target: result.format === 'webm' ? 'Android / desktop WebM fallback bundle' : 'Android MP4 distribution bundle' });
          setRoute('export-result');
        } else setProjectNotice(`Exported mobile MP4 · ${(result.bytes / 1024 / 1024).toFixed(2)} MB`);
        setMobileExportProgress(null);
        return;
      }
      setProjectNotice('Building offline wallpaper ZIP');
      const result = await exportWallpaperPackage(project, differenceResult);
      setProjectNotice(`Exported ${result.fileName} · ${(result.bytes / 1024 / 1024).toFixed(2)} MB`);
      setExportResult({ title: 'Desktop wallpaper package is ready.', detail: `${result.fileName} was downloaded with the offline runtime, assets, preview and checksums.`, target: 'Windows Wallpaper Engine Web package' });
      setRoute('export-result');
    } catch (error) {
      setMobileExportProgress(null);
      setProjectNotice(error instanceof Error ? error.message : 'Wallpaper export failed');
    }
  };
  const packageValidation = validateWallpaperPackage(project, Boolean(differenceResult));
  const mobileValidation = validateMobileCommercialExport(project, Boolean(differenceResult));
  const editorSteps = getEditorWorkflow(project.preset.id);
  const projectLoader = <input ref={projectInput} hidden type="file" accept=".wallproj,application/json" onChange={(event) => openProject(event.target.files?.[0])} />;

  if (route === 'projects') {
    return <><ProjectsPage onPreset={(presetId) => { setSelectedPresetId(presetId); const preset = getPreset(presetId); setProjectTarget(preset.supportedTargets.length === 1 ? preset.supportedTargets[0] : 'both'); setRoute('create'); }} project={project} onContinue={() => setRoute('editor')} onNew={() => setRoute('presets')} onOpen={() => projectInput.current?.click()} />{projectLoader}</>;
  }
  if (route === 'presets') {
    return <PresetLibraryPage onBack={() => setRoute('projects')} onUse={(presetId) => { setSelectedPresetId(presetId); const preset = getPreset(presetId); setProjectTarget(preset.supportedTargets.length === 1 ? preset.supportedTargets[0] : 'both'); setRoute('create'); }} />;
  }
  if (route === 'create') {
    return <CreateProjectPage
      presetId={selectedPresetId}
      target={projectTarget}
      title={projectMeta.title}
      assetA={assetA}
      assetB={assetB}
      canvas={canvasSettings}
      importProgress={importProgress}
      onTitleChange={(title) => setProjectMeta((current) => ({ ...current, title }))}
      onTargetChange={setProjectTarget}
      onCanvasChange={setCanvasSettings}
      onImport={selectFile}
      onRightsChange={(slot, rights) => slot === 'A' ? setAssetA((current) => ({ ...current, rights })) : setAssetB((current) => ({ ...current, rights }))}
      onBack={() => setRoute('presets')}
      onCreate={() => { if (selectedPresetId === 'layered-parallax' && parallaxSettings.layers.length === 0) setParallaxSettings((current) => ({ ...current, layers: [{ id: globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}`, name: 'Background', asset: assetA, depth: 0.1, scale: 1 + current.overscan / 100, offsetX: 0, offsetY: 0, visible: true }] })); setProjectPreset({ id: selectedPresetId, version: 1 }); setRoute('editor'); }}
    />;
  }
  if (route === 'export') {
    return <ExportCenterPage project={project} target={exportTarget} onTargetChange={setExportTarget} desktopValidation={packageValidation} mobileValidation={mobileValidation} busy={mobileExportProgress !== null} onBack={() => setRoute('editor')} onExport={exportPackage} />;
  }
  if (route === 'export-result' && exportResult) {
    return <ExportResultPage result={exportResult} onEditor={() => setRoute('editor')} onProjects={() => setRoute('projects')} />;
  }

  if (false && selectedPresetId === 'layered-parallax') {
    const addLayer = (name: string, asset: ProjectAsset, depth: number) => setParallaxSettings((current) => ({
      ...current,
      layers: [...current.layers, { id: globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}`, name, asset, depth, scale: 1 + current.overscan / 100, offsetX: 0, offsetY: 0, visible: true }],
    }));
    const updateLayer = (id: string, changes: Partial<ParallaxSettings['layers'][number]>) => setParallaxSettings((current) => ({ ...current, layers: current.layers.map((layer) => layer.id === id ? { ...layer, ...changes } : layer) }));
    const moveLayer = (index: number, direction: -1 | 1) => setParallaxSettings((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.layers.length) return current;
      const layers = [...current.layers]; [layers[index], layers[destination]] = [layers[destination], layers[index]];
      return { ...current, layers };
    });
    return <>
      <div className="mode-grid"><button className="active"><span className="radio"><i /></span><span><b>Layered Parallax 2D/3D</b><small>Compose depth now; live camera rendering arrives in P3.3.</small></span></button></div>
      <div className="control-group">
        <div className="control-title"><Layers3 size={15} /><span>LAYER COMPOSER</span></div>
        <div className="mask-actions"><button className="wide-secondary" onClick={() => addLayer('Background', assetA, 0.1)}>+ Base layer</button><button className="wide-secondary" onClick={() => addLayer('Variant / subject', assetB, 0.62)}>+ Subject layer</button></div>
        {parallaxSettings.layers.length === 0 && <div className="validator-warning">Add the base artwork first, then add transparent subject or foreground layers.</div>}
      </div>
      <div className="region-list">
        {parallaxSettings.layers.map((layer, index) => <div className="region-row" key={layer.id}>
          <span><i /><b>{layer.name}</b><small>Depth {layer.depth.toFixed(2)} · {layer.asset?.name ?? 'No asset'}</small></span>
          <div className="layer-actions"><button onClick={() => moveLayer(index, -1)} disabled={index === 0}>↑</button><button onClick={() => moveLayer(index, 1)} disabled={index === parallaxSettings.layers.length - 1}>↓</button><button onClick={() => updateLayer(layer.id, { visible: !layer.visible })}>{layer.visible ? 'Hide' : 'Show'}</button><button onClick={() => setParallaxSettings((current) => ({ ...current, layers: current.layers.filter((candidate) => candidate.id !== layer.id) }))}>Remove</button></div>
          <div className="layer-controls"><RangeControl label="Depth" value={Math.round(layer.depth * 100)} min={0} max={100} unit="%" onChange={(value) => updateLayer(layer.id, { depth: value / 100 })} /><RangeControl label="Scale" value={Math.round(layer.scale * 100)} min={50} max={300} unit="%" onChange={(value) => updateLayer(layer.id, { scale: value / 100 })} /><RangeControl label="Offset X" value={Math.round(layer.offsetX)} min={-50} max={50} unit="%" onChange={(value) => updateLayer(layer.id, { offsetX: value })} /><RangeControl label="Offset Y" value={Math.round(layer.offsetY)} min={-50} max={50} unit="%" onChange={(value) => updateLayer(layer.id, { offsetY: value })} /></div>
        </div>)}
      </div>
      <div className="control-group"><div className="control-title"><SlidersHorizontal size={15} /><span>CAMERA BASELINE</span></div><RangeControl label="Camera strength" value={parallaxSettings.cameraStrength} min={0} max={60} unit="%" onChange={(cameraStrength) => setParallaxSettings((current) => ({ ...current, cameraStrength }))} /><RangeControl label="Smoothing" value={parallaxSettings.smoothing} min={0} max={100} unit="%" onChange={(smoothing) => setParallaxSettings((current) => ({ ...current, smoothing }))} /><RangeControl label="Overscan" value={parallaxSettings.overscan} min={0} max={50} unit="%" onChange={(overscan) => setParallaxSettings((current) => ({ ...current, overscan }))} /></div>
      <StepFooter note={parallaxSettings.layers.length ? `${parallaxSettings.layers.length} layer(s) saved to project` : 'Layer stack is empty'} action="Continue to Parallax Renderer" onClick={() => setActiveStep('Lens')} disabled={parallaxSettings.layers.length === 0} />
    </>;
  }

  return (
    <EditorShell>
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark"><Layers3 size={19} strokeWidth={2.2} /></div>
          <div>
            <div className="brand-name">Motion Pair</div>
            <div className="brand-edition">STUDIO</div>
          </div>
        </div>

        <button className="project-switcher" onClick={() => setRoute('projects')} title="Back to projects">
          <span className="project-status" />
          {projectMeta.title}
          <ChevronDown size={14} />
        </button>

        <div className="top-actions">
          <span className="save-status">{importProgress === null ? projectNotice : `Import ${Math.round(importProgress * 100)}%`}</span>
          <button className="icon-button" aria-label="Reset lens" onClick={() => {
            setRadius(18); setFeather(14); setMagnification(145); setRevealIntensity(100); setFollowSpeed(78);
            setProjectNotice('Lens reset');
          }}><RotateCcw size={17} /></button>
          <button className="secondary-button" onClick={() => projectInput.current?.click()}><FolderOpen size={16} /> Open</button>
          <button className="secondary-button" onClick={() => { downloadProject(project); setProjectNotice('Project downloaded'); }}><Save size={16} /> Save</button>
          <button className="secondary-button"><Eye size={16} /> Preview</button>
          <button className="primary-button" onClick={() => setRoute('export')}>
            <Download size={16} /> Export wallpaper
          </button>
        </div>
        <input ref={projectInput} hidden type="file" accept=".wallproj,application/json" onChange={(event) => openProject(event.target.files?.[0])} />
        <input ref={depthInput} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectDepthMap(event.target.files?.[0])} />
      </header>

      <EditorWorkflowRail
        steps={editorSteps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        assetA={assetA}
        assetB={assetB}
        inputA={inputA}
        inputB={inputB}
        onImport={selectFile}
        onSwap={() => { setAssetA(assetB); setAssetB(assetA); setProjectNotice('Images swapped'); }}
        pairScore={pairScore}
        rightsReady={rightsReady}
      />

      <section className="workspace">
        <div className="workspace-toolbar">
          <div className="view-tabs" role="tablist" aria-label="Preview mode">
            <button role="tab" aria-selected={!showDifference && comparisonMode === 'composite'} className={!showDifference && comparisonMode === 'composite' ? 'selected' : ''} onClick={() => { setComparisonMode('composite'); setShowDifference(false); }}><ImageIcon size={15} /> Composite</button>
            <button role="tab" aria-selected={!showDifference && comparisonMode === 'overlay'} className={!showDifference && comparisonMode === 'overlay' ? 'selected' : ''} onClick={() => { setComparisonMode('overlay'); setShowDifference(false); }}><Layers3 size={15} /> Overlay</button>
            <button role="tab" aria-selected={!showDifference && comparisonMode === 'edges'} className={!showDifference && comparisonMode === 'edges' ? 'selected' : ''} onClick={() => { setComparisonMode('edges'); setShowDifference(false); }}><Zap size={15} /> Edges</button>
            <button role="tab" aria-selected={showDifference} onClick={() => { setShowDifference(true); setComparisonMode('composite'); }} className={showDifference ? 'selected' : ''}><AlignCenter size={15} /> Difference</button>
          </div>
          <div className="canvas-meta">
            <span><i className={`good-dot ${alignmentSettings.status}`} /> {alignmentMetrics ? `Alignment ${alignmentMetrics.reprojectionError.toFixed(2)} px` : 'Alignment pending'}</span>
            <span>{outputLabel}</span>
            <button aria-label="Fullscreen preview"><Maximize2 size={15} /></button>
          </div>
        </div>

        <div className="canvas-stage">
          <div className="wallpaper-frame" style={{ aspectRatio: String(canvasAspect) }}>
            {selectedPresetId === 'layered-parallax' ? <ParallaxCanvas
              settings={parallaxSettings}
              fit={canvasSettings.fit}
              fps={previewFps}
              onPerformance={setRendererMetrics}
            /> : <DifferenceLensCanvas
              mode={selectedPresetId === 'portal-reveal' ? 'portal-reveal' : 'difference-lens'}
              imageA={imageA}
              imageB={imageB}
              radius={radius}
              feather={feather}
              magnification={magnification}
              revealIntensity={revealIntensity}
              portalGlow={portalGlow}
              portalRipple={portalRipple}
              portalRippleEnabled={portalRippleEnabled}
              reducedMotion={reducedMotion}
              followSpeed={followSpeed}
              showDifference={showDifference || activeStep === 'Difference'}
              fit={canvasSettings.fit}
              alignment={alignmentSettings.transform}
              comparisonMode={comparisonMode}
              differenceMask={differenceResult}
              maskTool={activeStep === 'Difference' ? { mode: maskTool, radius: brushSize / 100, hardness: brushHardness / 100 } : null}
              onMaskStroke={(stroke) => setDifferenceSettings((current) => ({ ...current, strokes: [...current.strokes, stroke] }))}
              fps={previewFps}
              onPerformance={setRendererMetrics}
              autoMotion={canvasSettings.aspectRatio === '9:16' ? mobileMotion : null}
            />}
            {canvasSettings.aspectRatio === '9:16' && <div className="mobile-safe-area" style={{ '--safe-top': `${canvasSettings.safeArea.top}%`, '--safe-bottom': `${canvasSettings.safeArea.bottom}%`, '--safe-sides': `${canvasSettings.safeArea.sides}%` } as React.CSSProperties} aria-label="Mobile safe area preview"><i className="safe-top" /><i className="safe-bottom" /><i className="safe-left" /><i className="safe-right" /></div>}
            <div className="preview-badge"><span /> LIVE PREVIEW</div>
            <div className="frame-stat">WEBGL 2 <i /> {rendererMetrics.fps > 0 ? `${rendererMetrics.fps.toFixed(0)} FPS · ${rendererMetrics.frameMs.toFixed(1)} MS` : `${previewFps} FPS TARGET`}</div>
          </div>
          <div className="canvas-caption">
            <span>{selectedPresetId === 'layered-parallax' ? 'Move the pointer to shift each layer by its assigned depth.' : 'Move the lens to magnify A and reveal only the changed regions from B.'}</span>
            <span>Fit: {canvasSettings.fit === 'cover' ? 'Cover' : 'Contain'} · sRGB · WebGL 2</span>
          </div>
        </div>

        <EditorStatusBar preset={`${getPreset(project.preset.id).ordinal} · ${getPreset(project.preset.id).name}`} output={outputLabel} fps={previewFps} issues={packageValidation.errors.length} />
      </section>

      <aside className="inspector">
        <div className="inspector-title">
          <div><WandSparkles size={18} /><span><small>PRODUCTION WORKFLOW</small><b>{activeStep}</b></span></div>
          <button aria-label="Editor settings"><Settings2 size={16} /></button>
        </div>

        <InspectorBody
          project={project}
          selectedPresetId={selectedPresetId}
          onDepthMap={() => depthInput.current?.click()}
          parallaxSettings={parallaxSettings}
          setParallaxSettings={setParallaxSettings}
          portalGlow={portalGlow}
          setPortalGlow={setPortalGlow}
          portalRipple={portalRipple}
          setPortalRipple={setPortalRipple}
          portalRippleEnabled={portalRippleEnabled}
          setPortalRippleEnabled={setPortalRippleEnabled}
          reducedMotion={reducedMotion}
          setReducedMotion={setReducedMotion}
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          radius={radius}
          setRadius={setRadius}
          feather={feather}
          setFeather={setFeather}
          magnification={magnification}
          setMagnification={setMagnification}
          revealIntensity={revealIntensity}
          setRevealIntensity={setRevealIntensity}
          followSpeed={followSpeed}
          setFollowSpeed={setFollowSpeed}
          mobileMotion={mobileMotion}
          setMobileMotion={setMobileMotion}
          mobileRender={mobileRender}
          setMobileRender={setMobileRender}
          mobileExportProgress={mobileExportProgress}
          showDifference={showDifference}
          setShowDifference={setShowDifference}
          assetA={assetA}
          assetB={assetB}
          setAssetA={setAssetA}
          setAssetB={setAssetB}
          canvasSettings={canvasSettings}
          setCanvasSettings={setCanvasSettings}
          pairAspectDelta={pairAspectDelta}
          alignmentSettings={alignmentSettings}
          setAlignmentSettings={setAlignmentSettings}
          alignmentMetrics={alignmentMetrics}
          alignmentProgress={alignmentProgress}
          runAutoAlignment={runAutoAlignment}
          differenceSettings={differenceSettings}
          setDifferenceSettings={setDifferenceSettings}
          differenceResult={differenceResult}
          differenceProgress={differenceProgress}
          maskTool={maskTool}
          setMaskTool={setMaskTool}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushHardness={brushHardness}
          setBrushHardness={setBrushHardness}
          previewFps={previewFps}
          setPreviewFps={setPreviewFps}
          rendererMetrics={rendererMetrics}
          textureBudgetMb={textureBudgetMb}
          rightsReady={rightsReady}
          openExportCenter={() => setRoute('export')}
          packageValidation={packageValidation}
          exportTarget={exportTarget}
          setExportTarget={setExportTarget}
        />
      </aside>
    </EditorShell>
  );
}

function InspectorBody({
  project,
  selectedPresetId,
  onDepthMap,
  parallaxSettings,
  setParallaxSettings,
  portalGlow,
  setPortalGlow,
  portalRipple,
  setPortalRipple,
  portalRippleEnabled,
  setPortalRippleEnabled,
  reducedMotion,
  setReducedMotion,
  activeStep,
  setActiveStep,
  radius,
  setRadius,
  feather,
  setFeather,
  magnification,
  setMagnification,
  revealIntensity,
  setRevealIntensity,
  followSpeed,
  setFollowSpeed,
  mobileMotion,
  setMobileMotion,
  mobileRender,
  setMobileRender,
  mobileExportProgress,
  showDifference,
  setShowDifference,
  assetA,
  assetB,
  setAssetA,
  setAssetB,
  canvasSettings,
  setCanvasSettings,
  pairAspectDelta,
  alignmentSettings,
  setAlignmentSettings,
  alignmentMetrics,
  alignmentProgress,
  runAutoAlignment,
  differenceSettings,
  setDifferenceSettings,
  differenceResult,
  differenceProgress,
  maskTool,
  setMaskTool,
  brushSize,
  setBrushSize,
  brushHardness,
  setBrushHardness,
  previewFps,
  setPreviewFps,
  rendererMetrics,
  textureBudgetMb,
  rightsReady,
  openExportCenter,
  packageValidation,
  exportTarget,
  setExportTarget,
}: {
  project: MotionPairProject;
  selectedPresetId: PresetId;
  onDepthMap: () => void;
  parallaxSettings: ParallaxSettings;
  setParallaxSettings: React.Dispatch<React.SetStateAction<ParallaxSettings>>;
  portalGlow: number;
  setPortalGlow: (value: number) => void;
  portalRipple: number;
  setPortalRipple: (value: number) => void;
  portalRippleEnabled: boolean;
  setPortalRippleEnabled: (value: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  activeStep: Step;
  setActiveStep: (step: Step) => void;
  radius: number;
  setRadius: (value: number) => void;
  feather: number;
  setFeather: (value: number) => void;
  magnification: number;
  setMagnification: (value: number) => void;
  revealIntensity: number;
  setRevealIntensity: (value: number) => void;
  followSpeed: number;
  setFollowSpeed: (value: number) => void;
  mobileMotion: MotionPairProject['mobileMotion'];
  setMobileMotion: (value: MotionPairProject['mobileMotion']) => void;
  mobileRender: MotionPairProject['mobileRender'];
  setMobileRender: (value: MotionPairProject['mobileRender']) => void;
  mobileExportProgress: number | null;
  showDifference: boolean;
  setShowDifference: (value: boolean) => void;
  assetA: ProjectAsset;
  assetB: ProjectAsset;
  setAssetA: (asset: ProjectAsset) => void;
  setAssetB: (asset: ProjectAsset) => void;
  canvasSettings: MotionPairProject['canvas'];
  setCanvasSettings: (settings: MotionPairProject['canvas']) => void;
  pairAspectDelta: number;
  alignmentSettings: MotionPairProject['alignment'];
  setAlignmentSettings: (settings: MotionPairProject['alignment']) => void;
  alignmentMetrics: AlignmentMetrics | null;
  alignmentProgress: number | null;
  runAutoAlignment: () => void;
  differenceSettings: MotionPairProject['difference'];
  setDifferenceSettings: React.Dispatch<React.SetStateAction<MotionPairProject['difference']>>;
  differenceResult: DifferenceResult | null;
  differenceProgress: number | null;
  maskTool: MaskStroke['mode'];
  setMaskTool: (tool: MaskStroke['mode']) => void;
  brushSize: number;
  setBrushSize: (value: number) => void;
  brushHardness: number;
  setBrushHardness: (value: number) => void;
  previewFps: number;
  setPreviewFps: (value: number) => void;
  rendererMetrics: { fps: number; frameMs: number };
  textureBudgetMb: number;
  rightsReady: boolean;
  openExportCenter: () => void;
  packageValidation: { errors: string[]; warnings: string[] };
  exportTarget: 'desktop-web' | 'mobile-video';
  setExportTarget: (value: 'desktop-web' | 'mobile-video') => void;
}) {
  if (activeStep === 'Import') {
    const needsUpscale = assetA.width < 1920 || assetA.height < 1080 || assetB.width < 1920 || assetB.height < 1080;
    const portraitMismatch = canvasSettings.aspectRatio === '9:16' && pairAspectDelta > 0.005;
    return (
      <>
        <div className="summary-block">
          <div className="summary-icon"><ImageIcon size={20} /></div>
          <b>Two images are ready</b>
          <p>{needsUpscale ? 'One or both assets need upscale for a 1080p landscape export.' : 'Both assets meet the current resolution target.'}</p>
        </div>
        <div className="check-list">
          <CheckRow label="Original image" value={`${assetA.width} × ${assetA.height}`} />
          <CheckRow label="Variant image" value={`${assetB.width} × ${assetB.height}`} />
          <CheckRow label="Original format" value={assetA.mimeType.replace('image/', '').toUpperCase()} />
          <CheckRow label="Variant format" value={assetB.mimeType.replace('image/', '').toUpperCase()} />
          <CheckRow label="Pair aspect delta" value={`${(pairAspectDelta * 100).toFixed(2)}%`} />
          <CheckRow label="Combined source size" value={`${((assetA.size + assetB.size) / 1024 / 1024).toFixed(2)} MB`} />
        </div>
        <div className="control-group import-settings">
          <div className="control-title"><Maximize2 size={15} /><span>CANVAS POLICY</span></div>
          <label className="field-row"><span>Aspect ratio</span><select value={canvasSettings.aspectRatio} onChange={(event) => setCanvasSettings({ ...canvasSettings, aspectRatio: event.target.value as MotionPairProject['canvas']['aspectRatio'] })}>
            <option value="16:9">16:9 · Standard</option>
            <option value="21:9">21:9 · Ultrawide</option>
            <option value="32:9">32:9 · Super ultrawide</option>
            <option value="9:16">9:16 · Mobile portrait</option>
            <option value="native">Native A</option>
          </select></label>
          <label className="field-row"><span>Fit mode</span><select value={canvasSettings.fit} onChange={(event) => setCanvasSettings({ ...canvasSettings, fit: event.target.value as MotionPairProject['canvas']['fit'] })}>
            <option value="cover">Cover · fill canvas</option>
            <option value="contain">Contain · show full image</option>
          </select></label>
          {canvasSettings.aspectRatio === '9:16' && <>
            <RangeControl label="Status safe area" value={canvasSettings.safeArea.top} min={0} max={20} unit="%" onChange={(value) => setCanvasSettings({ ...canvasSettings, safeArea: { ...canvasSettings.safeArea, top: value } })} />
            <RangeControl label="Navigation safe area" value={canvasSettings.safeArea.bottom} min={0} max={20} unit="%" onChange={(value) => setCanvasSettings({ ...canvasSettings, safeArea: { ...canvasSettings.safeArea, bottom: value } })} />
            <RangeControl label="Side safe area" value={canvasSettings.safeArea.sides} min={0} max={15} unit="%" onChange={(value) => setCanvasSettings({ ...canvasSettings, safeArea: { ...canvasSettings.safeArea, sides: value } })} />
          </>}
        </div>
        <div className="control-group rights-ledger">
          <div className="control-title"><CircleCheck size={15} /><span>COMMERCIAL RIGHTS</span></div>
          <RightsField label="Original / A" value={assetA.rights} onChange={(rights) => setAssetA({ ...assetA, rights })} />
          <RightsField label="Variant / B" value={assetB.rights} onChange={(rights) => setAssetB({ ...assetB, rights })} />
        </div>
        <StepFooter note={portraitMismatch ? 'Portrait assets have incompatible aspect ratios' : canvasSettings.aspectRatio === '9:16' ? 'Portrait input and safe areas are ready' : 'Input validation passed'} action="Continue to alignment" onClick={() => setActiveStep('Align')} disabled={portraitMismatch} />
      </>
    );
  }

  if (activeStep === 'Align') {
    const [a, b, , , tx, ty] = alignmentSettings.transform;
    const scale = Math.hypot(a, b);
    const rotation = Math.atan2(b, a) * 180 / Math.PI;
    const updateTransform = (nextScale: number, nextRotation: number, nextX: number, nextY: number) => {
      const radians = nextRotation * Math.PI / 180;
      const cosine = Math.cos(radians) * nextScale;
      const sine = Math.sin(radians) * nextScale;
      setAlignmentSettings({
        status: 'review',
        transform: [cosine, sine, -sine, cosine, nextX, nextY],
      });
    };
    return (
      <>
        <div className="score-hero"><span>ALIGNMENT</span><strong>{alignmentMetrics ? Math.round(alignmentMetrics.inlierRatio * 100) : '—'}</strong><small>{alignmentMetrics ? '% inliers' : ''}</small><p className={alignmentSettings.status}>{alignmentSettings.status}</p></div>
        <div className="metric-list">
          <Metric label="Feature matches" value={alignmentMetrics ? String(alignmentMetrics.featureMatches) : 'Pending'} status={alignmentMetrics && alignmentMetrics.featureMatches >= 40 ? 'good' : 'warning'} />
          <Metric label="RANSAC inliers" value={alignmentMetrics ? `${Math.round(alignmentMetrics.inlierRatio * 100)}%` : 'Pending'} status={alignmentMetrics && alignmentMetrics.inlierRatio >= 0.5 ? 'good' : 'warning'} />
          <Metric label="Reprojection error" value={alignmentMetrics ? `${alignmentMetrics.reprojectionError.toFixed(2)} px` : 'Pending'} status={alignmentMetrics && alignmentMetrics.reprojectionError <= 3 ? 'good' : 'warning'} />
          <Metric label="Valid canvas" value={alignmentMetrics ? `${Math.round(alignmentMetrics.validCoverage * 100)}%` : 'Pending'} status={alignmentMetrics && alignmentMetrics.validCoverage >= 0.8 ? 'good' : 'warning'} />
        </div>
        <div className="control-group">
          <div className="control-title"><AlignCenter size={15} /><span>ALIGNMENT MODEL</span></div>
          <div className="select-row"><span>Transform</span><button>Similarity affine <ChevronDown size={13} /></button></div>
          <button className="wide-secondary" onClick={runAutoAlignment} disabled={alignmentProgress !== null}><WandSparkles size={14} /> {alignmentProgress === null ? 'Run ORB + RANSAC alignment' : `Aligning ${Math.round(alignmentProgress * 100)}%`}</button>
        </div>
        <div className="control-group manual-align">
          <div className="control-title"><SlidersHorizontal size={15} /><span>MANUAL CORRECTION</span></div>
          <RangeControl label="Scale" value={Math.round(scale * 100)} min={80} max={120} unit="%" onChange={(value) => updateTransform(value / 100, rotation, tx, ty)} />
          <RangeControl label="Rotation" value={Math.round(rotation)} min={-10} max={10} unit="°" onChange={(value) => updateTransform(scale, value, tx, ty)} />
          <RangeControl label="Offset X" value={Math.round(tx * 100)} min={-15} max={15} unit="%" onChange={(value) => updateTransform(scale, rotation, value / 100, ty)} />
          <RangeControl label="Offset Y" value={Math.round(ty * 100)} min={-15} max={15} unit="%" onChange={(value) => updateTransform(scale, rotation, tx, value / 100)} />
          <button className="wide-secondary" onClick={() => setAlignmentSettings({ status: 'pending', transform: [1, 0, 0, 1, 0, 0] })}><RotateCcw size={14} /> Reset transform</button>
        </div>
        <StepFooter
          note={alignmentSettings.status === 'good' ? 'Alignment passed the quality gate' : alignmentSettings.status === 'review' ? 'Manual review accepted for mask work' : 'Run or correct alignment before continuing'}
          action="Build difference mask"
          onClick={() => setActiveStep('Difference')}
          disabled={alignmentSettings.status === 'pending' || alignmentSettings.status === 'rejected'}
        />
      </>
    );
  }

  if (activeStep === 'Difference') {
    return (
      <>
        <div className="summary-block">
          <div className="summary-icon"><AlignCenter size={20} /></div>
          <b>{differenceProgress === null ? `${differenceResult?.regions.length ?? 0} regions proposed` : `Analyzing ${Math.round(differenceProgress * 100)}%`}</b>
          <p>Multi-scale residual suppresses compression drift. Paint on the canvas to approve or remove the remaining regions.</p>
        </div>
        <div className="metric-list">
          <Metric label="Mask coverage" value={differenceResult ? `${(differenceResult.coverage * 100).toFixed(2)}%` : 'Pending'} status={differenceResult && differenceResult.coverage < 0.35 ? 'good' : 'warning'} />
          <Metric label="Noise floor" value={differenceResult ? differenceResult.noiseFloor.toFixed(3) : 'Pending'} status={differenceResult && differenceResult.noiseFloor < 0.12 ? 'good' : 'warning'} />
          <Metric label="Effective low" value={differenceResult ? differenceResult.effectiveLow.toFixed(3) : 'Pending'} status="good" />
          <Metric label="Manual strokes" value={String(differenceSettings.strokes.length)} status="good" />
        </div>
        {differenceResult && differenceResult.regions.length > 0 && (
          <div className="region-list">
            <div className="control-title"><Layers3 size={15} /><span>DETECTED REGIONS</span></div>
            {differenceResult.regions.slice(0, 5).map((region) => (
              <div className="region-row" key={region.id}>
                <span><i /> Region {region.id}<small>{region.area} px · {Math.round(region.strength * 100)}%</small></span>
                <button onClick={() => setDifferenceSettings((current) => ({
                  ...current,
                  strokes: [...current.strokes, {
                    id: globalThis.crypto?.randomUUID?.() ?? `region-${Date.now()}`,
                    mode: 'protect',
                    radius: Math.max(region.width, region.height) * 0.58,
                    hardness: 0.72,
                    points: [{ x: region.x + region.width / 2, y: 1 - region.y - region.height / 2 }],
                  }],
                }))}>Exclude</button>
              </div>
            ))}
          </div>
        )}
        <div className="control-group">
          <div className="control-title"><SlidersHorizontal size={15} /><span>AUTO PROPOSAL</span></div>
          <RangeControl label="Low threshold" value={Math.round(differenceSettings.thresholdLow * 100)} min={2} max={30} unit="%" onChange={(value) => setDifferenceSettings((current) => ({ ...current, thresholdLow: Math.min(value / 100, current.thresholdHigh - 0.01) }))} />
          <RangeControl label="High threshold" value={Math.round(differenceSettings.thresholdHigh * 100)} min={5} max={45} unit="%" onChange={(value) => setDifferenceSettings((current) => ({ ...current, thresholdHigh: Math.max(value / 100, current.thresholdLow + 0.01) }))} />
        </div>
        <div className="control-group mask-tools">
          <div className="control-title"><MousePointer2 size={15} /><span>MASK CORRECTION</span></div>
          <div className="tool-segment">
            {(['reveal', 'erase', 'protect'] as const).map((tool) => <button key={tool} className={maskTool === tool ? 'active' : ''} onClick={() => setMaskTool(tool)}>{tool}</button>)}
          </div>
          <RangeControl label="Brush size" value={brushSize} min={1} max={16} unit="%" onChange={setBrushSize} />
          <RangeControl label="Hardness" value={brushHardness} min={10} max={100} unit="%" onChange={setBrushHardness} />
          <div className="mask-actions">
            <button className="wide-secondary" disabled={differenceSettings.strokes.length === 0} onClick={() => setDifferenceSettings((current) => ({ ...current, strokes: current.strokes.slice(0, -1) }))}><RotateCcw size={14} /> Undo stroke</button>
            <button className="wide-secondary" disabled={differenceSettings.strokes.length === 0} onClick={() => setDifferenceSettings((current) => ({ ...current, strokes: [] }))}>Clear edits</button>
          </div>
        </div>
        <StepFooter note="Mask edits are saved non-destructively" action="Tune Difference Lens" onClick={() => { setShowDifference(false); setActiveStep('Lens'); }} disabled={!differenceResult || differenceProgress !== null} />
      </>
    );
  }

  if (activeStep === 'Export') {
    const mobileValidation = validateMobileCommercialExport(project, Boolean(differenceResult));
    const visualCases = Array.from({ length: 9 }, (_, index) => ({ passed: magnification >= 100 && magnification <= 200 && radius >= 8 && radius <= 32, index }));
    const checks = [
      ['Project schema', true, 'Web Wallpaper project.json'],
      ['Commercial rights', assetA.rights === 'verified' && assetB.rights === 'verified', 'Both assets verified'],
      ['Alignment quality', alignmentSettings.status === 'good' || alignmentSettings.status === 'review', 'Transform reviewed'],
      ['Difference mask', Boolean(differenceResult), 'Mask ready to bake'],
      ['Offline assets', !/^https?:\/\//i.test(assetA.source) && !/^https?:\/\//i.test(assetB.source), 'No network URLs'],
      ['Safety limits', assetA.width <= 8192 && assetA.height <= 8192 && assetB.width <= 8192 && assetB.height <= 8192, 'Resolution within 8K'],
      ['Visual matrix', visualCases.every((test) => test.passed), `${visualCases.length} viewport cases`],
      ...(exportTarget === 'mobile-video' ? [
        ['Portrait video', mobileValidation.errors.every((error) => !error.includes('9:16') && !error.includes('divisible')), `${mobileRender.width} × ${mobileRender.height}`],
        ['Mobile commercial gate', mobileValidation.errors.length === 0, mobileValidation.errors.length === 0 ? 'Ready to encode' : `${mobileValidation.errors.length} issue(s)`],
      ] : []),
    ] as const;
    return (
      <>
        <div className="export-card selected"><span><Zap size={17} /></span><div><b>Web Wallpaper</b><small>Interactive · WebGL 2 · Offline</small></div><CircleCheck size={16} /></div>
        <div className="control-group export-options">
          <div className="control-title"><Download size={15} /><span>OUTPUT</span></div>
          <label className="field-row"><span>Target</span><select value={exportTarget} onChange={(event) => setExportTarget(event.target.value as 'desktop-web' | 'mobile-video')}>
            <option value="desktop-web">Windows · Interactive Web</option>
            <option value="mobile-video">Android · Portrait Video</option>
          </select></label>
          {exportTarget === 'mobile-video' && <label className="field-row"><span>Mobile quality</span><select value={mobileRender.quality} onChange={(event) => { const quality = event.target.value as MotionPairProject['mobileRender']['quality']; const size = quality === 'economy' ? 720 : quality === 'premium' ? 1440 : 1080; setMobileRender({ quality, width: size, height: Math.round(size * 16 / 9), fps: quality === 'economy' ? 24 : 30 }); }}><option value="economy">Economy · 720 × 1280 · 24 FPS</option><option value="standard">Standard · 1080 × 1920 · 30 FPS</option><option value="premium">Premium · 1440 × 2560 · 30 FPS</option></select></label>}
          <div className="select-row"><span>Resolution</span><button>{exportTarget === 'mobile-video' ? 'Portrait · 1080 × 1920' : 'Desktop · 1920 × 1080'} <ChevronDown size={13} /></button></div>
          <div className="select-row"><span>Texture quality</span><button>High <ChevronDown size={13} /></button></div>
          <div className="select-row"><span>Difference mask</span><button>Lossless WebP <ChevronDown size={13} /></button></div>
        </div>
        <div className="export-report">
          <div className="control-title"><CircleCheck size={15} /><span>COMMERCIAL VALIDATOR</span></div>
          {checks.map(([label, passed, value]) => <CheckRow key={String(label)} label={String(label)} value={passed ? `PASS · ${String(value)}` : 'BLOCKED'} />)}
          {packageValidation.warnings.map((warning) => <div className="validator-warning" key={warning}>{warning}</div>)}
          {exportTarget === 'mobile-video' && mobileValidation.warnings.map((warning) => <div className="validator-warning" key={warning}>{warning}</div>)}
          {exportTarget === 'mobile-video' && mobileValidation.errors.map((error) => <div className="validator-warning" key={error}>BLOCKED · {error}</div>)}
        </div>
        <div className="inspector-footer export-footer">
          <span>{exportTarget === 'mobile-video' ? 'Android requires a Video/Scene export; Web is unsupported' : packageValidation.errors.length === 0 ? 'Validator passed · package is ready' : `${packageValidation.errors.length} issue(s) must be fixed`}</span>
          <button onClick={openExportCenter}><Download size={15} /> Review in Export Center</button>
        </div>
      </>
    );
  }

  if (selectedPresetId === 'layered-parallax') {
    return <ParallaxComposer settings={parallaxSettings} setSettings={setParallaxSettings} assetA={assetA} assetB={assetB} onDepthMap={onDepthMap} onContinue={() => setActiveStep('Lens')} />;
  }

  return (
    <>
      <div className="mode-grid">
        <button className="active">
          <span className="radio"><i /></span>
          <span><b>{getPreset(project.preset.id).name}</b><small>{getPreset(project.preset.id).summary}</small></span>
        </button>
      </div>
      <div className="control-group">
        <div className="control-title"><MousePointer2 size={15} /><span>{selectedPresetId === 'portal-reveal' ? 'PORTAL BEHAVIOR' : 'LENS BEHAVIOR'}</span></div>
        <RangeControl label="Radius" value={radius} min={8} max={32} unit="%" onChange={setRadius} />
        <RangeControl label="Magnification" value={magnification} min={100} max={200} unit="%" onChange={setMagnification} />
        <RangeControl label="Edge feather" value={feather} min={2} max={30} unit="%" onChange={setFeather} />
        <RangeControl label="Follow speed" value={followSpeed} min={10} max={100} unit="" onChange={setFollowSpeed} />
        {selectedPresetId === 'portal-reveal' && <>
          <RangeControl label="Portal glow" value={portalGlow} min={0} max={150} unit="%" onChange={setPortalGlow} />
          <RangeControl label="Ripple" value={portalRipple} min={0} max={100} unit="%" onChange={setPortalRipple} />
          <label className="field-row"><span>Ripple effect</span><input type="checkbox" checked={portalRippleEnabled} onChange={(event) => setPortalRippleEnabled(event.target.checked)} /></label>
          <label className="field-row"><span>Reduced motion</span><input type="checkbox" checked={reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /></label>
        </>}
      </div>
      {canvasSettings.aspectRatio === '9:16' && <div className="control-group mobile-motion-controls">
        <div className="control-title"><MousePointer2 size={15} /><span>MOBILE AUTO MOTION</span></div>
        <label className="field-row"><span>Motion path</span><select value={mobileMotion.path} onChange={(event) => setMobileMotion({ ...mobileMotion, path: event.target.value as MotionPairProject['mobileMotion']['path'] })}>
          <option value="guided">Guided reveal</option>
          <option value="orbit">Slow orbit</option>
          <option value="figure8">Figure eight</option>
          <option value="breathe">Breathe / idle</option>
        </select></label>
        <RangeControl label="Loop duration" value={mobileMotion.duration} min={3} max={20} unit="s" onChange={(duration) => setMobileMotion({ ...mobileMotion, duration })} />
        <label className="field-row"><span>Loop mode</span><select value={mobileMotion.loop} onChange={(event) => setMobileMotion({ ...mobileMotion, loop: event.target.value as MotionPairProject['mobileMotion']['loop'] })}>
          <option value="repeat">Repeat</option><option value="pingpong">Ping pong</option>
        </select></label>
      </div>}
      <div className="control-group">
        <div className="control-title"><SlidersHorizontal size={15} /><span>DIFFERENCE REVEAL</span></div>
        <RangeControl label="Reveal intensity" value={revealIntensity} min={0} max={100} unit="%" onChange={setRevealIntensity} />
        <button className="wide-secondary" onClick={() => setShowDifference(!showDifference)}>
          <Eye size={14} /> {showDifference ? 'Show final composite' : 'Show difference mask'}
        </button>
      </div>
      <div className="control-group runtime-budget">
        <div className="control-title"><Zap size={15} /><span>RUNTIME BUDGET</span></div>
        <label className="field-row"><span>Target frame rate</span><select value={previewFps} onChange={(event) => setPreviewFps(Number(event.target.value))}>
          <option value="15">15 FPS · Economy</option>
          <option value="30">30 FPS · Balanced</option>
          <option value="60">60 FPS · Smooth</option>
        </select></label>
        <div className="runtime-metrics">
          <Metric label="Measured FPS" value={rendererMetrics.fps > 0 ? rendererMetrics.fps.toFixed(1) : 'Warming up'} status={rendererMetrics.fps === 0 || rendererMetrics.fps >= previewFps * 0.85 ? 'good' : 'warning'} />
          <Metric label="Frame interval" value={rendererMetrics.frameMs > 0 ? `${rendererMetrics.frameMs.toFixed(1)} ms` : 'Warming up'} status={rendererMetrics.frameMs === 0 || rendererMetrics.frameMs <= 1000 / previewFps * 1.2 ? 'good' : 'warning'} />
          <Metric label="Texture estimate" value={`${textureBudgetMb.toFixed(1)} MB`} status={textureBudgetMb <= 128 ? 'good' : 'warning'} />
        </div>
      </div>
      <StepFooter note="WebGL renderer is ready for host integration" action="Review export requirements" onClick={() => setActiveStep('Export')} />
    </>
  );
}

function ParallaxComposer({ settings, setSettings, assetA, assetB, onDepthMap, onContinue }: { settings: ParallaxSettings; setSettings: React.Dispatch<React.SetStateAction<ParallaxSettings>>; assetA: ProjectAsset; assetB: ProjectAsset; onDepthMap: () => void; onContinue: () => void }) {
  const addLayer = (name: string, asset: ProjectAsset, depth: number) => setSettings((current) => ({ ...current, layers: [...current.layers, { id: globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now()}`, name, asset, depth, scale: 1 + current.overscan / 100, offsetX: 0, offsetY: 0, visible: true }] }));
  const update = (id: string, changes: Partial<ParallaxSettings['layers'][number]>) => setSettings((current) => ({ ...current, layers: current.layers.map((layer) => layer.id === id ? { ...layer, ...changes } : layer) }));
  const move = (index: number, direction: -1 | 1) => setSettings((current) => { const next = index + direction; if (next < 0 || next >= current.layers.length) return current; const layers = [...current.layers]; [layers[index], layers[next]] = [layers[next], layers[index]]; return { ...current, layers }; });
  const requiredScale = settings.layers.length ? Math.max(...settings.layers.map((layer) => 1 + settings.overscan / 100 + settings.cameraStrength * layer.depth / 100)) : 1;
  const needsOverscanFix = settings.layers.some((layer) => layer.scale < requiredScale);
  return <>
    <div className="mode-grid"><button className="active"><span className="radio"><i /></span><span><b>Layered Parallax 2D/3D</b><small>Build the depth stack before enabling the live camera renderer.</small></span></button></div>
    <div className="control-group"><div className="control-title"><Layers3 size={15} /><span>LAYER COMPOSER</span></div><div className="mask-actions"><button className="wide-secondary" onClick={() => addLayer('Background', assetA, 0.1)}>+ Base layer</button><button className="wide-secondary" onClick={() => addLayer('Subject', assetB, 0.62)}>+ Subject layer</button></div>{settings.layers.length === 0 && <div className="validator-warning">Start with Base layer, then add Subject and Foreground PNG layers.</div>}</div>
    <div className="region-list">{settings.layers.map((layer, index) => <div className="region-row" key={layer.id}><span><i /><b>{layer.name}</b><small>Depth {layer.depth.toFixed(2)} · {layer.asset?.name ?? 'No asset'}</small></span><div className="layer-actions"><button disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button disabled={index === settings.layers.length - 1} onClick={() => move(index, 1)}>↓</button><button onClick={() => update(layer.id, { visible: !layer.visible })}>{layer.visible ? 'Hide' : 'Show'}</button><button onClick={() => setSettings((current) => ({ ...current, layers: current.layers.filter((candidate) => candidate.id !== layer.id) }))}>Remove</button></div><div className="layer-controls"><RangeControl label="Depth" value={Math.round(layer.depth * 100)} min={0} max={100} unit="%" onChange={(value) => update(layer.id, { depth: value / 100 })} /><RangeControl label="Scale" value={Math.round(layer.scale * 100)} min={50} max={300} unit="%" onChange={(value) => update(layer.id, { scale: value / 100 })} /><RangeControl label="Offset X" value={Math.round(layer.offsetX)} min={-50} max={50} unit="%" onChange={(value) => update(layer.id, { offsetX: value })} /><RangeControl label="Offset Y" value={Math.round(layer.offsetY)} min={-50} max={50} unit="%" onChange={(value) => update(layer.id, { offsetY: value })} /></div></div>)}</div>
    <div className="control-group"><div className="control-title"><SlidersHorizontal size={15} /><span>CAMERA BASELINE</span></div><label className="field-row"><span>Camera mode</span><select value={settings.cameraMode} onChange={(event) => setSettings((current) => ({ ...current, cameraMode: event.target.value as ParallaxSettings['cameraMode'] }))}><option value="direct">Direct</option><option value="smooth">Smooth</option><option value="inertia">Inertia</option></select></label><label className="field-row"><span>Movement axis</span><select value={settings.axis} onChange={(event) => setSettings((current) => ({ ...current, axis: event.target.value as ParallaxSettings['axis'] }))}><option value="both">X + Y</option><option value="horizontal">Horizontal only</option><option value="vertical">Vertical only</option></select></label><RangeControl label="Camera strength" value={settings.cameraStrength} min={0} max={60} unit="%" onChange={(cameraStrength) => setSettings((current) => ({ ...current, cameraStrength }))} /><RangeControl label="Smoothing" value={settings.smoothing} min={0} max={100} unit="%" onChange={(smoothing) => setSettings((current) => ({ ...current, smoothing }))} /><RangeControl label="Overscan" value={settings.overscan} min={0} max={50} unit="%" onChange={(overscan) => setSettings((current) => ({ ...current, overscan }))} />{needsOverscanFix && <><div className="validator-warning">Some layers need at least {Math.round(requiredScale * 100)}% scale to cover the camera range.</div><button className="wide-secondary" onClick={() => setSettings((current) => ({ ...current, layers: current.layers.map((layer) => ({ ...layer, scale: Math.max(layer.scale, requiredScale) })) }))}>Auto fix overscan</button></>}</div>
    <div className="control-group"><div className="control-title"><MousePointer2 size={15} /><span>MOBILE INPUT</span></div><label className="field-row"><span>Input mode</span><select value={settings.mobile.input} onChange={(event) => setSettings((current) => ({ ...current, mobile: { ...current.mobile, input: event.target.value as ParallaxSettings['mobile']['input'] } }))}><option value="auto">Auto drift fallback</option><option value="touch">Touch drag</option><option value="gyroscope">Gyroscope</option></select></label><RangeControl label="Mobile strength" value={settings.mobile.strength} min={0} max={60} unit="%" onChange={(strength) => setSettings((current) => ({ ...current, mobile: { ...current.mobile, strength } }))} /><label className="field-row"><span>Reduced motion</span><input type="checkbox" checked={settings.mobile.reducedMotion} onChange={(event) => setSettings((current) => ({ ...current, mobile: { ...current.mobile, reducedMotion: event.target.checked } }))} /></label><button className="wide-secondary" onClick={async () => { const sensor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }; if (sensor.requestPermission) await sensor.requestPermission(); setSettings((current) => ({ ...current, mobile: { ...current.mobile, input: 'gyroscope' } })); }}>Enable gyroscope</button></div>
    <div className="control-group"><div className="control-title"><Layers3 size={15} /><span>DEPTH MAP 2.5D</span></div><label className="field-row"><span>Mode</span><select value={settings.mode} onChange={(event) => setSettings((current) => ({ ...current, mode: event.target.value as ParallaxSettings['mode'] }))}><option value="layers">Layer stack</option><option value="depth-map">Depth map</option></select></label><label className="field-row"><span>Quality</span><select value={settings.quality} onChange={(event) => setSettings((current) => ({ ...current, quality: event.target.value as ParallaxSettings['quality'] }))}><option value="economy">Economy · 12 × 8</option><option value="standard">Standard · 24 × 14</option><option value="premium">Premium · 36 × 22</option></select></label><button className="wide-secondary" onClick={onDepthMap}>Upload grayscale depth map</button>{settings.depthMap && <><DepthMapEditor asset={settings.depthMap} onChange={(depthMap) => setSettings((current) => ({ ...current, depthMap }))} /><button className="wide-secondary" onClick={() => setSettings((current) => ({ ...current, distortionMask: current.depthMap }))}>Use depth map as protection mask</button><div className="validator-warning">White areas render closer to camera. Black mask areas stay stable.</div></>}</div>
    <div className="control-group"><div className="control-title"><SlidersHorizontal size={15} /><span>2.5D DEPTH</span></div><RangeControl label="Perspective" value={settings.depthPerspective} min={0} max={100} unit="%" onChange={(depthPerspective) => setSettings((current) => ({ ...current, depthPerspective }))} /></div>
    <StepFooter note={settings.layers.length ? `${settings.layers.length} layer(s) saved to project` : 'Layer stack is empty'} action="Continue to Parallax Renderer" onClick={onContinue} disabled={settings.layers.length === 0} />
  </>;
}

function CheckRow({ label, value }: { label: string; value: string }) {
  return <div className="check-row"><CircleCheck size={14} /><span>{label}</span><b>{value}</b></div>;
}

function Metric({ label, value, status }: { label: string; value: string; status: 'good' | 'warning' }) {
  return <div className="metric"><span>{label}</span><b>{value}</b><i className={status} /></div>;
}

function StepFooter({ note, action, onClick, disabled = false }: { note: string; action: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="inspector-footer">
      <span><CircleCheck size={15} /> {note}</span>
      <button onClick={onClick} disabled={disabled}>{action}</button>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange?: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  return (
    <label className="range-control">
      <span>{label}<output>{value}{unit}</output></span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        style={{ '--range-progress': `${percentage}%` } as React.CSSProperties}
        onChange={(event) => onChange?.(Number(event.target.value))}
      />
    </label>
  );
}

function RightsField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ProjectAsset['rights'];
  onChange: (value: ProjectAsset['rights']) => void;
}) {
  return (
    <label className="field-row rights-field">
      <span>{label}</span>
      <select value={value} className={value} onChange={(event) => onChange(event.target.value as ProjectAsset['rights'])}>
        <option value="unknown">Unknown</option>
        <option value="verified">Verified</option>
        <option value="rejected">Rejected</option>
      </select>
    </label>
  );
}

export default App;
