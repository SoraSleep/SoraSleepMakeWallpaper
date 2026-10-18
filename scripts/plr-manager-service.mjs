import path from 'node:path';
import {pathToFileURL} from 'node:url';
const manager='D:/SoraSleep Main/Manager/desktop';
const {createPlrStore}=await import(pathToFileURL(path.join(manager,'plr-store.mjs')));
const {createPlrApi}=await import(pathToFileURL(path.join(manager,'plr-api.mjs')));
const root=path.resolve('D:/SoraSleep Main/Data/Manager/PLRRuns');
const api=createPlrApi({store:createPlrStore({root}),port:17930});await api.listen();
console.log('Manager PLR source backend listening at http://127.0.0.1:17930; import/read, preflight, generation, image processing, QA, ZIP and automatic workflow enabled.');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await api.close();process.exit(0);});
