import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const receivableId = searchParams.get("receivable_id");

  let rows;
  if (receivableId) {
    rows = await sql`
      SELECT rp.*, r.name as receivable_name
      FROM receivable_payments rp
      JOIN receivables r ON rp.receivable_id = r.id
      WHERE rp.receivable_id = ${receivableId}
      ORDER BY rp.date DESC
    `;
  } else {
    rows = await sql`
      SELECT rp.*, r.name as receivable_name
      FROM receivable_payments rp
      JOIN receivables r ON rp.receivable_id = r.id
      ORDER BY rp.date DESC
      LIMIT 50
    `;
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { receivable_id, amount, date, notes } = body;

  const payment = await sql`
    INSERT INTO receivable_payments (receivable_id, amount, date, notes)
    VALUES (${receivable_id}, ${amount}, ${date}, ${notes || null})
    RETURNING *
  `;

  await sql`
    UPDATE receivables
    SET current_balance = GREATEST(current_balance - ${amount}, 0),
        status = CASE WHEN current_balance - ${amount} <= 0 THEN 'paid_off' ELSE status END,
        updated_at = NOW()
    WHERE id = ${receivable_id}
  `;

  return NextResponse.json(payment[0], { status: 201 });
}
