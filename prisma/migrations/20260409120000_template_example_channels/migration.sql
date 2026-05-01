-- CreateTable
CREATE TABLE "TemplateExampleChannel" (
    "id" TEXT NOT NULL,
    "templateSlug" TEXT NOT NULL,
    "channelSlug" TEXT NOT NULL,
    "channelTitle" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateExampleChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateExampleChannel_templateSlug_key" ON "TemplateExampleChannel"("templateSlug");
