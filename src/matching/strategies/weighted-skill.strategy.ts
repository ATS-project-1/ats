import type { Prisma } from '@prisma/client';
import type { MatchScorer } from '../match-scorer.interface';

function normalizeSkills(value: unknown): string[] {
  const skills = typeof value === 'string' ? value.split(',') : Array.isArray(value) ? value : [];

  return skills
    .filter((skill): skill is string => typeof skill === 'string')
    .map((skill) => skill.trim().toLocaleLowerCase())
    .filter((skill) => skill.length > 0);
}

function extractCandidateSkills(resume: unknown): string[] {
  if (typeof resume !== 'object' || resume === null || !('sections' in resume)) return [];
  const { sections } = resume;
  if (!Array.isArray(sections)) return [];

  const skillsSection = sections.find(
    (section) =>
      typeof section === 'object' &&
      section !== null &&
      'type' in section &&
      section.type === 'skills',
  );
  if (
    typeof skillsSection !== 'object' ||
    skillsSection === null ||
    !('entries' in skillsSection) ||
    !Array.isArray(skillsSection.entries)
  ) {
    return [];
  }

  const skills: unknown[] = [];
  for (const entry of skillsSection.entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    if ('title' in entry) skills.push(entry.title);
    if ('bullets' in entry && Array.isArray(entry.bullets)) skills.push(...entry.bullets);
  }

  return normalizeSkills(skills);
}

export class WeightedSkillScorer implements MatchScorer {
  async calculateScore(
    resume: unknown,
    jobPosting: { requiredSkills?: unknown },
  ): Promise<{ score: number; breakdown: Prisma.InputJsonObject }> {
    const requiredSkills = normalizeSkills(jobPosting.requiredSkills);
    const candidateSkills = extractCandidateSkills(resume);
    if (requiredSkills.length === 0) {
      return {
        score: 100,
        breakdown: { matchedSkills: [], missingSkills: [], totalRequired: 0 },
      };
    }

    const weightPerSkill = 100 / requiredSkills.length;
    let score = 0;
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];

    for (const skill of requiredSkills) {
      if (candidateSkills.includes(skill)) {
        score += weightPerSkill;
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    return {
      score: Math.round(score),
      breakdown: { matchedSkills, missingSkills, totalRequired: requiredSkills.length },
    };
  }
}
