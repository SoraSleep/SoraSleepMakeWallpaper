import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {loadRuntime} from './runtime-config.mjs';
const runtime=loadRuntime(),stage=path.resolve(process.env.SORASLEEP_DESKTOP_STAGE||'release-output/desktop-stage');
if(fs.existsSync(stage))throw Error('Use a new staging directory; existing builds are never overwritten');
const studio=path.join(stage,'payload/studio'),bundled=path.join(stage,'payload/runtime');fs.mkdirSync(studio,{recursive:true});
const filter=source=>!['node_modules','__pycache__','.git'].includes(path.basename(source))&&!source.endsWith('.pyc')&&!source.endsWith('.test.mjs')&&!source.endsWith('.test.js');
for(const item of ['dist','integrations/manager-desktop','scripts/runtime-config.mjs','scripts/studio-launch.mjs','scripts/project-mirror.mjs','DESKTOP_INSTALL.md']){const target=path.join(studio,item);fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(item,target,{recursive:true,filter});}
for(const item of ['main.cjs','builder.cjs'])fs.copyFileSync(path.join('desktop',item),path.join(stage,item));
const sharp=createRequire(import.meta.url)('sharp');await sharp('desktop/icon.svg').png().toFile(path.join(stage,'icon.png'));
fs.writeFileSync(path.join(stage,'package.json'),JSON.stringify({name:'sorasleep-makewallpaper-desktop',version:'1.0.0',private:true,description:'SoraSleep wallpaper and static batch studio',author:'SoraSleep',main:'main.cjs',devDependencies:{electron:'44.7.0'}},null,2));
const copy=(source,target)=>{fs.mkdirSync(path.dirname(target),{recursive:true});fs.cpSync(source,target,{recursive:true,filter});};
copy(process.execPath,path.join(bundled,'node/node.exe'));
const locate=command=>execFileSync('where.exe',[command],{encoding:'utf8',windowsHide:true}).trim().split(/\r?\n/)[0];
for(const name of ['ffmpeg.exe','ffprobe.exe'])copy(locate(name),path.join(bundled,'bin',name));
const ffmpegRoot=path.dirname(path.dirname(locate('ffprobe.exe')));for(const name of ['LICENSE','README.txt'])if(fs.existsSync(path.join(ffmpegRoot,name)))copy(path.join(ffmpegRoot,name),path.join(bundled,'bin','FFmpeg-'+name));
const pythonBase=execFileSync(runtime.python,['-c','import sys;print(sys.base_prefix)'],{encoding:'utf8',windowsHide:true}).trim();
const pythonSite=execFileSync(runtime.python,['-c','import site;print(site.getsitepackages()[-1])'],{encoding:'utf8',windowsHide:true}).trim();
const pythonTarget=path.join(bundled,'python');fs.mkdirSync(pythonTarget,{recursive:true});
for(const entry of fs.readdirSync(pythonBase)){if(['include','libs','Scripts','tcl','Lib'].includes(entry))continue;copy(path.join(pythonBase,entry),path.join(pythonTarget,entry));}
fs.cpSync(path.join(pythonBase,'Lib'),path.join(pythonTarget,'Lib'),{recursive:true,filter:source=>filter(source)&&path.basename(source)!=='site-packages'&&path.basename(source)!=='test'});
copy(pythonSite,path.join(pythonTarget,'Lib/site-packages'));
for(const name of ['msvcp140.dll','msvcp140_1.dll','msvcp140_2.dll','concrt140.dll']){const file=path.join(process.env.SystemRoot,'System32',name);if(fs.existsSync(file))copy(file,path.join(pythonTarget,name));}
if(!runtime.models)throw Error('Configure segmentation models for the full offline runtime');copy(runtime.models,path.join(bundled,'models'));
const version=cmd=>execFileSync(cmd,['-version'],{encoding:'utf8',windowsHide:true}).split(/\r?\n/)[0];
fs.writeFileSync(path.join(bundled,'RUNTIME-NOTICES.txt'),'Bundled runtime inventory. Python packages retain their dist-info licenses. Python LICENSE.txt is bundled.\nNode.js: https://nodejs.org/en/about/previous-releases\nFFmpeg: https://ffmpeg.org/legal.html and https://www.gyan.dev/ffmpeg/builds/ (full build, GPL configuration). Source: https://github.com/GyanD/codexffmpeg/releases\nBiRefNet: https://github.com/ZhengPeng7/BiRefNet\n'+version(locate('ffmpeg.exe'))+'\n'+version(locate('ffprobe.exe'))+'\n');
// Node license comes from the installed distribution; do not silently omit notices.
const nodeLicense=path.join(path.dirname(process.execPath),'LICENSE');if(fs.existsSync(nodeLicense))copy(nodeLicense,path.join(bundled,'node/LICENSE'));
else{const response=await fetch('https://raw.githubusercontent.com/nodejs/node/'+process.version+'/LICENSE');if(!response.ok)throw Error('Cannot include Node license');fs.writeFileSync(path.join(bundled,'node/LICENSE'),await response.text());}
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
fs.writeFileSync(path.join(studio,'build-info.json'),JSON.stringify({commit,builtAt:new Date().toISOString(),bundledRuntimes:true,containsUserData:false},null,2));
const files=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else files.push({path:path.relative(stage,file).replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}}walk(path.join(stage,'payload'));
fs.writeFileSync(path.join(studio,'runtime-checksums.json'),JSON.stringify(files,null,2));
console.log(JSON.stringify({stage,files:files.length,megabytes:Math.round(files.reduce((n,f)=>n+f.bytes,0)/1048576),pythonVersion:execFileSync(path.join(pythonTarget,'python.exe'),['--version'],{encoding:'utf8',windowsHide:true}).trim(),containsUserData:false}));
