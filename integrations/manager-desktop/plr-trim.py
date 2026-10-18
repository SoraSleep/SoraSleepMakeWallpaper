"""Crop transparent margins without resizing or changing visible RGBA pixels."""
import hashlib, json, sys
from pathlib import Path
from PIL import Image

job=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
results=[]
for item in job['items']:
    source=Path(item['source']); target=Path(item['target'])
    if hashlib.sha256(source.read_bytes()).hexdigest()!=item['sha256']:
        raise ValueError('plr-trim-source-changed')
    with Image.open(source) as image:
        image.load()
        if image.mode!='RGBA': raise ValueError('plr-trim-rgba-required')
        bbox=image.getchannel('A').getbbox()
        if bbox is None: raise ValueError('plr-trim-empty-alpha')
        width,height=bbox[2]-bbox[0],bbox[3]-bbox[1]
        side=max(1,int(max(width,height)*1.2+0.99999))
        if side>max(image.size)*2: raise ValueError('plr-trim-size-invalid')
        output=Image.new('RGBA',(side,side),(0,0,0,0))
        # Only copy source pixels. There is no geometric resampling or upscaling.
        output.paste(image.crop(bbox),((side-width)//2,(side-height)//2))
        output.save(target,format='PNG')
        with Image.open(target) as check:
            check.load()
            if check.mode!='RGBA' or check.size!=(side,side): raise ValueError('plr-trim-output-invalid')
            region=check.crop(((side-width)//2,(side-height)//2,(side-width)//2+width,(side-height)//2+height))
            if region.tobytes()!=image.crop(bbox).tobytes(): raise ValueError('plr-trim-visible-pixels-changed')
        results.append({'ordinal':item['ordinal'],'sourceWidth':image.width,'sourceHeight':image.height,'width':side,'height':side,'foregroundBbox':list(bbox),'pixelResampled':False})
print(json.dumps({'recipe':'alpha-square-trim-v1','items':results}))
