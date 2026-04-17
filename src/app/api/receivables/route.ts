import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT r.*,
      COALESCE((SELECT SUM(rp.amount)::numeric FROM receivable_payments rp WHERE rp.receivable_id = r.id), 0) as total_received
    FROM receivables r
    ORDER BY r.status ASC, r.current_balance DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { name, person, original_amount, current_balance, interest_rate_monthly, start_date, due_date, notes } = body;

  const rows = await sql`
    INSERT INTO receivables (name, person, original_amount, current_balance, interest_rate_monthly, start_date, due_date, notes)
    VALUES (${name}, ${person || null}, ${original_amount}, ${current_balance}, ${interest_rate_monthly || 0}, ${start_date || null}, ${due_date || null}, ${notes || null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { id, name, person, original_amount, current_balance, interest_rate_monthly, start_date, due_date, status, notes } = body;

  const rows = await sql`
    UPDATE receivables
    SET name = ${name}, person = ${person || null}, original_amount = ${original_amount},
        current_balance = ${current_balance}, interest_rate_monthly = ${interest_rate_monthly || 0},
        start_date = ${start_date || null}, due_date = ${due_date || null},
        status = ${status || 'active'}, notes = ${notes || null}, updated_at = NOW()
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

  await sql`DELETE FROM receivables WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
