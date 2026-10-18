import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {createPlrApi} from './plr-api.mjs';import {createPlrStore} from './plr-store.mjs';
test('real HTTP import/read500; stable retry; hostile origins and writes rejected',async()=>{
 const store=createPlrStore({root:mkdtempSync(path.join(tmpdir(),'sorasleep-plr-api-'))}),api=createPlrApi({store,port:0});await api.listen();const base='http://127.0.0.1:'+api.server.address().port;
 try{const input={requestKey:randomUUID(),title:'Spring',filename:'500.txt',preset:{productKind:'background-art',model:'high_aes_general_v50',resolution:'2k',aspectRatio:'1:1',maxCredits:15},rows:Array.from({length:500},(_,i)=>({prompt:'  Scene '+i+'  '}))};
 const headers={'Content-Type':'application/json',Origin:'http://127.0.0.1:5173','X-SoraSleep-Bridge':'1'},body=JSON.stringify(input);
 const created=await fetch(base+'/runs',{method:'POST',headers,body});assert.equal(created.status,201);const run=await created.json();assert.equal(run.totalRows,500);
 const again=await(await fetch(base+'/runs',{method:'POST',headers,body})).json();assert.equal(again.id,run.id);
 const page=await(await fetch(base+'/runs/'+run.id+'?offset=499&limit=1')).json();assert.equal(page.items[0].rawPrompt,input.rows[499].prompt);
 assert.equal((await fetch(base+'/runs',{method:'POST',headers:{'Content-Type':'application/json'},body})).status,403);
 assert.equal((await fetch(base+'/capabilities',{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await fetch(base+'/runs',{method:'POST',headers,body:'bad-json'})).status,400);
 assert.equal((await(await fetch(base+'/capabilities')).json()).generation,true);
 }finally{await api.close();}
});
