import type { Prisma } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../common/errors';
import { candidateProfileRepository } from '../user/candidate-profile.repository';
import { resumeRepository } from './resume.repository';
import { resumeVersionRepository } from './resume-version.repository';
import type { ResumeRecordInput, UpdateResumeRecordInput } from './resume.schema';

export const resumeService = {
  async createResume(candidateUserId: string, input: ResumeRecordInput) {
    const candidate = await candidateProfileRepository.findByUserId(candidateUserId);
    if (!candidate) {
      throw new NotFoundError('Candidate profile not found', 'CANDIDATE_PROFILE_NOT_FOUND');
    }
    const content = (input.content ?? { title: input.title }) as Prisma.InputJsonValue;
    return resumeRepository.createResumeRecord(candidate.id, input.title, content);
  },

  async updateResume(
    resumeId: string,
    candidateUserId: string,
    input: UpdateResumeRecordInput,
  ) {
    const candidate = await candidateProfileRepository.findByUserId(candidateUserId);
    if (!candidate) {
      throw new NotFoundError('Candidate profile not found', 'CANDIDATE_PROFILE_NOT_FOUND');
    }
    const resume = await resumeRepository.findById(resumeId);
    if (!resume) throw new NotFoundError('Resume not found', 'RESUME_NOT_FOUND');
    if (resume.candidateId !== candidate.id) {
      throw new ForbiddenError(
        'You do not have permission to modify this resume',
        'Unauthorized_Action',
      );
    }

    const content =
      input.content !== undefined
        ? (input.content as Prisma.InputJsonValue)
        : input.title !== undefined &&
            typeof resume.content === 'object' &&
            resume.content !== null &&
            !Array.isArray(resume.content)
          ? ({ ...resume.content, title: input.title } as Prisma.InputJsonValue)
          : undefined;

    return resumeRepository.updateContent(resumeId, {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(content !== undefined ? { content } : {}),
    });
  },

  async snapshotResume(resumeId: string, candidateUserId: string) {
    const candidate = await candidateProfileRepository.findByUserId(candidateUserId);
    if (!candidate) {
      throw new NotFoundError('Candidate profile not found', 'CANDIDATE_PROFILE_NOT_FOUND');
    }

    const resume = await resumeRepository.findById(resumeId);
    if (!resume) {
      throw new NotFoundError('Resume not found', 'RESUME_NOT_FOUND');
    }
    if (resume.candidateId !== candidate.id) {
      throw new ForbiddenError(
        'You do not have permission to create a version of this resume',
        'Unauthorized_Action',
      );
    }

    return resumeRepository.createVersion(resumeId);
  },

  async getOwnedVersion(versionId: string, candidateUserId: string) {
    const candidate = await candidateProfileRepository.findByUserId(candidateUserId);
    if (!candidate) {
      throw new NotFoundError('Candidate profile not found', 'CANDIDATE_PROFILE_NOT_FOUND');
    }

    const version = await resumeVersionRepository.findById(versionId);
    if (!version) throw new NotFoundError('Resume version not found', 'RESUME_VERSION_NOT_FOUND');

    const resume = await resumeRepository.findById(version.resumeId);
    if (!resume) throw new NotFoundError('Resume not found', 'RESUME_NOT_FOUND');
    if (resume.candidateId !== candidate.id) {
      throw new ForbiddenError(
        'You do not have permission to download this resume version',
        'Unauthorized_Action',
      );
    }

    return version;
  },
};
