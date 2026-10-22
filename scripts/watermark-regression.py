"""Replay existing real images only. No provider calls and no credits.

Usage: python scripts/watermark-regression.py --batch batch/report.json
       --output real-test-output/watermark-fix/final --models path/to/models
"""
import argparse,hashlib,importlib.util,json,os,time
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

parser=argparse.ArgumentParser();parser.add_argument('--batch',required=True);parser.add_argument('--output',required=True);parser.add_argument('--models',required=True);parser.add_argument('--ordinals',nargs='+',type=int);parser.add_argument('--append',action='store_true')
args=parser.parse_args();root=Path(__file__).resolve().parent.parent
os.environ['SORASLEEP_PLR_MODELS']=str(Path(args.models).resolve());cv2.setNumThreads(2)
spec=importlib.util.spec_from_file_location('wm',root/'integrations/manager-desktop/watermark-worker.py');wm=importlib.util.module_from_spec(spec);spec.loader.exec_module(wm)
out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
rows=json.loads(Path(args.batch).read_text(encoding='utf-8-sig'))['items']
selected=set(args.ordinals or [1,2,5,6,8,11,16,21,26,28,29,41]);results=json.loads((out/'report.json').read_text())['items'] if args.append and (out/'report.json').exists() else []
recipe=hashlib.sha256((root/'integrations/manager-desktop/watermark-worker.py').read_bytes()).hexdigest()
def persist():
    (out/'report.json').write_text(json.dumps({'workerSha256':recipe,'generationRequests':0,'creditsUsed':0,'items':results},indent=2),encoding='utf-8')
for row in rows:
    if row['ordinal'] not in selected:continue
    label=str(row['ordinal']);source=Path(row['artifact']['file']);target=out/(label+'.png');mask=out/(label+'-mask.png')
    before=hashlib.sha256(source.read_bytes()).hexdigest();start=time.perf_counter()
    result=wm.process({'source':str(source),'sourceSha256':before,'target':str(target),'maskTarget':str(mask)})
    assert sum(r['detected'] for r in result['regions'])==2,(label,result)
    a=np.asarray(Image.open(source).convert('RGBA'));b=np.asarray(Image.open(target).convert('RGBA'));m=np.asarray(Image.open(mask))
    assert a.shape==b.shape
    assert np.array_equal(a[m==0],b[m==0])
    assert hashlib.sha256(source.read_bytes()).hexdigest()==before
    assert result['maskedPixels']<a.shape[0]*a.shape[1]*.02
    results.append({'workerSha256':recipe,'ordinal':row['ordinal'],'source':str(source),'output':str(target),'sourceSha256':before,'outputSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'seconds':time.perf_counter()-start,**result})
    persist();print(json.dumps({'ordinal':label,'passed':True,'seconds':results[-1]['seconds'],'warnings':result['warnings']}),flush=True)
for name in ['wallpaper.jpg','wallpaper-variant-pink.png']:
    source=root/'public/demo'/name;result=wm.process({'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'target':str(out/(name+'.png'))})
    assert result['maskedPixels']==0
    results.append({'control':name,'passed':True,**result});persist()
for label in ['1','2']:
    source=out/(label+'.png');result=wm.process({'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'target':str(out/(label+'-repeat.png'))})
    assert result['maskedPixels']==0,(label,result)
    results.append({'repeat':label,'passed':True,**result});persist()
print(json.dumps({'passed':True,'realImages':len(selected),'cleanControls':2,'repeatedCleanup':2,'creditsUsed':0}),flush=True)
