import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT d.*,
      COALESCE((SELECT SUM(dp.amount)::numeric FROM debt_payments dp WHERE dp.debt_id = d.id), 0) as total_paid
    FROM debts d
    ORDER BY d.status ASC, d.current_balance DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { name, creditor, original_amount, current_balance, interest_rate_monthly, minimum_payment, start_date, due_date, notes } = body;

  const rows = await sql`
    INSERT INTO debts (name, creditor, original_amount, current_balance, interest_rate_monthly, minimum_payment, start_date, due_date, notes)
    VALUES (${name}, ${creditor || null}, ${original_amount}, ${current_balance}, ${interest_rate_monthly}, ${minimum_payment}, ${start_date || null}, ${due_date || null}, ${notes || null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { id, name, creditor, original_amount, current_balance, interest_rate_monthly, minimum_payment, start_date, due_date, status, notes } = body;

  const rows = await sql`
    UPDATE debts
    SET name = ${name}, creditor = ${creditor || null}, original_amount = ${original_amount},
        current_balance = ${current_balance}, interest_rate_monthly = ${interest_rate_monthly},
        minimum_payment = ${minimum_payment}, start_date = ${start_date || null},
        due_date = ${due_date || null}, status = ${status || 'active'}, notes = ${notes || null},
        updated_at = NOW()
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

  await sql`DELETE FROM debts WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
