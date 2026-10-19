ALTER TABLE "match_results" RENAME TO "resume_job_match_results";

ALTER TABLE "resume_job_match_results"
  RENAME CONSTRAINT "match_results_pkey" TO "resume_job_match_results_pkey";
ALTER TABLE "resume_job_match_results"
  RENAME CONSTRAINT "match_results_resumeVersionId_fkey" TO "resume_job_match_results_resumeVersionId_fkey";
ALTER TABLE "resume_job_match_results"
  RENAME CONSTRAINT "match_results_jobPostingId_fkey" TO "resume_job_match_results_jobPostingId_fkey";

ALTER INDEX "match_results_jobPostingId_score_idx"
  RENAME TO "resume_job_match_results_jobPostingId_score_idx";
ALTER INDEX "match_results_resumeVersionId_jobPostingId_scorer_key"
  RENAME TO "resume_job_match_results_resumeVersionId_jobPostingId_scorer_key";

CREATE TABLE "match_results" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_results_applicationId_key" ON "match_results"("applicationId");

ALTER TABLE "match_results"
  ADD CONSTRAINT "match_results_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
