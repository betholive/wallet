import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT sa.*,
      COALESCE((SELECT SUM(CASE WHEN st.type='deposit' THEN st.amount ELSE -st.amount END)
        FROM savings_transactions st WHERE st.savings_account_id = sa.id), 0) as tx_net
    FROM savings_accounts sa
    ORDER BY sa.type, sa.name
  `;
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { name, type, current_balance, target_amount, annual_rate, goal_label, partners, notes } = body;

  const rows = await sql`
    INSERT INTO savings_accounts (name, type, current_balance, target_amount, annual_rate, goal_label, partners, notes)
    VALUES (${name}, ${type}, ${current_balance || 0}, ${target_amount || null}, ${annual_rate || null}, ${goal_label || null}, ${partners || null}, ${notes || null})
    RETURNING *
  `;
  return NextResponse.json(rows[0], { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { id, name, type, current_balance, target_amount, annual_rate, goal_label, partners, notes } = body;

  const rows = await sql`
    UPDATE savings_accounts
    SET name = ${name}, type = ${type}, current_balance = ${current_balance},
        target_amount = ${target_amount || null}, annual_rate = ${annual_rate || null},
        goal_label = ${goal_label || null}, partners = ${partners || null},
        notes = ${notes || null}, updated_at = NOW()
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

  await sql`DELETE FROM savings_accounts WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
