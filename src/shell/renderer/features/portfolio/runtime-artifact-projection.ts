import type { Runtime } from '@nimiplatform/sdk/runtime';
import type { ScenarioArtifact } from '@nimiplatform/sdk/runtime/generated';

export type StudioRuntimeArtifactProjection = {
  artifactId?: string;
  mimeType?: string;
  publicUri?: string;
  previewUrl?: string;
  sizeBytes?: string;
};

function normalizeArtifactText(value: unknown): string {
  return String(value || '').trim();
}

function normalizeArtifactBytes(bytes: unknown): Uint8Array | undefined {
  if (bytes instanceof Uint8Array) return bytes;
  if (bytes instanceof ArrayBuffer) return new Uint8Array(bytes);
  if (Array.isArray(bytes)) return Uint8Array.from(bytes as number[]);
  if (typeof bytes === 'string') {
    if (!bytes) return undefined;
    try {
      const binary = atob(bytes);
      const out = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        out[index] = binary.charCodeAt(index);
      }
      return out;
    } catch {
      return undefined;
    }
  }
  if (bytes && typeof bytes === 'object') {
    const view = bytes as { length?: unknown; [index: number]: unknown };
    if (typeof view.length === 'number' && view.length >= 0) {
      const out = new Uint8Array(view.length);
      for (let index = 0; index < view.length; index += 1) {
        out[index] = Number(view[index]) & 0xff;
      }
      return out;
    }
  }
  return undefined;
}

function artifactBytesToDataUrl(bytes: unknown, mimeType: string): string | undefined {
  const normalized = normalizeArtifactBytes(bytes);
  if (!normalized || normalized.length === 0) return undefined;
  const mime = mimeType.trim() || 'application/octet-stream';
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < normalized.length; offset += chunkSize) {
    binary += String.fromCharCode(...normalized.subarray(offset, offset + chunkSize));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export function isHttpArtifactUri(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isPreviewableUri(value: string): boolean {
  if (isHttpArtifactUri(value)) return true;
  return /^(data:|blob:)/i.test(value);
}

async function readArtifactPreviewUrl(
  runtime: Runtime,
  artifactId: string,
  fallbackMimeType: string,
): Promise<{ previewUrl?: string; mimeType?: string; sizeBytes?: string }> {
  const response = await runtime.artifacts.readArtifactBytes({ artifactId });
  const mimeType = normalizeArtifactText(response.mimeType) || fallbackMimeType;
  return {
    previewUrl: artifactBytesToDataUrl(response.bytes, mimeType),
    ...(mimeType ? { mimeType } : {}),
    ...(response.sizeBytes ? { sizeBytes: response.sizeBytes } : {}),
  };
}

export async function projectStudioRuntimeArtifact(
  runtime: Runtime,
  artifact: ScenarioArtifact,
): Promise<StudioRuntimeArtifactProjection | null> {
  const artifactId = normalizeArtifactText(artifact.artifactId);
  const mimeType = normalizeArtifactText(artifact.mimeType);
  const uri = normalizeArtifactText(artifact.uri);
  const inlinePreviewUrl = artifactBytesToDataUrl(artifact.bytes, mimeType);
  const readBack = uri || inlinePreviewUrl || !artifactId
    ? {}
    : await readArtifactPreviewUrl(runtime, artifactId, mimeType).catch(() => ({}));
  const previewUrl = isPreviewableUri(uri)
    ? uri
    : inlinePreviewUrl || readBack.previewUrl;
  if (!artifactId && !uri && !previewUrl) {
    return null;
  }
  return {
    ...(artifactId ? { artifactId } : {}),
    ...(readBack.mimeType || mimeType ? { mimeType: readBack.mimeType || mimeType } : {}),
    ...(isHttpArtifactUri(uri) ? { publicUri: uri } : {}),
    ...(previewUrl ? { previewUrl } : {}),
    ...(readBack.sizeBytes || artifact.sizeBytes ? { sizeBytes: readBack.sizeBytes || artifact.sizeBytes } : {}),
  };
}

export async function projectStudioRuntimeArtifacts(
  runtime: Runtime,
  artifacts: readonly ScenarioArtifact[],
): Promise<StudioRuntimeArtifactProjection[]> {
  const projected = await Promise.all(artifacts.map((artifact) => projectStudioRuntimeArtifact(runtime, artifact)));
  return projected.filter((artifact): artifact is StudioRuntimeArtifactProjection => artifact !== null);
}
