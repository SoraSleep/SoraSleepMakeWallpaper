"""Render local before/after evidence from existing regression reports."""
import json,html
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent.parent;out=root/'real-test-output/watermark-fix'
report=json.loads((out/'final-v3/report.json').read_text());items=[r for r in report['items'] if 'ordinal' in r]
formats=out/'formats-v3/report.json'
if formats.exists():items+=json.loads(formats.read_text())['items']
cards=[];grid=Image.new('RGB',(1440,((len(items)+3)//4)*190),'#111b20');draw=ImageDraw.Draw(grid)
for i,row in enumerate(items):
    a=Image.open(row['source']).convert('RGB');b=Image.open(row['output']).convert('RGB');w,h=a.size
    x=(i%4)*360;y=(i//4)*190;label=str(row.get('ordinal','format '+str(i+1)))
    draw.text((x+4,y+4),label+' SOURCE / OUTPUT',fill='white')
    for col,im in enumerate([a,b]):grid.paste(im.crop((0,0,180,150)),(x+col*180,y+25))
    comparison=Image.new('RGB',(1400,470),'#111b20');d=ImageDraw.Draw(comparison)
    for col,im in enumerate([a,b]):
        d.text((col*700+8,6),'SOURCE' if col==0 else 'OUTPUT',fill='white')
        comparison.paste(im.crop((0,0,240,180)),(col*700,30))
        comparison.paste(im.crop((max(0,w-700),max(0,h-210),w,h)),(col*700,250))
    name='comparison-'+str(i+1)+'.jpg';comparison.save(out/name,quality=97)
    warnings=', '.join(row.get('warnings',[])) or 'Không có cảnh báo từ bộ dò'
    cards.append(f'<article><h2>Ảnh {html.escape(label)} · {w}×{h}</h2><p>{row["seconds"]:.1f}s · {row["maskedPixels"]:,} pixel trong mặt nạ · {html.escape(warnings)}</p><img src="{name}" alt="Hai góc ảnh gốc và đầu ra"><p><a href="{Path(row["output"]).as_uri()}">Mở PNG gốc để kiểm tra 100%</a></p></article>')
grid.save(out/'ai-corners.jpg',quality=97)
(out/'review.html').write_text('''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Watermark fix — kiểm tra đầu ra</title><style>body{background:#10191e;color:#e5ece9;font:16px/1.6 system-ui;margin:30px auto;max-width:1440px;padding:20px}article{border:1px solid #43554d;border-radius:16px;padding:20px;margin:24px 0}img{max-width:100%;height:auto}a{color:#c9ef92}h1,h2{line-height:1.3}</style><h1>Kiểm tra sửa watermark</h1><p>Dùng lại ảnh thật đã có. Không gen mới, không dùng credits. Giữ nguyên kích thước và mọi pixel ngoài mặt nạ. Có cảnh báo nghĩa là cần so sánh kỹ hoặc nhập PNG đã sửa, không phải ảnh đã được tự động duyệt để bán.</p><p>Phục hồi nền là nội suy, không bảo đảm khôi phục chính xác chi tiết nằm dưới dấu. Mọi gói sản phẩm vẫn cần duyệt thủ công.</p>'''+''.join(cards),encoding='utf-8')
print(json.dumps({'images':len(items),'review':str(out/'review.html')}))
