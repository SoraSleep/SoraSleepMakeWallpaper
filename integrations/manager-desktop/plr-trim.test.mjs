import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const python=process.env.SORASLEEP_PLR_PYTHON||'D:/SoraSleep Main/Runtime/Python/plr/Scripts/python.exe';
test('transparent square trim preserves every visible RGBA pixel without upscaling',()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'plr-trim-'));
 const source=path.join(folder,'source.png'),target=path.join(folder,'trimmed.png'),config=path.join(folder,'input.json');
 execFileSync(python,['-c',`from PIL import Image\nimport sys\ni=Image.new('RGBA',(200,200),(0,0,0,0))\nfor y in range(70,130):\n for x in range(40,90): i.putpixel((x,y),(x%255,y%255,200,255 if x>40 else 3))\ni.save(sys.argv[1])`,source]);
 const before=createHash('sha256').update(readFileSync(source)).digest('hex');
 writeFileSync(config,JSON.stringify({items:[{source,target,sha256:before,ordinal:1}]}));
 const result=JSON.parse(execFileSync(python,[fileURLToPath(new URL('./plr-trim.py',import.meta.url)),config],{encoding:'utf8'}));
 assert.equal(result.recipe,'alpha-square-trim-v1');assert.equal(result.items[0].pixelResampled,false);
 assert.equal(createHash('sha256').update(readFileSync(source)).digest('hex'),before);
 const check=execFileSync(python,['-c',`from PIL import Image\nimport sys\na=Image.open(sys.argv[1]);b=Image.open(sys.argv[2]);assert a.crop(a.getchannel('A').getbbox()).tobytes()==b.crop(b.getchannel('A').getbbox()).tobytes()\nassert b.width==b.height<200\nprint('pixels-preserved')`,source,target],{encoding:'utf8'});
 assert.match(check,/pixels-preserved/);
});
