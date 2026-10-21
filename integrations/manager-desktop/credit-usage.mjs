export function creditUsage(run,rows,quote,now=Date.now()){
 const reservedCredits=rows.reduce((sum,row)=>sum+row.attempts.reduce((n,a)=>n+(a.creditsReserved??0),0),0);
 const queuedPrompts=rows.filter(r=>r.selected&&r.status==='queued').length;
 const activeAttempts=rows.filter(r=>['dispatching','submitted','submission_uncertain'].includes(r.status)).length;
 return{maxCredits:run.preset.maxCredits,reservedCredits,remainingBudget:Math.max(0,run.preset.maxCredits-reservedCredits),queuedPrompts,activeAttempts,quoteCurrent:!!quote&&quote.reservedCredits===reservedCredits&&quote.remainingRows===queuedPrompts&&quote.expiresAt>now};
}
