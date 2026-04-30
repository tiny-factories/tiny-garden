import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateAiSiteTheme } from "@/lib/ai-site-theme";
import { isKnownTemplateSlug } from "@/lib/templates-manifest";
import { getRequestAuth } from "@/lib/request-auth";

export const maxDuration = 120;

const MAX_PROMPT_LEN = 6000;

export async function POST(req: NextRequest) {
  const auth = await getRequestAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthorized" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden", code: "forbidden" }, { status: 403 });
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

  let body: { prompt?: unknown; template?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prompt =
    typeof body.prompt === "string" ? body.prompt.trim() : "";
  const template =
    typeof body.template === "string" ? body.template.trim() : "";

  if (!prompt || prompt.length > MAX_PROMPT_LEN) {
    return NextResponse.json(
      { error: "Prompt must be 1–6000 characters." },
      { status: 400 }
    );
  }

  if (!template || !(await isKnownTemplateSlug(template))) {
    return NextResponse.json({ error: "Invalid template" }, { status: 400 });
  }

  try {
    const result = await generateAiSiteTheme({
      userPrompt: prompt,
      templateSlug: template,
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error("ai-site-theme:", e);
    const message = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json(
      { error: message, code: "ai_error" },
      { status: 502 }
    );
  }
}
