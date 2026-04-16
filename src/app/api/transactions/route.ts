import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const categoryId = searchParams.get("category_id");
  const month = searchParams.get("month");

  const rows = await sql`
    SELECT t.*, c.name as category_name, c.color as category_color, c.budget_bucket
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE (${type}::text IS NULL OR t.type = ${type})
      AND (${categoryId}::text IS NULL OR t.category_id = ${categoryId}::uuid)
      AND (${month}::text IS NULL OR to_char(t.date, 'YYYY-MM') = ${month})
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT 200
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { type, amount, category_id, description, date, is_recurring, recurrence } = body;

  const rows = await sql`
    INSERT INTO transactions (type, amount, category_id, description, date, is_recurring, recurrence)
    VALUES (${type}, ${amount}, ${category_id || null}, ${description || null}, ${date}, ${is_recurring || false}, ${recurrence || null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { id, type, amount, category_id, description, date, is_recurring, recurrence } = body;

  const rows = await sql`
    UPDATE transactions
    SET type = ${type}, amount = ${amount}, category_id = ${category_id || null},
        description = ${description || null}, date = ${date},
        is_recurring = ${is_recurring || false}, recurrence = ${recurrence || null}
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

  await sql`DELETE FROM transactions WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
