// Runtime constructor is needed to reliably identify Prisma's P2002 error.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { Prisma } from '@prisma/client';
import { JobPostingStatus } from '../common/enums';
import { ConflictError, ValidationError } from '../common/errors';
import { jobPostingRepository } from '../job/job-posting.repository';
import { resumeRepository } from '../resume/resume.repository';
import { resumeVersionRepository } from '../resume/resume-version.repository';
import { candidateProfileRepository } from '../user/candidate-profile.repository';
import { applicationRepository } from './application.repository';

export const applicationService = {
  async applyForJob(
    candidateUserId: string,
    jobPostingId: string,
    resumeVersionId: string,
  ) {
    const jobPosting = await jobPostingRepository.findById(jobPostingId);
    if (!jobPosting || jobPosting.status !== JobPostingStatus.PUBLISHED) {
      throw new ValidationError(
        'This job posting is not available for applications',
        'JOB_UNAVAILABLE',
      );
    }

    const candidate = await candidateProfileRepository.findByUserId(candidateUserId);
    if (!candidate) {
      throw new ValidationError(
        'Candidate profile is required to apply for a job',
        'CANDIDATE_PROFILE_REQUIRED',
      );
    }

    const resumeVersion = await resumeVersionRepository.findById(resumeVersionId);
    if (!resumeVersion) {
      throw new ValidationError('Resume version not found', 'INVALID_RESUME_VERSION');
    }

    const resume = await resumeRepository.findById(resumeVersion.resumeId);
    if (!resume || resume.candidateId !== candidate.id) {
      throw new ValidationError(
        'Resume version does not belong to this candidate',
        'INVALID_RESUME_VERSION',
      );
    }

    try {
      return await applicationRepository.createApplication(
        {
          candidateId: candidate.id,
          jobPostingId,
          resumeVersionId,
        },
        candidateUserId,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictError(
          'You have already applied for this job.',
          'Duplicate_Application',
        );
      }
      throw error;
    }
  },
};
