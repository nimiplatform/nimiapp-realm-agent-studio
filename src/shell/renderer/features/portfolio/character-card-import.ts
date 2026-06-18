import { createRealmAgentHandleCandidate, type CreateRealmAgentDraftInput, type DnaPrimaryArchetype, type DnaSecondaryTrait } from './create-agent-draft.js';
import type { AgentCreationGraphSourceField } from './agent-creation-graph.js';

export type CharacterCardImportFailure =
  | 'character-card-empty'
  | 'character-card-oversized'
  | 'character-card-unsupported-file'
  | 'character-card-json-parse-failed'
  | 'character-card-json-shape-invalid'
  | 'character-card-png-invalid'
  | 'character-card-png-metadata-missing'
  | 'character-card-png-metadata-invalid';

export type CharacterCardImportResult =
  | {
    ok: true;
    card: ParsedCharacterCard;
  }
  | {
    ok: false;
    failure: CharacterCardImportFailure;
    message: string;
  };

export type ParsedCharacterCard = {
  sourceName: string;
  sourceFormat: 'json' | 'png';
  spec: string;
  specVersion: string;
  data: CharacterCardData;
  rawKeys: string[];
  dataKeys: string[];
  unknownDataKeys: string[];
};

export type CharacterCardData = {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  exampleMessages: string;
  creatorNotes: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  alternateGreetings: string[];
  tags: string[];
  creator: string;
  characterVersion: string;
  extensionsKeys: string[];
  characterBookPresent: boolean;
};

const MAX_CHARACTER_CARD_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const KNOWN_DATA_KEYS = new Set([
  'name',
  'description',
  'personality',
  'scenario',
  'first_mes',
  'mes_example',
  'creator_notes',
  'system_prompt',
  'post_history_instructions',
  'alternate_greetings',
  'character_book',
  'tags',
  'creator',
  'character_version',
  'extensions',
]);

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => readString(item))
    .filter(Boolean);
}

function truncateText(value: string, maxLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function joinText(parts: string[], separator = '\n\n'): string {
  return parts.map((part) => part.trim()).filter(Boolean).join(separator).trim();
}

function slugFromName(name: string): string {
  return createRealmAgentHandleCandidate(name, 'imported_agent');
}

function classifyPrimaryDna(text: string): DnaPrimaryArchetype | '' {
  const lower = text.toLowerCase();
  const scored: Array<[DnaPrimaryArchetype, number]> = [
    ['CARING', countMatches(lower, ['caring', 'kind', 'gentle', 'support', 'healer', 'protect'])],
    ['PLAYFUL', countMatches(lower, ['playful', 'joke', 'tease', 'mischief', 'funny', 'cheer'])],
    ['INTELLECTUAL', countMatches(lower, ['scholar', 'intellect', 'logic', 'study', 'scientist', 'strategist', 'research'])],
    ['CONFIDENT', countMatches(lower, ['confident', 'leader', 'bold', 'decisive', 'command', 'assertive'])],
    ['MYSTERIOUS', countMatches(lower, ['mysterious', 'secret', 'shadow', 'enigmatic', 'silent', 'assassin'])],
    ['ROMANTIC', countMatches(lower, ['romantic', 'love', 'flirt', 'passion', 'devoted', 'intimate'])],
  ];
  const [best, score] = scored.sort((a, b) => b[1] - a[1])[0] || ['', 0];
  return score > 0 ? best : '';
}

function classifySecondaryDna(text: string): DnaSecondaryTrait[] {
  const lower = text.toLowerCase();
  const traits: DnaSecondaryTrait[] = [];
  const candidates: Array<[DnaSecondaryTrait, string[]]> = [
    ['HUMOROUS', ['humor', 'funny', 'joke']],
    ['SARCASTIC', ['sarcastic', 'dry wit', 'ironic']],
    ['GENTLE', ['gentle', 'soft', 'kind']],
    ['DIRECT', ['direct', 'blunt', 'plain-speaking']],
    ['OPTIMISTIC', ['optimistic', 'hopeful', 'bright']],
    ['REALISTIC', ['realistic', 'practical', 'grounded']],
    ['DRAMATIC', ['dramatic', 'theatrical', 'intense']],
    ['PASSIONATE', ['passionate', 'devoted', 'fervent']],
    ['REBELLIOUS', ['rebellious', 'defiant', 'renegade']],
    ['INNOCENT', ['innocent', 'naive', 'earnest']],
    ['WISE', ['wise', 'mentor', 'ancient']],
    ['ECCENTRIC', ['eccentric', 'strange', 'odd']],
  ];
  for (const [trait, needles] of candidates) {
    if (needles.some((needle) => lower.includes(needle))) traits.push(trait);
    if (traits.length >= 3) break;
  }
  return traits;
}

function countMatches(text: string, needles: string[]): number {
  return needles.reduce((count, needle) => count + (text.includes(needle) ? 1 : 0), 0);
}

function parseCharacterCardObject(
  value: unknown,
  sourceName: string,
  sourceFormat: 'json' | 'png',
): CharacterCardImportResult {
  const root = readRecord(value);
  if (!root) {
    return {
      ok: false,
      failure: 'character-card-json-shape-invalid',
      message: 'CharacterCard root must be a JSON object.',
    };
  }
  const dataRecord = readRecord(root.data) || root;
  const name = readString(dataRecord.name);
  if (!name) {
    return {
      ok: false,
      failure: 'character-card-json-shape-invalid',
      message: 'CharacterCard missing required name field.',
    };
  }

  const dataKeys = Object.keys(dataRecord);
  const extensions = readRecord(dataRecord.extensions);
  const data: CharacterCardData = {
    name,
    description: readString(dataRecord.description),
    personality: readString(dataRecord.personality),
    scenario: readString(dataRecord.scenario),
    firstMessage: readString(dataRecord.first_mes),
    exampleMessages: readString(dataRecord.mes_example),
    creatorNotes: readString(dataRecord.creator_notes),
    systemPrompt: readString(dataRecord.system_prompt),
    postHistoryInstructions: readString(dataRecord.post_history_instructions),
    alternateGreetings: readStringArray(dataRecord.alternate_greetings),
    tags: readStringArray(dataRecord.tags),
    creator: readString(dataRecord.creator),
    characterVersion: readString(dataRecord.character_version),
    extensionsKeys: extensions ? Object.keys(extensions) : [],
    characterBookPresent: Boolean(readRecord(dataRecord.character_book)),
  };

  return {
    ok: true,
    card: {
      sourceName,
      sourceFormat,
      spec: readString(root.spec) || 'unknown',
      specVersion: readString(root.spec_version) || 'unknown',
      data,
      rawKeys: Object.keys(root),
      dataKeys,
      unknownDataKeys: dataKeys.filter((key) => !KNOWN_DATA_KEYS.has(key)),
    },
  };
}

export function parseCharacterCardJsonText(
  text: string,
  sourceName = 'downloaded-character-card.json',
  sourceFormat: 'json' | 'png' = 'json',
): CharacterCardImportResult {
  if (!text.trim()) {
    return {
      ok: false,
      failure: 'character-card-empty',
      message: 'CharacterCard file is empty.',
    };
  }
  try {
    return parseCharacterCardObject(JSON.parse(text), sourceName, sourceFormat);
  } catch (error) {
    return {
      ok: false,
      failure: 'character-card-json-parse-failed',
      message: `CharacterCard JSON parse failed: ${error instanceof Error ? error.message : 'invalid JSON.'}`,
    };
  }
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] || 0) << 24)
    + ((bytes[offset + 1] || 0) << 16)
    + ((bytes[offset + 2] || 0) << 8)
    + (bytes[offset + 3] || 0);
}

function ascii(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => String.fromCharCode(value)).join('');
}

function decodeBase64Utf8(value: string): string | null {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(value, 'base64').toString('utf8');
    }
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function parseCharacterCardPngBytes(
  bytesInput: Uint8Array | ArrayBuffer,
  sourceName = 'downloaded-character-card.png',
): CharacterCardImportResult {
  const bytes = bytesInput instanceof Uint8Array ? bytesInput : new Uint8Array(bytesInput);
  if (bytes.length < PNG_SIGNATURE.length || !PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    return {
      ok: false,
      failure: 'character-card-png-invalid',
      message: 'CharacterCard PNG signature is invalid.',
    };
  }

  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = ascii(bytes.slice(offset + 4, offset + 8));
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) break;
    if (type === 'tEXt') {
      const data = bytes.slice(dataStart, dataEnd);
      const separatorIndex = data.indexOf(0);
      if (separatorIndex > 0) {
        const keyword = ascii(data.slice(0, separatorIndex)).toLowerCase();
        if (keyword === 'chara') {
          const encoded = ascii(data.slice(separatorIndex + 1)).trim();
          const decoded = decodeBase64Utf8(encoded);
          if (!decoded) {
            return {
              ok: false,
              failure: 'character-card-png-metadata-invalid',
              message: 'CharacterCard PNG chara metadata is not valid base64 UTF-8 JSON.',
            };
          }
          return parseCharacterCardJsonText(decoded, sourceName, 'png');
        }
      }
    }
    offset = dataEnd + 4;
  }

  return {
    ok: false,
    failure: 'character-card-png-metadata-missing',
    message: 'CharacterCard PNG does not contain supported chara tEXt metadata.',
  };
}

export async function parseDownloadedCharacterCardFile(file: File): Promise<CharacterCardImportResult> {
  if (file.size <= 0) {
    return {
      ok: false,
      failure: 'character-card-empty',
      message: 'CharacterCard file is empty.',
    };
  }
  if (file.size > MAX_CHARACTER_CARD_BYTES) {
    return {
      ok: false,
      failure: 'character-card-oversized',
      message: 'CharacterCard file is larger than the local import limit.',
    };
  }
  const name = file.name || 'downloaded-character-card';
  const lowerName = name.toLowerCase();
  if (lowerName.endsWith('.json') || file.type === 'application/json') {
    return parseCharacterCardJsonText(await file.text(), name, 'json');
  }
  if (lowerName.endsWith('.png') || file.type === 'image/png') {
    return parseCharacterCardPngBytes(await file.arrayBuffer(), name);
  }
  return {
    ok: false,
    failure: 'character-card-unsupported-file',
    message: 'Only downloaded CharacterCard JSON and PNG files are supported.',
  };
}

export function mapCharacterCardToCreateDraft(card: ParsedCharacterCard): Partial<CreateRealmAgentDraftInput> {
  const data = card.data;
  const combined = joinText([
    data.description,
    data.personality,
    data.scenario,
    data.systemPrompt,
    data.postHistoryInstructions,
    data.tags.join(', '),
  ]);
  return {
    handle: slugFromName(data.name),
    displayName: data.name,
    concept: truncateText(joinText([data.description, data.personality, data.scenario], '\n'), 700),
    description: truncateText(data.description || data.personality || data.scenario, 500),
    ruleText: truncateText(joinText([
      data.personality ? `Personality: ${data.personality}` : '',
      data.scenario ? `Scenario: ${data.scenario}` : '',
      data.systemPrompt ? `System prompt note: ${data.systemPrompt}` : '',
      data.postHistoryInstructions ? `Post-history instruction note: ${data.postHistoryInstructions}` : '',
      data.creatorNotes ? `Creator note: ${data.creatorNotes}` : '',
    ], '\n'), 1200),
    dnaPrimary: classifyPrimaryDna(combined),
    dnaSecondary: classifySecondaryDna(combined),
    originalDescription: `CharacterCard import: ${data.name}`,
  };
}

function sourceField(
  key: string,
  label: string,
  value: string,
  status: AgentCreationGraphSourceField['status'],
  targetSection?: AgentCreationGraphSourceField['targetSection'],
  note?: string,
): AgentCreationGraphSourceField | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return {
    key,
    label,
    value: truncateText(trimmed, 800),
    status,
    ...(targetSection ? { targetSection } : {}),
    ...(note ? { note } : {}),
  };
}

export function mapCharacterCardToGraphSourceFields(card: ParsedCharacterCard): AgentCreationGraphSourceField[] {
  const data = card.data;
  const fields: Array<AgentCreationGraphSourceField | null> = [
    sourceField('card.name', 'Card name', data.name, 'mapped', 'identity'),
    sourceField('card.description', 'Description', data.description, 'mapped', 'worldview'),
    sourceField('card.personality', 'Personality', data.personality, 'candidateOnly', 'behavior'),
    sourceField('card.scenario', 'Scenario', data.scenario, 'candidateOnly', 'worldview'),
    sourceField('card.first_mes', 'First message', data.firstMessage, 'candidateOnly', 'greeting'),
    sourceField('card.mes_example', 'Example messages', data.exampleMessages, 'candidateOnly', 'contentVoice'),
    sourceField('card.tags', 'Tags', data.tags.join(', '), 'candidateOnly', 'contentVoice'),
    sourceField('card.alternate_greetings', 'Alternate greetings', data.alternateGreetings.join('\n\n'), 'candidateOnly', 'greeting'),
    sourceField('card.creator_notes', 'Creator notes', data.creatorNotes, 'unmapped', 'sourceProvenance'),
    sourceField('card.system_prompt', 'System prompt', data.systemPrompt, 'candidateOnly', 'behavior'),
    sourceField('card.post_history_instructions', 'Post-history instructions', data.postHistoryInstructions, 'candidateOnly', 'behavior'),
    sourceField('card.character_book', 'Character book', data.characterBookPresent ? 'present' : '', 'unmapped', 'sourceProvenance', 'Character book import is not an admitted Realm create write.'),
    sourceField('card.extensions', 'Extension keys', data.extensionsKeys.join(', '), 'unmapped', 'sourceProvenance'),
    sourceField('card.unknown', 'Unknown card fields', card.unknownDataKeys.join(', '), 'unmapped', 'sourceProvenance'),
  ];
  return fields.filter((field): field is AgentCreationGraphSourceField => Boolean(field));
}
