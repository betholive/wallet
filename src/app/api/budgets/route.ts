import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sql = getDb();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 });

  const rows = await sql`
    SELECT b.*, c.name as category_name, c.color as category_color, c.budget_bucket,
      COALESCE((
        SELECT SUM(t.amount)::numeric FROM transactions t
        WHERE t.category_id = b.category_id
          AND t.type = 'expense'
          AND to_char(t.date, 'YYYY-MM') = b.month
      ), 0) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.month = ${month}
    ORDER BY c.budget_bucket, c.name
  `;

  const income = await sql`
    SELECT COALESCE(SUM(amount), 0)::numeric as total
    FROM transactions
    WHERE type = 'income' AND to_char(date, 'YYYY-MM') = ${month}
  `;

  return NextResponse.json({
    budgets: rows,
    monthly_income: Number(income[0].total),
  });
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { budgets, month } = body;

  if (!budgets || !month) {
    return NextResponse.json({ error: "budgets and month required" }, { status: 400 });
  }

  for (const b of budgets) {
    await sql`
      INSERT INTO budgets (category_id, month, budgeted_amount)
      VALUES (${b.category_id}, ${month}, ${b.budgeted_amount})
      ON CONFLICT (category_id, month)
      DO UPDATE SET budgeted_amount = ${b.budgeted_amount}, updated_at = NOW()
    `;
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
