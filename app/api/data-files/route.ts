import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const dataDir = path.join(process.cwd(), "public", "data", "redlist");
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith(".json"));
  return NextResponse.json(files);
}