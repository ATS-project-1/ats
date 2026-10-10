// Runtime constructor is needed to reliably identify Prisma's P2002 error.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { Prisma } from '@prisma/client';
import { ApplicationStatus, JobPostingStatus } from '../common/enums';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../common/errors';
import { jobPostingRepository } from '../job/job-posting.repository';
import { resumeRepository } from '../resume/resume.repository';
import { resumeVersionRepository } from '../resume/resume-version.repository';
import { candidateProfileRepository } from '../user/candidate-profile.repository';
import { recruiterProfileRepository } from '../user/recruiter-profile.repository';
import { userRepository } from '../user/user.repository';
import { applicationRepository } from './application.repository';

const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: [ApplicationStatus.SCREENING, ApplicationStatus.REJECTED],
  SCREENING: [ApplicationStatus.INTERVIEW, ApplicationStatus.REJECTED],
  INTERVIEW: [ApplicationStatus.OFFER, ApplicationStatus.REJECTED],
  OFFER: [ApplicationStatus.ACCEPTED, ApplicationStatus.REJECTED],
  REJECTED: [],
  ACCEPTED: [],
};

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

  async updateApplicationStatus(
    applicationId: string,
    newStatus: string,
    recruiterId: string,
  ) {
    const user = await userRepository.findById(recruiterId);
    if (!user) throw new NotFoundError('User not found', 'Not_Found');
    if (user.role !== 'RECRUITER' && user.role !== 'ADMIN') {
      throw new ForbiddenError('Only recruiters can update application status', 'Unauthorized_Action');
    }

    const recruiterProfile = await recruiterProfileRepository.findByUserId(recruiterId);
    const organizationId = recruiterProfile?.organization?.id;
    if (!organizationId) {
      throw new ForbiddenError(
        'You are not associated with an organization',
        'Unauthorized_Action',
      );
    }

    const application = await applicationRepository.findByIdWithJob(applicationId);
    if (!application) throw new NotFoundError('Application not found', 'Not_Found');
    if (application.jobPosting.organizationId !== organizationId) {
      throw new ForbiddenError(
        'You cannot update applications for another organization',
        'Unauthorized_Action',
      );
    }

    if (!Object.values(ApplicationStatus).includes(newStatus as ApplicationStatus)) {
      throw new ValidationError('Invalid application status', 'INVALID_APPLICATION_STATUS');
    }
    if (!ALLOWED_TRANSITIONS[application.status].includes(newStatus as ApplicationStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${application.status} to ${newStatus}.`,
        'Invalid_State_Transition',
      );
    }

    return applicationRepository.updateStatus(
      applicationId,
      application.status,
      newStatus as ApplicationStatus,
      recruiterId,
    );
  },
};
