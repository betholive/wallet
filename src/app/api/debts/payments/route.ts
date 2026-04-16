import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const debtId = searchParams.get("debt_id");

  let rows;
  if (debtId) {
    rows = await sql`
      SELECT dp.*, d.name as debt_name
      FROM debt_payments dp
      JOIN debts d ON dp.debt_id = d.id
      WHERE dp.debt_id = ${debtId}
      ORDER BY dp.date DESC
    `;
  } else {
    rows = await sql`
      SELECT dp.*, d.name as debt_name
      FROM debt_payments dp
      JOIN debts d ON dp.debt_id = d.id
      ORDER BY dp.date DESC
      LIMIT 50
    `;
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { debt_id, amount, date, notes } = body;

  const payment = await sql`
    INSERT INTO debt_payments (debt_id, amount, date, notes)
    VALUES (${debt_id}, ${amount}, ${date}, ${notes || null})
    RETURNING *
  `;

  await sql`
    UPDATE debts
    SET current_balance = GREATEST(current_balance - ${amount}, 0),
        status = CASE WHEN current_balance - ${amount} <= 0 THEN 'paid_off' ELSE status END,
        updated_at = NOW()
    WHERE id = ${debt_id}
  `;

  return NextResponse.json(payment[0], { status: 201 });
}
