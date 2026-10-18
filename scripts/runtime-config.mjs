import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
export function loadRuntime({env=process.env,configPath=env.SORASLEEP_RUNTIME_CONFIG??path.resolve('runtime.local.json')}={}){
 const config=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath,'utf8')):{};
 const root=path.dirname(path.resolve(configPath)),resolve=value=>path.resolve(root,value);
 const dataRoot=resolve(env.SORASLEEP_PLR_STORE??config.dataRoot??path.join(env.LOCALAPPDATA??os.homedir(),'SoraSleepMakeWallpaper','PLRRuns'));
 const python=env.SORASLEEP_PLR_PYTHON??config.python;
 const models=env.SORASLEEP_PLR_MODELS??config.models;
 if(python)process.env.SORASLEEP_PLR_PYTHON=resolve(python);
 if(models)process.env.SORASLEEP_PLR_MODELS=resolve(models);
 const imageDreamUrl=env.SORASLEEP_IMAGE_DREAM_URL??config.imageDreamUrl??'http://127.0.0.1:17897';
 const url=new URL(imageDreamUrl);if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('runtime-image-dream-must-be-local');
 const port=Number(env.SORASLEEP_PLR_PORT??config.port??17930);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('runtime-port-invalid');
 return{dataRoot,imageDreamUrl,port,backend:path.resolve('integrations/manager-desktop'),imageDreamRoot:env.SORASLEEP_IMAGE_DREAM_ROOT??(config.imageDreamRoot?resolve(config.imageDreamRoot):null),python:process.env.SORASLEEP_PLR_PYTHON??'python',models:process.env.SORASLEEP_PLR_MODELS??null};
}
