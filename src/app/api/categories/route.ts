import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  let rows;
  if (type) {
    rows = await sql`SELECT * FROM categories WHERE type = ${type} ORDER BY name`;
  } else {
    rows = await sql`SELECT * FROM categories ORDER BY type, name`;
  }
  return NextResponse.json(rows);
}
