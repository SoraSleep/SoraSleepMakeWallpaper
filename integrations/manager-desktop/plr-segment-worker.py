"""Local PLR segmentation worker: JSON lines, one cached CPU session per run."""
import os, sys, json, hashlib, time
from pathlib import Path
os.environ.setdefault('OMP_NUM_THREADS','2')
from PIL import Image
import numpy as np
from rembg import new_session, remove
Image.MAX_IMAGE_PIXELS=100_000_000
MODEL='birefnet-general-lite'
session=None

def segment(job):
    global session
    started=time.monotonic()
    source=Path(job['source']); target=Path(job['target'])
    if hashlib.sha256(source.read_bytes()).hexdigest()!=job['sourceSha256']:
        raise ValueError('plr-source-changed')
    # Model installation is explicit; production jobs must not silently download weights.
    weights=Path(os.environ['U2NET_HOME'])/'birefnet-general-lite.onnx'
    if not weights.is_file(): raise ValueError('plr-segmentation-model-missing')
    if session is None:
        if hashlib.md5(weights.read_bytes()).hexdigest()!='4fab47adc4ff364be1713e97b7e66334':
            raise ValueError('plr-segmentation-model-corrupt-run-setup-again')
        session=new_session(MODEL,providers=['CPUExecutionProvider'])
    with Image.open(source) as raw:
        raw.load()
        if raw.width*raw.height>100_000_000: raise ValueError('plr-image-too-large')
        original=raw.convert('RGBA')
    mask=remove(original,session=session,only_mask=True,alpha_matting=False,post_process_mask=False).convert('L')
    # Apply only alpha; preserve source RGB without painting or thresholding soft edges.
    combined=(np.asarray(mask,dtype=np.uint16)*np.asarray(original.getchannel('A'),dtype=np.uint16)//255).astype(np.uint8)
    result=original.copy(); result.putalpha(Image.fromarray(combined))
    if result.size!=original.size: raise ValueError('plr-segmentation-size-changed')
    alpha=np.asarray(result.getchannel('A'))
    visible=alpha>16; opaque=alpha>=250; transparent=alpha<=5
    # Never turn a failed mask into an approved transparent product.
    if not visible.any() or not transparent.any(): raise ValueError('plr-segmentation-degenerate-mask')
    ys,xs=np.where(visible)
    bbox=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
    touches=bool(visible[0,:].any() or visible[-1,:].any() or visible[:,0].any() or visible[:,-1].any())
    rgb=np.asarray(original.convert('RGB')); result_rgb=np.asarray(result.convert('RGB'))
    if not np.array_equal(rgb[opaque],result_rgb[opaque]): raise ValueError('plr-foreground-colors-changed')
    qa={'rgba':True,'transparentFraction':float(transparent.mean()),'opaqueFraction':float(opaque.mean()),'softAlphaFraction':float(((alpha>5)&(alpha<250)).mean()),'foregroundBbox':bbox,'touchesCanvasEdge':touches,'opaqueRgbPreserved':True,'warnings':['subject-touches-canvas-edge'] if touches else []}
    if qa['transparentFraction']<0.05: qa['warnings'].append('very-little-transparent-background')
    if visible.mean()<0.005: qa['warnings'].append('very-small-foreground')
    result.save(target,format='PNG')
    thumb=result.copy(); thumb.thumbnail((480,480))
    sheet=Image.new('RGB',(1440,480),(235,235,235))
    for index,color in enumerate([(255,255,255),(28,33,43),(210,210,210)]):
        canvas=Image.new('RGBA',(480,480),color+(255,))
        if index==2:
            from PIL import ImageDraw
            draw=ImageDraw.Draw(canvas)
            for y in range(0,480,24):
                for x in range(0,480,24):
                    if (x//24+y//24)%2==0: draw.rectangle((x,y,x+23,y+23),fill=(250,250,250,255))
        canvas.alpha_composite(thumb,((480-thumb.width)//2,(480-thumb.height)//2))
        sheet.paste(canvas.convert('RGB'),(index*480,0))
    sheet.save(str(target)+'_qa.jpg',quality=90)
    with Image.open(target) as check:
        check.load()
        if check.mode!='RGBA' or check.size!=original.size: raise ValueError('plr-png-verification-failed')
    return {'model':MODEL,'engine':'rembg-2.0.67-cpu','qa':qa,'durationMs':round((time.monotonic()-started)*1000),'width':original.width,'height':original.height}

for line in sys.stdin:
    try:
        job=json.loads(line); result=segment(job)
        print(json.dumps({'ok':True,'result':result}),flush=True)
    except Exception as error:
        print(json.dumps({'ok':False,'error':str(error)}),flush=True)
