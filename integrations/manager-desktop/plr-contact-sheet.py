import sys,json,math
from PIL import Image,ImageDraw,ImageFont
job=json.load(open(sys.argv[1],encoding='utf-8'))
items=job['items'][:24];columns=min(4,len(items));rows=math.ceil(len(items)/columns)
w=1280;cell=w//columns;header=180;h=header+rows*(cell+44)+70
sheet=Image.new('RGB',(w,h),(244,242,235));draw=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',42)
small=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',23)
title=job['title']
while draw.textbbox((0,0),title,font=font)[2]>w-80 and len(title)>1:title=title[:-2]
if title!=job['title']: title+='…'
draw.text((40,30),title,fill=(30,43,50),font=font)
draw.text((40,100),f"{job['total']} images  |  Static digital collection",fill=(80,94,100),font=small)
for index,item in enumerate(items):
    x=(index%columns)*cell;y=header+(index//columns)*(cell+44)
    tile=Image.new('RGBA',(cell-24,cell-24),(225,225,225,255))
    td=ImageDraw.Draw(tile)
    for cy in range(0,tile.height,20):
        for cx in range(0,tile.width,20):
            if (cx//20+cy//20)%2==0:td.rectangle((cx,cy,cx+19,cy+19),fill=(250,250,250,255))
    with Image.open(item['path']) as original:
        original.load();image=original.convert('RGBA');image.thumbnail((cell-48,cell-48))
    tile.alpha_composite(image,((tile.width-image.width)//2,(tile.height-image.height)//2))
    sheet.paste(tile.convert('RGB'),(x+12,y))
    draw.text((x+16,y+cell-15),f"#{item['ordinal']:04d}",fill=(60,73,80),font=small)
draw.text((40,h-50),f"Preview: first {len(items)} of {job['total']} selected images",fill=(80,94,100),font=small)
sheet.save(sys.argv[2],quality=92)
