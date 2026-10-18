import {productionFields} from './production-contract.mjs';
/** Deterministic planning template. It does not claim to understand or verify image content. */
export function createArtworkPlan(input) {
  if (typeof input?.prompt !== 'string' || !input.prompt.trim() || input.prompt.length > 8000) throw new Error('invalid-prompt');
  const production=productionFields(input);
  const presetId = production.requiresB ? input.presetId ?? 'portal-reveal' : null;
  if (production.requiresB && !['portal-reveal', 'difference-lens'].includes(presetId)) throw new Error('unsupported-preset');
  if (!production.requiresB && input.presetId) throw new Error('pair-preset-not-applicable');
  const aspectRatio = input.aspectRatio ?? '9:16';
  if (!['9:16', '16:9'].includes(aspectRatio)) throw new Error('unsupported-aspect');
  const change = typeof input.variantChange === 'string' ? input.variantChange.trim() : '';
  if (change.length > 2000) throw new Error('invalid-variant-change');
  const original = input.prompt.trim();
  if(!production.requiresB&&change)throw new Error('variant-change-not-applicable');
  const conceptBrief=Object.entries(production.concept).filter(([,value])=>value).map(([key,value])=>`${key}: ${value}`).join('\n');
  const imagePrompt=`${original}\n${conceptBrief?`Collection brief:\n${conceptBrief}\n`:''}Create SFW original artwork. ${production.workflowType==='stock'?'Compose for stock illustration use; keep details clear and avoid added lettering or logos.':'Preserve room for wallpaper UI.'} Compose for ${aspectRatio}.`;
  if(!production.requiresB)return{
    schemaVersion:1,plannerVersion:'template-2',...production,contentScope:'sfw',status:'needs_review',presetId:null,motionRecipeId:null,aspectRatio,sourcePrompt:original,
    presetReason:production.workflowType==='stock'?'Still-image stock workflow; no reveal preset.':'Landscape motion recipe will be selected separately.',
    imageA:{prompt:imagePrompt,role:'base'},imageB:{operation:null,parentRole:null,change:null,prompt:null,required:false},
    protectedRegions:['composition and focal point require review'],mask:{status:'not_applicable',coordinateSpace:'imageA-normalized',regions:[]},
    composition:{focalPoint:null,safeAreasRequireReview:true,stretchAllowed:false},
    requirements:['image-quality-check','rights-review',...(production.workflowType==='stock'?['stock-channel-validation']:['motion-region-review'])],
    blockers:[production.workflowType==='stock'?'Review image quality, dimensions, metadata and intended stock channel.':'Open Landscape Studio, select and review motion regions before animation.'],
    review:{artwork:'pending',sfw:'unreviewed',rights:'unreviewed'},generationAllowed:false,
  };
  return {
    schemaVersion: 1,
    plannerVersion: 'template-2',
    ...production,
    contentScope: 'sfw',
    status: 'needs_review',
    presetId,
    presetReason: input.presetId ? 'Selected by user.' : 'Portal Window is the default for aligned A/B artwork.',
    aspectRatio,
    sourcePrompt: original,
    imageA: { prompt: imagePrompt, role: 'base' },
    imageB: {
      operation: 'masked-edit', parentRole: 'imageA',
      change: change || null,
      prompt: change ? `Edit image A only within the approved mask: ${change}. Preserve camera, composition, identity, pose and all unmasked pixels. Keep the result SFW.` : null,
    },
    protectedRegions: ['all pixels outside the approved edit mask', 'faces and hands unless explicitly reviewed', 'text and architectural edges'],
    mask: { status: 'pending', coordinateSpace: 'imageA-normalized', regions: [] },
    composition: { focalPoint: null, safeAreasRequireReview: true, stretchAllowed: false },
    requirements: ['approved-edit-mask', 'verified-masked-edit-provider', 'pair-quality-check', 'rights-review'],
    blockers: [...(!change ? ['Specify the intended A-to-B change.'] : []), 'Approve edit mask and composition before generation of B.'],
    review: { artwork: 'pending', sfw: 'unreviewed', rights: 'unreviewed' },
    generationAllowed: false,
  };
}
