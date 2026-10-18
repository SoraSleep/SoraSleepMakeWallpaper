import {readPromptText} from '../plr/promptFile.ts';
export const LANDSCAPE_BATCH_LIMIT=500;
export const landscapeBatchPolicy={preset:'text-to-image-landscape',maxPrompts:LANDSCAPE_BATCH_LIMIT,imageCount:1,background:'keep',motion:false,provider:'installed-image-dream',models:'free_models',promptPolicy:'verbatim'} as const;
export function parseLandscapePrompts(text:string,format:'txt'|'csv'){
 const rows=readPromptText(text,format);
 if(rows.length>LANDSCAPE_BATCH_LIMIT)throw Error('Preset 03 hỗ trợ tối đa 500 prompt mỗi batch.');
 return rows;
}
