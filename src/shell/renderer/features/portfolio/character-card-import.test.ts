import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  mapCharacterCardToCreateDraft,
  mapCharacterCardToGraphSourceFields,
  parseCharacterCardJsonText,
  parseCharacterCardPngBytes,
} from './character-card-import.js';

function readFixture(name: string): string {
  return readFileSync(path.join(process.cwd(), 'src/shell/renderer/features/portfolio/__fixtures__', name), 'utf8');
}

function pngWithChara(json: string): Uint8Array {
  const signature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const encoded = Buffer.from(json, 'utf8').toString('base64');
  const text = Buffer.from(`chara\0${encoded}`, 'latin1');
  const chunk = Buffer.alloc(12 + text.length);
  chunk.writeUInt32BE(text.length, 0);
  chunk.write('tEXt', 4, 4, 'ascii');
  text.copy(chunk, 8);
  chunk.writeUInt32BE(0, 8 + text.length);
  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4, 4, 'ascii');
  iend.writeUInt32BE(0, 8);
  return Uint8Array.from(Buffer.concat([Buffer.from(signature), chunk, iend]));
}

describe('downloaded CharacterCard import', () => {
  it('parses a local V2 JSON fixture and maps it into draft fields', () => {
    const result = parseCharacterCardJsonText(readFixture('character-card-v2.json'), 'character-card-v2.json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const draft = mapCharacterCardToCreateDraft(result.card);
    expect(draft).toMatchObject({
      handle: 'mira-prime',
      displayName: 'Mira Prime',
      dnaPrimary: 'INTELLECTUAL',
      dnaSecondary: ['DIRECT', 'REALISTIC', 'WISE'],
      originalDescription: 'CharacterCard import: Mira Prime',
    });
    expect(draft.concept).toContain('calm scholar');
  });

  it('classifies CharacterCard source fields for graph review', () => {
    const result = parseCharacterCardJsonText(readFixture('character-card-v2.json'), 'character-card-v2.json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fields = mapCharacterCardToGraphSourceFields(result.card);
    expect(fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'card.name', status: 'mapped', targetSection: 'identity' }),
      expect.objectContaining({ key: 'card.first_mes', status: 'candidateOnly', targetSection: 'greeting' }),
      expect.objectContaining({ key: 'card.creator_notes', status: 'unmapped', targetSection: 'sourceProvenance' }),
    ]));
  });

  it('rejects malformed JSON and missing required name', () => {
    expect(parseCharacterCardJsonText('{ nope', 'bad.json')).toMatchObject({
      ok: false,
      failure: 'character-card-json-parse-failed',
    });
    expect(parseCharacterCardJsonText(readFixture('character-card-v2-missing-name.json'), 'missing.json')).toMatchObject({
      ok: false,
      failure: 'character-card-json-shape-invalid',
    });
  });

  it('keeps unknown fields visible as unmapped provenance', () => {
    const result = parseCharacterCardJsonText(readFixture('character-card-v2-unknown-fields.json'), 'unknown.json');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.card.unknownDataKeys).toEqual(['custom_power_level', 'x_vendor_blob']);
    expect(mapCharacterCardToGraphSourceFields(result.card)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'card.unknown',
        status: 'unmapped',
        value: 'custom_power_level, x_vendor_blob',
      }),
    ]));
  });

  it('parses local PNG chara tEXt metadata and rejects PNG without metadata', () => {
    const fixture = readFixture('character-card-v2.json');
    const parsed = parseCharacterCardPngBytes(pngWithChara(fixture), 'mira.png');
    expect(parsed).toMatchObject({
      ok: true,
      card: {
        sourceFormat: 'png',
        data: {
          name: 'Mira Prime',
        },
      },
    });

    const emptyPng = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
      0x00, 0x00, 0x00, 0x00,
    ]);
    expect(parseCharacterCardPngBytes(emptyPng, 'empty.png')).toMatchObject({
      ok: false,
      failure: 'character-card-png-metadata-missing',
    });
  });
});
