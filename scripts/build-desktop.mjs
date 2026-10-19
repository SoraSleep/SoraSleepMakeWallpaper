import path from 'node:path';import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),stage=path.resolve(process.env.SORASLEEP_DESKTOP_STAGE||path.join('release-output','desktop-'+new Date().toISOString().replace(/[:.]/g,'-')));
function run(args,env=process.env){const result=spawnSync(process.execPath,args,{stdio:'inherit',windowsHide:true,env});if(result.status!==0)process.exit(result.status||1);}
run(['scripts/prepare-desktop.mjs'],{...process.env,SORASLEEP_DESKTOP_STAGE:stage});
run([require.resolve('electron-builder/cli.js'),'--projectDir',stage,'--config','builder.cjs','--win','--x64','--publish','never'],{...process.env,ELECTRON_BUILDER_COMPRESSION_LEVEL:process.env.ELECTRON_BUILDER_COMPRESSION_LEVEL||'5'});
