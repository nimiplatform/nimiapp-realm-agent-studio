import type { CoreTransport, RealmOptions } from '@nimiplatform/sdk/realm';
import { createNimiError, ReasonCode, type CoreUnaryRequest } from '@nimiplatform/sdk/types';
import { invokeChecked, type JsonObject, type JsonValue } from '../bridge/index.js';

type StudioRealmUnaryResult = {
  readonly response: unknown;
};

export function createStudioRealmBridgeOptions(realmBaseUrl: string): RealmOptions {
  return {
    transport: createStudioRealmBridgeTransport(realmBaseUrl),
  };
}

export function createStudioRealmBridgeTransport(realmBaseUrl: string): CoreTransport {
  return {
    async unary<Response = unknown, Body = unknown>(request: CoreUnaryRequest<Body>): Promise<Response> {
      const payload: JsonObject = {
        methodId: request.methodId,
        realmBaseUrl,
        request: request.body as JsonValue,
      };
      if (typeof request.timeoutMs === 'number') {
        payload.timeoutMs = request.timeoutMs;
      }
      const result = await invokeChecked('realm_agent_studio_realm_unary', {
        payload,
      }, parseStudioRealmUnaryResult);
      request.responseMetadataObserver?.({});
      return result.response as Response;
    },
    serverStream() {
      throw createNimiError({
        message: 'Realm Agent Studio Realm bridge does not support server streams.',
        reasonCode: ReasonCode.SDK_REALM_FETCH_STREAM_UNSUPPORTED,
        actionHint: 'use_unary_realm_operation',
        source: 'sdk',
      });
    },
  };
}

function parseStudioRealmUnaryResult(value: unknown): StudioRealmUnaryResult {
  const record = asRecord(value);
  if (!record || !('response' in record)) {
    throw new Error('Realm Agent Studio Realm bridge returned an invalid response envelope.');
  }
  return {
    response: record.response,
  };
}

function asRecord(value: unknown): JsonObject | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : null;
}
