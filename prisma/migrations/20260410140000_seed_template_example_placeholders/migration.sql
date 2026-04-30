-- One placeholder row per templates/* folder (templateSlug = folder name). channelSlug null until set in admin.
-- ON CONFLICT: keep existing rows (e.g. already linked channels).
INSERT INTO "TemplateExampleChannel" ("id", "templateSlug", "channelSlug", "channelTitle", "updatedAt")
SELECT gen_random_uuid()::text, v.slug, NULL, NULL, NOW()
FROM (VALUES
  ('blank'),
  ('blog'),
  ('campaign'),
  ('case-study'),
  ('changelog'),
  ('course'),
  ('directory'),
  ('document'),
  ('ecommerce'),
  ('event'),
  ('feature-requests'),
  ('feed'),
  ('finder'),
  ('gallery'),
  ('homepage'),
  ('library'),
  ('link-in-bio'),
  ('map'),
  ('photography'),
  ('portfolio'),
  ('presentation'),
  ('press-kit'),
  ('slideshow'),
  ('team'),
  ('timeline')
) AS v(slug)
ON CONFLICT ("templateSlug") DO NOTHING;
