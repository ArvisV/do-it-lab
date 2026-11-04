/*
  Warnings:

  - You are about to drop the column `materials` on the `ProjectStep` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "isGalleryPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ProjectStep" DROP COLUMN "materials",
ADD COLUMN     "imagePath" TEXT;

-- CreateTable
CREATE TABLE "ProjectMaterial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'gab.',
    "quantityAvailable" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepMaterial" (
    "id" TEXT NOT NULL,
    "quantityNeeded" DECIMAL(10,2) NOT NULL,
    "quantityUsed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stepId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,

    CONSTRAINT "StepMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectGalleryImage" (
    "id" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectGalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectMaterial_projectId_sortOrder_idx" ON "ProjectMaterial"("projectId", "sortOrder");

-- CreateIndex
CREATE INDEX "StepMaterial_stepId_idx" ON "StepMaterial"("stepId");

-- CreateIndex
CREATE INDEX "StepMaterial_materialId_idx" ON "StepMaterial"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "StepMaterial_stepId_materialId_key" ON "StepMaterial"("stepId", "materialId");

-- CreateIndex
CREATE INDEX "ProjectGalleryImage_projectId_sortOrder_idx" ON "ProjectGalleryImage"("projectId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProjectMaterial" ADD CONSTRAINT "ProjectMaterial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepMaterial" ADD CONSTRAINT "StepMaterial_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "ProjectStep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepMaterial" ADD CONSTRAINT "StepMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ProjectMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGalleryImage" ADD CONSTRAINT "ProjectGalleryImage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
