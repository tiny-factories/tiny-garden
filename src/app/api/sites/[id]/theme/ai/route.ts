import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { generateAiSiteTheme } from "@/lib/ai-site-theme";
import { getRequestAuth } from "@/lib/request-auth";
import { buildSite } from "@/lib/build";

export const maxDuration = 120;

const MAX_PROMPT_LEN = 6000;

/**
 * Generate (and optionally apply) an AI theme for a specific site.
 *
 * Unlike `/api/admin/ai-site-theme`, this is owner-scoped:
 *   - The caller must own the site.
 *   - The same plan gate as `/api/sites/[id]/theme` (admin/friend/pro/studio).
 *
 * Body: `{ prompt: string; apply?: boolean }`.
 *
 * When `apply` is true (default), the returned tokens are written to the site
 * and a rebuild is queued — single round-trip for the editor UI.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI theme is not configured. Set ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL) on the server.",
        code: "ai_unconfigured",
      },
      { status: 503 }
    );
  }

  const { id } = await params;
  const site = await prisma.site.findUnique({ where: { id } });
  if (!site || site.userId !== auth.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: auth.userId },
    include: { subscription: true },
  });

  const plan = user.subscription?.plan || "free";
  const canCustomize =
    user.isAdmin || user.isFriend || plan === "pro" || plan === "studio";
  if (!canCustomize) {
    return NextResponse.json(
      { error: "Upgrade to Pro to use the AI theme editor.", code: "plan_required" },
      { status: 403 }
    );
  }

  let body: { prompt?: unknown; apply?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT_LEN) {
    return NextResponse.json(
      { error: "Prompt must be 1–6000 characters." },
      { status: 400 }
    );
  }
  const apply = body.apply !== false;

  let result;
  try {
    result = await generateAiSiteTheme({
      userPrompt: prompt,
      templateSlug: site.template,
    });
  } catch (err) {
    console.error("[sites/theme/ai]", err);
    const message = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json(
      { error: message, code: "ai_error" },
      { status: 502 }
    );
  }

  if (apply) {
    await prisma.site.update({
      where: { id },
      data: {
        themeColors: JSON.stringify(result.colors),
        themeFonts: JSON.stringify(result.fonts),
      },
    });
    after(() =>
      buildSite(id).catch((err) => {
        console.error("Rebuild after AI theme apply failed", id, err);
      })
    );
  }

  return NextResponse.json({ ...result, applied: apply });
}
