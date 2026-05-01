-- AlterTable: allow placeholder rows before an Are.na channel is linked.
ALTER TABLE "TemplateExampleChannel" ALTER COLUMN "channelSlug" DROP NOT NULL;
