import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const isKnownTemplateSlugMock = vi.fn();
const findUniqueMock = vi.fn();
const readFileMock = vi.fn();
const registerPartialMock = vi.fn();
const compileMock = vi.fn();

vi.mock("@/lib/templates-manifest", () => ({
  isKnownTemplateSlug: isKnownTemplateSlugMock,
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    site: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("fs/promises", () => ({
  default: {
    readFile: readFileMock,
  },
}));

vi.mock("handlebars", () => ({
  default: {
    registerHelper: vi.fn(),
    registerPartial: registerPartialMock,
    compile: compileMock,
  },
}));

function nextReq(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
    url,
  } as unknown as NextRequest;
}

describe("GET /api/templates/preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    isKnownTemplateSlugMock.mockResolvedValue(true);
    findUniqueMock.mockResolvedValue(null);
    readFileMock.mockImplementation(async (file: string) => {
      if (file.endsWith("index.hbs")) return "<html><head></head><body>ok</body></html>";
      if (file.endsWith("style.css")) return "";
      if (file.endsWith("block.hbs")) return "";
      return "";
    });
    compileMock.mockReturnValue(() => "<html><head></head><body>ok</body></html>");
  });

  it("returns 400 when template query param is missing", async () => {
    const { GET } = await import("@/app/api/templates/preview/route");
    const res = await GET(nextReq("https://tiny.garden/api/templates/preview"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when template slug is unknown", async () => {
    isKnownTemplateSlugMock.mockResolvedValue(false);
    const { GET } = await import("@/app/api/templates/preview/route");
    const res = await GET(
      nextReq("https://tiny.garden/api/templates/preview?template=../../etc/passwd")
    );
    expect(res.status).toBe(404);
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it("renders preview when template slug is known", async () => {
    isKnownTemplateSlugMock.mockResolvedValue(true);
    const { GET } = await import("@/app/api/templates/preview/route");
    const res = await GET(
      nextReq("https://tiny.garden/api/templates/preview?template=blog")
    );
    expect(res.status).toBe(200);
    expect(isKnownTemplateSlugMock).toHaveBeenCalledWith("blog");
    expect(readFileMock).toHaveBeenCalled();
  });
});
