"""Build glyph-only detection masks from a varied, local generated-image corpus."""
import sys, json
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
root=Path(sys.argv[1]); out=Path(sys.argv[2]); out.mkdir(parents=True,exist_ok=True)
files=list(root.glob('**/source.*'))
images=[]
for file in files:
    try:
        with Image.open(file) as im:
            if im.size==(2560,1440): images.append(file)
    except Exception: pass
if len(images)<20: raise ValueError('At least20 diverse native sources required')
result=[]
for name,rect in [('ai-badge',(0,0,180,170)),('dreamina-logo',(1770,1250,790,190))]:
    x,y,w,h=rect; values=[]
    for file in images:
        with Image.open(file) as im: gray=np.asarray(im.convert('L').crop((x,y,x+w,y+h)),dtype=np.float32)
        values.append(gray-cv2.GaussianBlur(gray,(0,0),5))
    stack=np.stack(values); median=np.median(stack,axis=0)
    mask=((median>4)&((stack>3).mean(axis=0)>.78)).astype('uint8')*255
    count,labels,stats,_=cv2.connectedComponentsWithStats(mask)
    for i in range(1,count):
        if stats[i,cv2.CC_STAT_AREA]<4: mask[labels==i]=0
    yy,xx=np.where(mask>0)
    if len(xx)<50: raise ValueError('Template insufficient: '+name)
    box=(max(0,int(xx.min())-8),max(0,int(yy.min())-8),min(w,int(xx.max())+9),min(h,int(yy.max())+9))
    mask=mask[box[1]:box[3],box[0]:box[2]]
    cv2.imwrite(str(out/(name+'.png')),mask)
    result.append({'name':name,'file':name+'.png','referenceShortSide':1440,'referenceBox':[x+box[0],y+box[1],mask.shape[1],mask.shape[0]],'pixels':int((mask>0).sum())})
(out/'templates.json').write_text(json.dumps({'schemaVersion':1,'recipe':'dreamina-glyphs-v1','trainingImages':len(images),'templates':result},indent=2))
print(json.dumps(result))
