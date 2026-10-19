import { describe, expect, it } from 'vitest';
import { config } from '../config';
import { resumeSamples } from './__tests__/fixtures/resume-samples';
import { parseRawTextToSchema } from './resume-ai.service';
import { resumeSchema } from './resume.schema';

describe.skipIf(!config.openaiApiKey)('AI resume parser integration', () => {
  it.each(
    resumeSamples.map((rawText, index) => ({
      rawText,
      sampleNumber: index + 1,
    })),
  )('parses varied resume sample $sampleNumber', async ({ rawText }) => {
    const result = await parseRawTextToSchema(rawText);

    expect(() => resumeSchema.parse(result)).not.toThrow();
  });
});
