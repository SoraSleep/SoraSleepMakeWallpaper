export const PRODUCTION_WORKFLOW_VERSION = 1;
export const PRODUCTION_WORKFLOWS = [
 {id:'pair-reveal',name:'A/B Reveal',requiresB:true},
 {id:'landscape',name:'Landscape Collection',requiresB:false},
 {id:'stock',name:'Stock Collection',requiresB:false},
 {id:'character-wardrobe',name:'Character Wardrobe Reveal',requiresB:true},
];
export function productionFields(input={}) {
 const workflowType=input.workflowType??'pair-reveal';
 const workflow=PRODUCTION_WORKFLOWS.find(w=>w.id===workflowType);
 if(!workflow)throw new Error('unsupported-workflow');
 const collectionId=input.collectionId??null;
 if(collectionId!==null&&(typeof collectionId!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(collectionId)))throw new Error('invalid-collection-id');
 const concept=input.concept??{};
 if(!concept||typeof concept!=='object'||Array.isArray(concept))throw new Error('invalid-concept');
 const fields={};for(const key of ['title','season','theme','mood','palette','styleGuide']){
  const value=concept[key]??'';if(typeof value!=='string'||value.length>2000)throw new Error('invalid-concept-'+key);fields[key]=value.trim();
 }
 const defaultExport=workflowType==='stock'?'stock-image':workflow.requiresB?'windows-web':'static-image';
 const exportProfile=input.exportProfile??defaultExport;
 const allowed=workflowType==='stock'?['stock-image']:workflow.requiresB?['windows-web','android-video','static-image']:['static-image','android-video','windows-web'];
 if(!allowed.includes(exportProfile))throw new Error('unsupported-workflow-export');
 return{workflowSchemaVersion:PRODUCTION_WORKFLOW_VERSION,workflowType,collectionId,concept:fields,exportProfile,requiresB:workflow.requiresB};
}
/** Additive read migration: never rewrites an existing project or revision. */
export function normalizeArtworkPlan(plan){
 const fields=productionFields(plan);
 return{...plan,...fields};
}
