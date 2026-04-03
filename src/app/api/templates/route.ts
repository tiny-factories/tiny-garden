import { NextResponse } from "next/server";
import { loadTemplatesFromDisk } from "@/lib/templates-manifest";

export async function GET() {
  try {
    const templates = await loadTemplatesFromDisk();
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json([]);
  }
}
