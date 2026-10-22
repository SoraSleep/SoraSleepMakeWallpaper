"""Check native portrait/square/alpha inputs without calling a generator."""
import argparse,hashlib,importlib.util,json,os,time
from pathlib import Path
import cv2,numpy as np
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--models',required=True);parser.add_argument('files',nargs='+');args=parser.parse_args()
os.environ['SORASLEEP_PLR_MODELS']=args.models;cv2.setNumThreads(2)
spec=importlib.util.spec_from_file_location('wm',Path(__file__).resolve().parent.parent/'integrations/manager-desktop/watermark-worker.py');wm=importlib.util.module_from_spec(spec);spec.loader.exec_module(wm)
out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True);results=[]
for i,file in enumerate(args.files):
    source=Path(file);target=out/(str(i)+'.png');mask=out/(str(i)+'-mask.png');before=hashlib.sha256(source.read_bytes()).hexdigest();start=time.perf_counter()
    report=wm.process({'source':str(source),'sourceSha256':before,'target':str(target),'maskTarget':str(mask)})
    a=np.asarray(Image.open(source).convert('RGBA'));b=np.asarray(Image.open(target).convert('RGBA'));m=np.asarray(Image.open(mask))
    assert a.shape==b.shape;assert np.array_equal(a[m==0],b[m==0]);assert hashlib.sha256(source.read_bytes()).hexdigest()==before
    assert sum(r['detected'] for r in report['regions'])==2,(source,report)
    results.append({'source':str(source),'output':str(target),'seconds':time.perf_counter()-start,**report})
    (out/'report.json').write_text(json.dumps({'generationRequests':0,'creditsUsed':0,'items':results},indent=2),encoding='utf-8');print(json.dumps({'file':str(source),'seconds':results[-1]['seconds'],'warnings':report['warnings']}),flush=True)
