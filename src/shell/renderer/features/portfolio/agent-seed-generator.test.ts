import { describe, expect, it } from 'vitest';
import { parseAgentSeedOutput } from './agent-seed-generator.js';

const validSeed = {
  handle: 'mira-prime',
  displayName: 'Mira Prime',
  concept: 'Operational guide for artifact reviews.',
  description: 'Mira helps owners shape and review public agent behavior.',
  ruleText: 'Keep output practical.',
  dnaPrimary: 'INTELLECTUAL',
  dnaSecondary: ['WISE', 'DIRECT'],
  rationale: 'Matches the owner brief.',
};

describe('agent seed Runtime output parser', () => {
  it('parses a strict single JSON object into owner-reviewed draft fields', () => {
    expect(parseAgentSeedOutput(JSON.stringify(validSeed))).toMatchObject({
      seed: {
        handle: 'mira_prime',
        displayName: 'Mira Prime',
        dnaPrimary: 'INTELLECTUAL',
        dnaSecondary: ['WISE', 'DIRECT'],
      },
      rationale: 'Matches the owner brief.',
    });
  });

  it('rejects wrapper text, code fences, and unknown fields', () => {
    expect(() => parseAgentSeedOutput(`Here is a draft:\n${JSON.stringify(validSeed)}`))
      .toThrow('single JSON object');
    expect(() => parseAgentSeedOutput(`\`\`\`json\n${JSON.stringify(validSeed)}\n\`\`\``))
      .toThrow('single JSON object');
    expect(() => parseAgentSeedOutput(JSON.stringify({
      ...validSeed,
      model: 'forbidden',
    }))).toThrow('unknown field model');
    expect(() => parseAgentSeedOutput(JSON.stringify({
      ...validSeed,
      publicBio: 'unsupported alias',
    }))).toThrow('unknown field publicBio');
  });
});
