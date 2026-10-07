-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'RECRUITER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "Seniority" AS ENUM ('INTERN', 'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "ResumeSource" AS ENUM ('BUILDER', 'UPLOAD');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED');

-- CreateEnum
CREATE TYPE "InterviewStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "headline" TEXT,
    "location" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruiter_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID,
    "isOrgAdmin" BOOLEAN NOT NULL DEFAULT false,
    "jobTitle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recruiter_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_postings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdById" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "seniority" "Seniority" NOT NULL,
    "location" TEXT NOT NULL,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "source" "ResumeSource" NOT NULL DEFAULT 'BUILDER',
    "content" JSONB NOT NULL,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resume_versions" (
    "id" UUID NOT NULL,
    "resumeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "content" JSONB NOT NULL,
    "sourceFileKey" TEXT,
    "rawText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resume_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "jobPostingId" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_status_history" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "fromStatus" "ApplicationStatus",
    "toStatus" "ApplicationStatus" NOT NULL,
    "changedById" UUID,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_results" (
    "id" UUID NOT NULL,
    "resumeVersionId" UUID NOT NULL,
    "jobPostingId" UUID NOT NULL,
    "scorer" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "jobPostingUpdatedAt" TIMESTAMP(3) NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_profiles_userId_key" ON "candidate_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "recruiter_profiles_userId_key" ON "recruiter_profiles"("userId");

-- CreateIndex
CREATE INDEX "recruiter_profiles_organizationId_idx" ON "recruiter_profiles"("organizationId");

-- CreateIndex
CREATE INDEX "job_postings_organizationId_idx" ON "job_postings"("organizationId");

-- CreateIndex
CREATE INDEX "job_postings_status_seniority_idx" ON "job_postings"("status", "seniority");

-- CreateIndex
CREATE INDEX "job_postings_requiredSkills_idx" ON "job_postings" USING GIN ("requiredSkills");

-- CreateIndex
CREATE INDEX "resumes_candidateId_idx" ON "resumes"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "resume_versions_resumeId_versionNumber_key" ON "resume_versions"("resumeId", "versionNumber");

-- CreateIndex
CREATE INDEX "applications_jobPostingId_status_idx" ON "applications"("jobPostingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "applications_candidateId_jobPostingId_key" ON "applications"("candidateId", "jobPostingId");

-- CreateIndex
CREATE INDEX "application_status_history_applicationId_changedAt_idx" ON "application_status_history"("applicationId", "changedAt");

-- CreateIndex
CREATE INDEX "match_results_jobPostingId_score_idx" ON "match_results"("jobPostingId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "match_results_resumeVersionId_jobPostingId_scorer_key" ON "match_results"("resumeVersionId", "jobPostingId", "scorer");

-- CreateIndex
CREATE INDEX "interviews_applicationId_idx" ON "interviews"("applicationId");

-- CreateIndex
CREATE INDEX "outbox_events_publishedAt_createdAt_idx" ON "outbox_events"("publishedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "candidate_profiles" ADD CONSTRAINT "candidate_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruiter_profiles" ADD CONSTRAINT "recruiter_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "recruiter_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_versions" ADD CONSTRAINT "resume_versions_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "candidate_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_status_history" ADD CONSTRAINT "application_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_resumeVersionId_fkey" FOREIGN KEY ("resumeVersionId") REFERENCES "resume_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_results" ADD CONSTRAINT "match_results_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "job_postings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
