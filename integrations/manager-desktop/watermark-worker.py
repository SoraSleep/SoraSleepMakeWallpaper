"""Remove recognized provider glyphs only. Originals and unmasked RGBA stay intact."""
import sys, json, hashlib
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
Image.MAX_IMAGE_PIXELS=40_000_000
TEMPLATES=Path(__file__).with_name('watermark-templates')
RECIPE='known-provider-marks-lama-v2'

_session=None
MODEL_SHA256='7df918ac3921d3daf0aae1d219776cf0dc4e4935f035af81841b40adcf74fdf2'
def restore_texture(rgb,mask):
    """LaMa on a bounded corner crop; only masked pixels are composited back."""
    global _session
    if _session is None:
        import os,onnxruntime as ort
        model=Path(os.environ.get('SORASLEEP_PLR_MODELS','runtime/models/plr'))/'inpainting_lama_2025jan.onnx'
        if not model.exists():raise ValueError('watermark-inpainting-model-missing')
        if hashlib.sha256(model.read_bytes()).hexdigest()!=MODEL_SHA256:raise ValueError('watermark-inpainting-model-changed')
        options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
        _session=ort.InferenceSession(str(model),sess_options=options,providers=['CPUExecutionProvider'])
    h,w=mask.shape;side=max(h,w);square=cv2.copyMakeBorder(rgb,0,side-h,0,side-w,cv2.BORDER_REFLECT_101)
    square_mask=cv2.copyMakeBorder(mask,0,side-h,0,side-w,cv2.BORDER_CONSTANT,value=0)
    image=cv2.resize(square,(512,512))[:,:,::-1].astype('float32')/255
    image=np.ascontiguousarray(image.transpose(2,0,1)[None])
    hole=(cv2.resize(square_mask,(512,512),interpolation=cv2.INTER_NEAREST)>0).astype('float32')[None,None]
    output=_session.run(None,{'image':image,'mask':hole})[0][0].transpose(1,2,0)
    output=np.clip(output,0,255).astype('uint8')[:,:,::-1]
    return cv2.resize(output,(side,side))[:h,:w]

def detect(rgba):
    h,w=rgba.shape[:2]; short=min(w,h); findings=[]
    alpha=rgba[:,:,3:4].astype('float32')/255
    visible=rgba[:,:,:3].astype('float32')*alpha+127*(1-alpha)
    gray=cv2.cvtColor(visible,cv2.COLOR_RGB2GRAY)
    config=json.loads((TEMPLATES/'templates.json').read_text())
    for item in config['templates']:
        reference=cv2.imread(str(TEMPLATES/item['file']),cv2.IMREAD_GRAYSCALE)
        if item['name']=='ai-badge': x,y,rw,rh=0,0,min(w,round(short*.22)),min(h,round(short*.22))
        else:
            rw,rh=min(w,round(short*.85)),min(h,round(short*.23));x,y=w-rw,h-rh
        roi=gray[y:y+rh,x:x+rw];best=None
        def match_scale(scale):
            tw,th=round(reference.shape[1]*scale),round(reference.shape[0]*scale)
            if min(tw,th)<12 or tw>=rw or th>=rh:return None
            template=cv2.resize(reference,(tw,th),interpolation=cv2.INTER_LINEAR).astype('float32')/255
            high=np.maximum(roi-cv2.GaussianBlur(roi,(0,0),max(.8,5*scale)),0)
            if float(high.max())<.1:return None
            scores=cv2.matchTemplate(high,template,cv2.TM_CCOEFF_NORMED)
            # Normalized correlation is undefined on constant windows. OpenCV
            # may return 1 there from floating-point cancellation, not a logo.
            integral=cv2.integral(high);square=cv2.integral(high*high);area=tw*th
            mean=(integral[th:,tw:]-integral[:-th,tw:]-integral[th:,:-tw]+integral[:-th,:-tw])/area
            variance=(square[th:,tw:]-square[:-th,tw:]-square[th:,:-tw]+square[:-th,:-tw])/area-mean*mean
            scores[(variance<.35**2)|~np.isfinite(scores)]=-1
            # Provider marks are anchored to the corner. Interior illustration
            # details must not trigger a badge match after an alpha crop.
            if item['name']=='ai-badge':
                inset=max(40,round(short*.035));scores[inset:,:]=-1;scores[:,inset:]=-1
            _,score,_,point=cv2.minMaxLoc(scores)
            return {'name':item['name'],'score':float(score),'box':[x+point[0],y+point[1],tw,th],'scale':scale,'template':template}
        candidates=[]
        for factor in [.5,.55,.6,.65,.7,.75,.8,.85,.9,.95,1.,1.05,1.1,1.15,1.2,1.3,1.4,1.5,1.6]:
            candidate=match_scale(short/item['referenceShortSide']*factor)
            if candidate:candidates.append(candidate)
            if candidate and (best is None or candidate['score']>best['score']):best=candidate
        if best and best['score']>.22:
            # Low-contrast badges can give a false local maximum at a nearby size.
            # Refine three independent coarse peaks instead of locking onto one.
            for peak in sorted(candidates,key=lambda item:item['score'],reverse=True)[:3]:
                coarse=peak['scale']
                for factor in np.arange(.95,1.055,.005):
                    candidate=match_scale(coarse*factor)
                    if candidate and candidate['score']>best['score']:best=candidate
        if best: findings.append(best)
    return findings

def process(job):
    source=Path(job['source']); before=source.read_bytes()
    if hashlib.sha256(before).hexdigest()!=job['sourceSha256']:raise ValueError('watermark-source-changed')
    with Image.open(source) as im:
        im.load(); rgba=np.asarray(im.convert('RGBA')).copy()
    h,w=rgba.shape[:2];findings=detect(rgba);mask=np.zeros((h,w),np.uint8);records=[]
    for match in findings:
        record={key:match[key] for key in ['name','score','box']};record['detected']=match['score']>=.40;records.append(record)
        if .28<=match['score']<.40:raise ValueError('watermark-ambiguous-'+match['name'])
        if not record['detected']:continue
        x,y,tw,th=match['box'];glyph=(match['template']>0.20).astype('uint8')*255
        close=max(3,round(5*match['scale'])|1);glyph=cv2.morphologyEx(glyph,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(close,close)))
        flat_badge=match['name']=='ai-badge' and float(cv2.cvtColor(rgba[y:y+th,x:x+tw,:3],cv2.COLOR_RGB2GRAY).std())<7
        if match['name']=='dreamina-logo' or flat_badge:
            contours,_=cv2.findContours(glyph,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);cv2.drawContours(glyph,contours,-1,255,cv2.FILLED)
        if flat_badge:glyph[:]=255
        radius=max(2,round(3*match['scale']));glyph=cv2.dilate(glyph,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(radius*2+1,radius*2+1)))
        # Include the mark's shadow/antialiasing, not just its bright strokes.
        # LaMa needs the whole badge hidden to avoid reconstructing partial letters.
        margin=max(3,round(4*match['scale']))
        mask[max(0,y-margin):min(h,y+th+margin),max(0,x-margin):min(w,x+tw+margin)]=255
    pixels=int((mask>0).sum())
    if pixels>w*h*.05:raise ValueError('watermark-mask-too-large')
    result=rgba.copy()
    if pixels:
        # Process bounded corner crops, not a full-frame inpaint. Copy back masked pixels only.
        for record in records:
            if not record['detected']:continue
            x,y,tw,th=record['box'];pad=max(40,round(min(w,h)*.05))
            side=min(w,h,max(tw,th)+2*pad)
            x0=max(0,min(w-side,x+tw//2-side//2));y0=max(0,min(h-side,y+th//2-side//2));x1,y1=x0+side,y0+side
            local=mask[y0:y1,x0:x1];crop=rgba[y0:y1,x0:x1];fixed=cv2.inpaint(crop[:,:,:3].copy(),local,5,cv2.INPAINT_TELEA)
            if float(cv2.cvtColor(crop[:,:,:3],cv2.COLOR_RGB2GRAY).std())>12:
                fixed=restore_texture(crop[:,:,:3].copy(),local)
            target=result[y0:y1,x0:x1];target[:,:,:3][local>0]=fixed[local>0]
            if np.any(crop[:,:,3]<255):
                alpha=cv2.inpaint(crop[:,:,3].copy(),local,3,cv2.INPAINT_TELEA);target[:,:,3][local>0]=alpha[local>0]
    if not np.array_equal(rgba[mask==0],result[mask==0]):raise ValueError('watermark-outside-mask-changed')
    residual=[{'name':item['name'],'score':item['score']} for item in detect(result)] if pixels else []
    if any(item['score']>=.28 for item in residual):
        if job.get('diagnosticTarget'):Image.fromarray(result).save(job['diagnosticTarget'])
        raise ValueError('watermark-residual-review-required:'+','.join(item['name']+'='+str(round(item['score'],3)) for item in residual))
    if hashlib.sha256(source.read_bytes()).hexdigest()!=job['sourceSha256']:raise ValueError('watermark-source-changed')
    target=Path(job['target']);Image.fromarray(result).save(target,format='PNG')
    if job.get('maskTarget'):Image.fromarray(mask).save(job['maskTarget'])
    return {'recipe':RECIPE,'width':w,'height':h,'maskedPixels':pixels,'regions':records,'residual':residual,'status':'known-marks-processed' if pixels else 'no-known-marks-detected','outsideMaskUnchanged':True,'originalUnchanged':True,'aiGeneratedProvenanceRetained':True,'aestheticReviewRequired':True}

if __name__=='__main__':
    try:print(json.dumps({'ok':True,**process(json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig')))}))
    except Exception as error:print(json.dumps({'ok':False,'error':str(error)}));sys.exit(1)
