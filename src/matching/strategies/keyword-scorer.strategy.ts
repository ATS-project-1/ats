import type { MatchScorer } from '../match-scorer.interface';
import type { Prisma } from '@prisma/client';

function flattenResume(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value).toLocaleLowerCase();
  }
  if (Array.isArray(value)) {
    return value.map(flattenResume).join(' ');
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).map(flattenResume).join(' ');
  }
  return '';
}

export class KeywordScorer implements MatchScorer {
  async calculateScore(
    resume: unknown,
    jobPosting: { requiredSkills?: unknown },
  ): Promise<{ score: number; breakdown: Prisma.InputJsonObject }> {
    const requiredSkills = Array.isArray(jobPosting.requiredSkills)
      ? jobPosting.requiredSkills.filter(
          (skill: unknown): skill is string =>
            typeof skill === 'string' && skill.trim().length > 0,
        )
      : [];
    const resumeText = flattenResume(resume);
    const matchedSkills = requiredSkills.filter((skill: string) =>
      resumeText.includes(skill.toLocaleLowerCase()),
    );
    const missingSkills = requiredSkills.filter(
      (skill: string) => !matchedSkills.includes(skill),
    );
    const score =
      requiredSkills.length === 0
        ? 0
        : Math.round((matchedSkills.length / requiredSkills.length) * 100);

    return {
      score,
      breakdown: {
        strategy: 'keyword',
        matchedSkills,
        missingSkills,
        matchedCount: matchedSkills.length,
        requiredCount: requiredSkills.length,
      },
    };
  }
}
