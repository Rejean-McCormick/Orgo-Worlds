/** P4 internal adapter for WorldsService.readTandemEducationScopeInternal().
 * NEVER call the local-dev HTTP worlds.controller.ts, nor use identity headers.
 * Only server-side Orgo session context may supply `actor`.
 */
import {inspectTrustedWorldScope} from './authority-prerequisites.mjs';
export async function inspectInternalWorldP4(authorityRequest, actor, worldsService){
  if(!worldsService || typeof worldsService.readTandemEducationScopeInternal!=='function')
    throw Error('TANDEM_P4_WORLD_DENIED: WorldsService internal method unavailable');
  return inspectTrustedWorldScope(authorityRequest,actor,async q=>{
    return worldsService.readTandemEducationScopeInternal({
      organizationId:q.organizationId, actorUserId:q.actorUserId,
      worldId:q.worldId, releaseId:q.releaseId,
    });
  });
}
