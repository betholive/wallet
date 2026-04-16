import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id");

  let rows;
  if (accountId) {
    rows = await sql`
      SELECT st.*, sa.name as account_name
      FROM savings_transactions st
      JOIN savings_accounts sa ON st.savings_account_id = sa.id
      WHERE st.savings_account_id = ${accountId}
      ORDER BY st.date DESC
    `;
  } else {
    rows = await sql`
      SELECT st.*, sa.name as account_name
      FROM savings_transactions st
      JOIN savings_accounts sa ON st.savings_account_id = sa.id
      ORDER BY st.date DESC LIMIT 50
    `;
  }
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { savings_account_id, amount, type, date, notes } = body;

  const tx = await sql`
    INSERT INTO savings_transactions (savings_account_id, amount, type, date, notes)
    VALUES (${savings_account_id}, ${amount}, ${type}, ${date}, ${notes || null})
    RETURNING *
  `;

  if (type === "deposit") {
    await sql`UPDATE savings_accounts SET current_balance = current_balance + ${amount}, updated_at = NOW() WHERE id = ${savings_account_id}`;
  } else {
    await sql`UPDATE savings_accounts SET current_balance = GREATEST(current_balance - ${amount}, 0), updated_at = NOW() WHERE id = ${savings_account_id}`;
  }

  return NextResponse.json(tx[0], { status: 201 });
}
