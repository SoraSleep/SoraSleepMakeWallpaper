const configured=document.querySelector<HTMLMetaElement>('meta[name="sorasleep-manager"]')?.content;
const endpoint=new URL(configured||'http://127.0.0.1:17930');
if(endpoint.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(endpoint.hostname)||endpoint.username||endpoint.password)throw Error('Manager endpoint must be local');
export const managerBase=endpoint.origin;
