import Link from "next/link";
import fs from "fs/promises";
import path from "path";

interface TemplateMeta {
  name: string;
  description: string;
  slug: string;
}

async function getTemplates(): Promise<TemplateMeta[]> {
  const templatesDir = path.join(process.cwd(), "templates");
  const entries = await fs.readdir(templatesDir, { withFileTypes: true });
  const templates: TemplateMeta[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const meta = JSON.parse(
        await fs.readFile(path.join(templatesDir, entry.name, "meta.json"), "utf-8")
      );
      templates.push({ ...meta, slug: entry.name });
    } catch {
      // skip directories without meta.json
    }
  }

  return templates;
}

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <header
        style={{
          padding: "2rem 2rem 1.5rem",
          borderBottom: "1px solid #e5e5e5",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>
            Templates
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#666", margin: 0 }}>
            Preview each template with sample Are.na content. Click to view full-screen.
          </p>
        </div>
        <Link
          href="/#templates"
          style={{
            fontSize: "0.75rem",
            color: "#666",
            textDecoration: "none",
            padding: "0.375rem 0.75rem",
            border: "1px solid #ddd",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}
        >
          Back to home
        </Link>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(560px, 1fr))",
          gap: "2rem",
          padding: "2rem",
        }}
      >
        {templates.map((t) => (
          <div key={t.slug} style={{ border: "1px solid #e5e5e5", borderRadius: "8px", overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem 1rem",
                borderBottom: "1px solid #e5e5e5",
                background: "#fafafa",
              }}
            >
              <div>
                <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{t.name}</span>
                <span style={{ color: "#999", fontSize: "0.75rem", marginLeft: "0.5rem" }}>
                  {t.description}
                </span>
              </div>
              <a
                href={`/api/templates/preview?template=${t.slug}`}
                target="_blank"
                rel="noopener"
                style={{
                  fontSize: "0.75rem",
                  color: "#666",
                  textDecoration: "none",
                  padding: "0.25rem 0.5rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              >
                Open
              </a>
            </div>
            <iframe
              src={`/api/templates/preview?template=${t.slug}`}
              style={{
                width: "100%",
                height: "500px",
                border: "none",
                display: "block",
              }}
              title={`${t.name} preview`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
