import { ForbiddenError, NotFoundError } from '../common/errors';
import type { Resume } from './resume.schema';
import { resumeJsonRepository } from './resume-json.repository';

export const resumeJsonService = {
  /**
   * Creates a new JSON resume for the given candidate.
   * Throws ConflictError if the candidate already has a resume (enforced by the
   * unique constraint on candidateId in the resume_json table, which Prisma maps
   * to a P2002 → ConflictError via withMappedErrors).
   */
  async createResume(candidateId: string, content: Resume) {
    return resumeJsonRepository.createResume(candidateId, content as object);
  },

  /**
   * Returns the candidate's resume.
   * Throws NotFoundError when no resume has been created yet.
   */
  async getResume(candidateId: string) {
    const resume = await resumeJsonRepository.getResumeByCandidateId(candidateId);
    if (!resume) {
      throw new NotFoundError('Resume not found', 'RESUME_NOT_FOUND');
    }
    return resume;
  },

  /**
   * Updates the content of a resume identified by resumeId.
   * Fetches the existing resume first and verifies that resume.candidateId === candidateId
   * before allowing the update, preventing Insecure Direct Object Reference (IDOR).
   */
  async updateResume(candidateId: string, resumeId: string, content: Partial<Resume>) {
    // Fetch the target resume by candidateId to get the authoritative ownership record.
    const resume = await resumeJsonRepository.getResumeByCandidateId(candidateId);
    if (!resume) {
      throw new NotFoundError('Resume not found', 'RESUME_NOT_FOUND');
    }

    // IDOR guard: the resume's owner must match the requesting candidateId,
    // and the requested resumeId must correspond to the same record.
    if (resume.candidateId !== candidateId || resume.id !== resumeId) {
      throw new ForbiddenError(
        'You do not have permission to modify this resume',
        'Unauthorized_Action',
      );
    }

    return resumeJsonRepository.updateResume(resumeId, content as object);
  },
};
