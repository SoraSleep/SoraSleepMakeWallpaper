export async function providerResponse(response){
 if(response.ok)return response.json();
 let detail='';try{const value=await response.json();if(typeof value.error==='string')detail=value.error.split(/[\r\n]/)[0].replace(/https?:\/\/\S+/g,'[provider-url]').slice(0,240);}catch{}
 const error=Error('plr-image-dream-http-'+response.status+(detail?': '+detail:''));error.httpStatus=response.status;throw error;
}
