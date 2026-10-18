import sys,json
from PIL import Image,ImageDraw,ImageFont,ImageFilter

job=json.load(open(sys.argv[1],encoding='utf-8'))
source=Image.open(job['contactSheet']).convert('RGB')
w,h=1600,1200
canvas=Image.new('RGB',(w,h),(31,37,36))
background=source.resize((w,h)).filter(ImageFilter.GaussianBlur(18))
shade=Image.new('RGBA',(w,h),(18,26,24,178))
canvas.paste(background,(0,0));canvas=Image.alpha_composite(canvas.convert('RGBA'),shade)
preview=source.copy();preview.thumbnail((1180,760))
card=Image.new('RGB',(preview.width+30,preview.height+30),(247,243,234));card.paste(preview,(15,15))
canvas.alpha_composite(card.convert('RGBA'),((w-card.width)//2,300))
draw=ImageDraw.Draw(canvas)
bold=ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf',66)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',30)
title=job['title']
while draw.textbbox((0,0),title,font=bold)[2]>w-120 and len(title)>1:title=title[:-2]
if title!=job['title']:title+='…'
draw.text((60,55),title,fill=(255,252,244),font=bold)
background_label='transparent background' if job.get('transparentBackground',True) else 'original backgrounds'
draw.text((60,145),f"{job['totalImages']} {job.get('format','PNG')} files  •  {background_label}",fill=(222,215,198),font=small)
draw.text((60,1125),'Preview image — visual review before publishing',fill=(211,205,189),font=small)
canvas.convert('RGB').save(sys.argv[2],quality=93,optimize=True)
