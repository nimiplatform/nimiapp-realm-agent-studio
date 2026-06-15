import type { Realm } from '@nimiplatform/sdk/realm';
import { getCurrentStudioNimiClient } from '@renderer/app-shell/studio-platform.js';

export const STUDIO_REALM_SURFACE_METHODS = [
  'listMyRealmAgents',
  'getMyRealmAgent',
  'listCbdbCuratedSystemAgents',
  'getCbdbCuratedSystemAgent',
  'worldControllerListWorlds',
  'worldControllerGetWorldDetailWithAgents',
  'agentControllerCheckHandle',
  'agentControllerCreate',
  'agentControllerSelectAvatar',
  'agentControllerGetVisibility',
  'agentControllerUpdateVisibility',
  'getMyRealmAgentSettings',
  'updateMyRealmAgentSettings',
  'getCbdbCuratedSystemAgentSettings',
  'updateCbdbCuratedSystemAgentSettings',
  'updateCbdbCuratedSystemAgentProfileMedia',
  'updateCbdbCuratedSystemAgentVoice',
  'getCbdbCuratedSystemAgentChatReadiness',
  'projectRuntimePayload',
  'createPost',
  'listResources',
  'createImageDirectUpload',
  'createVideoDirectUpload',
  'createAudioDirectUpload',
  'finalizeResource',
  'createTextResource',
] as const;

export type StudioRealmSurfaceMethod = typeof STUDIO_REALM_SURFACE_METHODS[number];
export type StudioRealmSurface = Pick<Realm['generated'], StudioRealmSurfaceMethod>;

export function createStudioRealmSurface(realm: Pick<Realm, 'generated'>): StudioRealmSurface {
  const generated = realm.generated;
  return {
    listMyRealmAgents: generated.listMyRealmAgents.bind(generated),
    getMyRealmAgent: generated.getMyRealmAgent.bind(generated),
    listCbdbCuratedSystemAgents: generated.listCbdbCuratedSystemAgents.bind(generated),
    getCbdbCuratedSystemAgent: generated.getCbdbCuratedSystemAgent.bind(generated),
    worldControllerListWorlds: generated.worldControllerListWorlds.bind(generated),
    worldControllerGetWorldDetailWithAgents: generated.worldControllerGetWorldDetailWithAgents.bind(generated),
    agentControllerCheckHandle: generated.agentControllerCheckHandle.bind(generated),
    agentControllerCreate: generated.agentControllerCreate.bind(generated),
    agentControllerSelectAvatar: generated.agentControllerSelectAvatar.bind(generated),
    agentControllerGetVisibility: generated.agentControllerGetVisibility.bind(generated),
    agentControllerUpdateVisibility: generated.agentControllerUpdateVisibility.bind(generated),
    getMyRealmAgentSettings: generated.getMyRealmAgentSettings.bind(generated),
    updateMyRealmAgentSettings: generated.updateMyRealmAgentSettings.bind(generated),
    getCbdbCuratedSystemAgentSettings: generated.getCbdbCuratedSystemAgentSettings.bind(generated),
    updateCbdbCuratedSystemAgentSettings: generated.updateCbdbCuratedSystemAgentSettings.bind(generated),
    updateCbdbCuratedSystemAgentProfileMedia: generated.updateCbdbCuratedSystemAgentProfileMedia.bind(generated),
    updateCbdbCuratedSystemAgentVoice: generated.updateCbdbCuratedSystemAgentVoice.bind(generated),
    getCbdbCuratedSystemAgentChatReadiness: generated.getCbdbCuratedSystemAgentChatReadiness.bind(generated),
    projectRuntimePayload: generated.projectRuntimePayload.bind(generated),
    createPost: generated.createPost.bind(generated),
    listResources: generated.listResources.bind(generated),
    createImageDirectUpload: generated.createImageDirectUpload.bind(generated),
    createVideoDirectUpload: generated.createVideoDirectUpload.bind(generated),
    createAudioDirectUpload: generated.createAudioDirectUpload.bind(generated),
    finalizeResource: generated.finalizeResource.bind(generated),
    createTextResource: generated.createTextResource.bind(generated),
  };
}

export function createStudioRealmClient(): StudioRealmSurface {
  const realm = getCurrentStudioNimiClient().realm;
  if (!realm) {
    throw new Error(
      'Realm Agent Studio Realm client is unavailable for developer-registered local apps until a Runtime/Realm owner-operation proxy is admitted.',
    );
  }
  return createStudioRealmSurface(realm);
}
