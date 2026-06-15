function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseStrictRuntimeJsonObject(input: {
  readonly rawText: string;
  readonly label: string;
  readonly allowedKeys: readonly string[];
}): Record<string, unknown> {
  const trimmed = input.rawText.trim();
  if (!trimmed) {
    throw new Error(`${input.label} did not return JSON.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `${input.label} must be a single JSON object with no wrapper text: ${error instanceof Error ? error.message : 'invalid JSON'}`,
      { cause: error },
    );
  }

  if (!isPlainRecord(parsed)) {
    throw new Error(`${input.label} JSON must be a single object.`);
  }

  const allowed = new Set(input.allowedKeys);
  const unknownKey = Object.keys(parsed).find((key) => !allowed.has(key));
  if (unknownKey) {
    throw new Error(`${input.label} rejected unknown field ${unknownKey}.`);
  }

  return parsed;
}
