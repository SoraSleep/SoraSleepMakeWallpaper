const {app,BrowserWindow,dialog,Menu,shell}=require('electron');
const {spawn}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
let backend,window,quitting=false,closing=false;const pending=new Map();
app.setPath('userData',process.env.SORASLEEP_DESKTOP_DATA||path.join(app.getPath('appData'),'SoraSleepMakeWallpaper'));
if(!app.requestSingleInstanceLock()){app.quit();}else{
app.on('second-instance',()=>{window?.show();window?.focus();});
app.whenReady().then(start).catch(error=>{dialog.showErrorBox('Không thể mở SoraSleep MakeWallpaper',error.message);quitting=true;app.quit();});
}
function status(){return new Promise((resolve,reject)=>{if(!backend?.connected)return reject(Error('Backend không kết nối.'));const id=Date.now()+Math.random(),timer=setTimeout(()=>{pending.delete(id);reject(Error('Backend chưa phản hồi; hãy thử đóng lại sau.'));},5000);pending.set(id,value=>{clearTimeout(timer);resolve(value);});backend.send({type:'status',id});});}
async function requestClose(){if(closing||quitting)return;closing=true;try{const busy=await status();if(busy){await dialog.showMessageBox(window,{type:'info',title:'Đang xử lý',message:'Ứng dụng đang có tác vụ. Hãy tạm dừng và chờ tác vụ hiện tại hoàn thành trước khi đóng.',buttons:['Tiếp tục làm việc']});return;}quitting=true;backend.send({type:'shutdown'});}catch(error){await dialog.showMessageBox(window,{type:'warning',message:error.message,buttons:['Giữ ứng dụng mở']});}finally{closing=false;}}
async function start(){
 const resources=process.env.SORASLEEP_DESKTOP_RESOURCES||process.resourcesPath,studio=path.join(resources,'studio'),runtime=path.join(resources,'runtime');
 const data=process.env.SORASLEEP_DESKTOP_DATA||app.getPath('userData');fs.mkdirSync(data,{recursive:true});
 const configPath=path.join(data,'runtime.local.json');if(!fs.existsSync(configPath))fs.writeFileSync(configPath,JSON.stringify({dataRoot:path.join(data,'PLRRuns'),port:17932,imageDreamUrl:'http://127.0.0.1:17897'},null,2));
 const log=fs.openSync(path.join(data,'desktop-backend.log'),'a');
 backend=spawn(path.join(runtime,'node','node.exe'),['scripts/studio-launch.mjs'],{cwd:studio,windowsHide:true,stdio:['ignore',log,log,'ipc'],env:{...process.env,PATH:path.join(runtime,'bin')+';'+path.dirname(process.execPath)+';'+path.join(process.env.SystemRoot||'C:\\Windows','System32'),PYTHONHOME:path.join(runtime,'python'),PYTHONPATH:'',PYTHONNOUSERSITE:'1',NUMBA_CACHE_DIR:path.join(data,'Cache','numba'),SORASLEEP_RUNTIME_CONFIG:configPath,SORASLEEP_PLR_PYTHON:path.join(runtime,'python','python.exe'),SORASLEEP_PLR_MODELS:path.join(runtime,'models'),SORASLEEP_DESKTOP_PID:String(process.pid)}});
 fs.closeSync(log);
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Khởi động quá thời gian. Xem desktop-backend.log trong '+data)),30000);backend.on('message',message=>{if(message.type==='ready'){clearTimeout(timer);resolve();}if(message.type==='status'){pending.get(message.id)?.(message.busy);pending.delete(message.id);}});backend.once('error',reject);backend.once('exit',code=>{clearTimeout(timer);if(quitting){app.quit();return;}reject(Error('Backend dừng ('+code+'). Đóng launcher portable nếu cổng17880 đang được sử dụng. Log: '+data));if(window){dialog.showErrorBox('Backend đã dừng','Hãy mở lại ứng dụng. Tác vụ được lưu trong '+data);quitting=true;app.quit();}});});
 window=new BrowserWindow({width:1440,height:960,minWidth:390,minHeight:640,title:'SoraSleep MakeWallpaper',backgroundColor:'#101512',show:false,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Ứng dụng',submenu:[{label:'Mở thư mục dữ liệu',click:()=>shell.openPath(data)},{label:'Mở Image Dream',click:async()=>{const config=JSON.parse(fs.readFileSync(configPath,'utf8'));let provider=config.imageDreamExecutable;if(!provider||!fs.existsSync(provider)){const selected=await dialog.showOpenDialog(window,{title:'Chọn SoraSleep Image Dream.exe đã cài',properties:['openFile'],filters:[{name:'Image Dream',extensions:['exe']}]});if(selected.canceled)return;provider=selected.filePaths[0];if(path.basename(provider)!=='SoraSleep Image Dream.exe')return dialog.showMessageBox(window,{message:'Hãy chọn đúng SoraSleep Image Dream.exe.',buttons:['Đã hiểu']});config.imageDreamExecutable=provider;fs.writeFileSync(configPath,JSON.stringify(config,null,2));}shell.openPath(provider);}},{type:'separator'},{label:'Đóng',click:requestClose}]},{label:'Hiển thị',submenu:[{role:'reload'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}]));
 window.webContents.setWindowOpenHandler(({url})=>{if(/^https?:/.test(url))shell.openExternal(url);return{action:'deny'};});
 window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!=='http://127.0.0.1:17880')event.preventDefault();});
 window.webContents.session.on('will-download',(_event,item)=>{item.setSaveDialogOptions({title:'Lưu sản phẩm',defaultPath:path.join(app.getPath('downloads'),path.basename(item.getFilename()))});});
 window.on('close',event=>{if(!quitting){event.preventDefault();requestClose();}});
 await window.loadURL('http://127.0.0.1:17880');window.show();
}
app.on('before-quit',event=>{if(backend&&!quitting){event.preventDefault();requestClose();}});
app.on('window-all-closed',()=>{if(quitting)app.quit();});
