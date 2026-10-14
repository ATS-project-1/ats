-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'ACCEPTED';

-- CreateTable
CREATE TABLE "application_histories" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "previousStatus" "ApplicationStatus",
    "newStatus" "ApplicationStatus" NOT NULL,
    "changedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_histories_applicationId_createdAt_idx" ON "application_histories"("applicationId", "createdAt");

-- AddForeignKey
ALTER TABLE "application_histories" ADD CONSTRAINT "application_histories_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_histories" ADD CONSTRAINT "application_histories_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
