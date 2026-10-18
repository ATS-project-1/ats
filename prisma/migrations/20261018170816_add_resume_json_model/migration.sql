-- CreateTable
CREATE TABLE "resume_json" (
    "id" UUID NOT NULL,
    "candidateId" UUID NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resume_json_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resume_json_candidateId_key" ON "resume_json"("candidateId");

-- AddForeignKey
ALTER TABLE "resume_json" ADD CONSTRAINT "resume_json_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
