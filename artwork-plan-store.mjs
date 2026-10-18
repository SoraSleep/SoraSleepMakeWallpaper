import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { createArtworkPlan } from './wallpaper-art-plan.mjs';
import {normalizeArtworkPlan} from './production-contract.mjs';

export function createPlanStore(root) {
  mkdirSync(root, { recursive: true });
  const list = () => readdirSync(root).filter(name => name.endsWith('.json')).map(name => normalizeArtworkPlan(JSON.parse(readFileSync(path.join(root, name), 'utf8')))).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  return { list,
    save(input) {
      const planId = input.planId ?? randomUUID();
      if (!/^[a-zA-Z0-9-]{8,80}$/.test(planId)) throw new Error('invalid-plan-id');
      const previous = list().filter(item => item.planId === planId).sort((a,b) => b.revision-a.revision)[0];
      if (previous && input.baseRevision !== previous.revision) throw new Error('revision-conflict');
      if (!previous && input.planId) throw new Error('plan-not-found');
      const sameWorkflow=!input.workflowType||input.workflowType===previous?.workflowType;
      const plan = createArtworkPlan({...input,workflowType:input.workflowType??previous?.workflowType,collectionId:input.collectionId===undefined?previous?.collectionId:input.collectionId,concept:input.concept??previous?.concept,exportProfile:input.exportProfile??(sameWorkflow?previous?.exportProfile:undefined)});
      const revision = (previous?.revision ?? 0) + 1;
      const result = { ...plan, planId, revision, createdAt: new Date().toISOString(), planCopyReviewed: input.planCopyReviewed === true, generationStatus: 'not_started' };
      const target = path.join(root, `${planId}-${revision}.json`);
      writeFileSync(target + '.part', JSON.stringify(result,null,2), { flag:'wx' });
      renameSync(target + '.part', target);
      return result;
    }
  };
}
