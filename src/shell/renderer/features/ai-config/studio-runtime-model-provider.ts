import {
  createRuntimeRouteModelPickerProvider,
  createRuntimeRouteModelPickerProviderCache,
  type RouteModelPickerDataProvider,
  type RuntimeRouteModelPickerClient,
} from '@nimiplatform/kit/features/model-picker/runtime';
import {
  createNimiRuntimeRouteOptionsHostDeps,
  listNimiRuntimeRouteOptionsWithHost,
  type NimiListRuntimeRouteOptionsInput,
  type NimiRuntimeRouteOptionsHostRuntime,
  type NimiRuntimeRouteOptionsSnapshot,
} from '@nimiplatform/sdk/runtime';
import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import { ensureStudioRuntimeClientReady } from '@renderer/infra/studio-bootstrap.js';

type StudioRuntimeRouteOptionsHostClient = {
  readonly runtime: NimiRuntimeRouteOptionsHostRuntime;
};

async function loadStudioRuntimeRouteOptions(
  client: StudioRuntimeRouteOptionsHostClient,
  input: NimiListRuntimeRouteOptionsInput,
): Promise<NimiRuntimeRouteOptionsSnapshot> {
  return listNimiRuntimeRouteOptionsWithHost(
    input,
    createNimiRuntimeRouteOptionsHostDeps(client.runtime, { scope: client }),
  );
}

async function loadStudioRuntimeRouteOptionsFromCurrentClient(
  input: NimiListRuntimeRouteOptionsInput,
): Promise<NimiRuntimeRouteOptionsSnapshot> {
  await ensureStudioRuntimeClientReady();
  const runtime = await createStudioRuntimeClient();
  if (!runtime) {
    throw new Error('Runtime unavailable; Studio model catalog failed closed.');
  }
  return loadStudioRuntimeRouteOptions({ runtime }, input);
}

export function createStudioRuntimeModelPickerProvider(
  capability: string,
): RouteModelPickerDataProvider {
  return createRuntimeRouteModelPickerProvider({
    capability,
    loadOptions: loadStudioRuntimeRouteOptionsFromCurrentClient,
  });
}

export function createStudioRuntimeModelPickerProviderCache(): (
  capability: string,
) => RouteModelPickerDataProvider | null {
  return createRuntimeRouteModelPickerProviderCache({
    loadOptions: loadStudioRuntimeRouteOptionsFromCurrentClient,
  });
}

export function createStudioRuntimeModelPickerProviderFromClient(
  client: RuntimeRouteModelPickerClient,
  capability: string,
): RouteModelPickerDataProvider {
  return createRuntimeRouteModelPickerProvider({
    client,
    capability,
  });
}

export function createStudioRuntimeModelPickerProviderFromHostClient(
  client: StudioRuntimeRouteOptionsHostClient,
  capability: string,
): RouteModelPickerDataProvider {
  return createRuntimeRouteModelPickerProvider({
    capability,
    loadOptions: (input) => loadStudioRuntimeRouteOptions(client, input),
  });
}
