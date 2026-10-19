import { describe, expect, it } from 'vitest';
import { WeightedSkillScorer } from './weighted-skill.strategy';

describe('WeightedSkillScorer', () => {
  it('correctly calculates score and categorizes matched vs missing skills', async () => {
    const scorer = new WeightedSkillScorer();
    const jobPosting = { requiredSkills: ['TypeScript', 'React', 'PostgreSQL'] };
    const resume = {
      sections: [
        {
          type: 'skills',
          title: 'Skills',
          entries: [{ title: 'typescript' }, { title: 'React' }, { title: 'Docker' }],
        },
      ],
    };
    const result = await scorer.calculateScore(resume, jobPosting);

    expect(result.score).toBe(67);
    expect(result.breakdown.matchedSkills).toEqual(['typescript', 'react']);
    expect(result.breakdown.missingSkills).toEqual(['postgresql']);
  });

  it('splits comma-separated requirements and awards a full score when none are required', async () => {
    const scorer = new WeightedSkillScorer();
    const resume = {
      sections: [
        { type: 'skills', title: 'Skills', entries: [{ title: 'TypeScript' }, { title: 'React' }] },
      ],
    };

    await expect(
      scorer.calculateScore(resume, { requiredSkills: ' TypeScript, React ' }),
    ).resolves.toMatchObject({ score: 100, breakdown: { totalRequired: 2 } });
    await expect(scorer.calculateScore(resume, { requiredSkills: [] })).resolves.toEqual({
      score: 100,
      breakdown: { matchedSkills: [], missingSkills: [], totalRequired: 0 },
    });
  });
});
