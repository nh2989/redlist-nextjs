import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "redlist";
  const dataDir = path.join(process.cwd(), "public", "data", type);
  if (!fs.existsSync(dataDir)) return NextResponse.json([]);
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  return NextResponse.json(files);
}