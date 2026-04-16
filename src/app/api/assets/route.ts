import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`SELECT * FROM assets ORDER BY estimated_value DESC`;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { name, category, estimated_value, purchase_date, notes } = body;

  const rows = await sql`
    INSERT INTO assets (name, category, estimated_value, purchase_date, notes)
    VALUES (${name}, ${category || 'other'}, ${estimated_value}, ${purchase_date || null}, ${notes || null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { id, name, category, estimated_value, purchase_date, notes } = body;

  const rows = await sql`
    UPDATE assets
    SET name = ${name}, category = ${category || 'other'}, estimated_value = ${estimated_value},
        purchase_date = ${purchase_date || null}, notes = ${notes || null}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(rows[0]);
}

export async function DELETE(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await sql`DELETE FROM assets WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
