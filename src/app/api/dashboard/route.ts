import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { computeHealthScore } from "@/lib/health-engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const sql = getDb();
  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1);
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  // Find the most recent month with transactions (fallback if current month is empty)
  const recentMonthRes = await sql`
    SELECT to_char(date,'YYYY-MM') as month, COUNT(*) as count
    FROM transactions
    GROUP BY to_char(date,'YYYY-MM')
    ORDER BY month DESC
    LIMIT 1
  `;
  // Cap at current month - don't look at future months (in case of data entry errors)
  const rawEffectiveMonth = recentMonthRes.length > 0 && recentMonthRes[0].count > 0
    ? recentMonthRes[0].month
    : curMonth;
  const effectiveMonth = rawEffectiveMonth > curMonth ? curMonth : rawEffectiveMonth;

  const effectivePrevMonth = effectiveMonth === curMonth ? prevMonth : curMonth;

  // Run month-based queries sequentially to avoid Neon SQL concurrency issues
  const incomeThisMonth = await sql`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='income' AND to_char(date,'YYYY-MM')=${effectiveMonth}`;
  const expensesThisMonth = await sql`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE type='expense' AND to_char(date,'YYYY-MM')=${effectiveMonth}`;

  const [
    debtsAll,
    savingsAll,
    assetsAll,
    receivablesAll,
    netWorthHistory,
    recentTx,
    budgetData,
    cashFlow,
    savingsDepositsThisMonth,
    debtPaymentsThisMonth,
    prevMonthDebtBal,
  ] = await Promise.all([
    sql`SELECT * FROM debts ORDER BY status, current_balance DESC`,
    sql`SELECT * FROM savings_accounts ORDER BY type, name`,
    sql`SELECT * FROM assets ORDER BY estimated_value DESC`,
    sql`SELECT * FROM receivables ORDER BY status, current_balance DESC`,
    sql`SELECT * FROM net_worth_snapshots ORDER BY month DESC LIMIT 12`,
    sql`SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t LEFT JOIN categories c ON t.category_id=c.id ORDER BY t.date DESC LIMIT 5`,
    sql`
      SELECT b.*, c.name as category_name, c.budget_bucket,
        COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.category_id=b.category_id AND t.type='expense' AND to_char(t.date,'YYYY-MM')=b.month),0) as spent
      FROM budgets b JOIN categories c ON b.category_id=c.id
      WHERE b.month=${effectiveMonth}
    `,
    sql`
      SELECT to_char(date,'YYYY-MM') as month,
        SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses
      FROM transactions
      WHERE date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY to_char(date,'YYYY-MM')
      ORDER BY month
    `,
    sql`SELECT COALESCE(SUM(amount),0) as total FROM savings_transactions WHERE type='deposit' AND to_char(date,'YYYY-MM')=${effectiveMonth}`,
    sql`SELECT COALESCE(SUM(amount),0) as total FROM debt_payments WHERE to_char(date,'YYYY-MM')=${effectiveMonth}`,
    sql`SELECT total_debts FROM net_worth_snapshots WHERE month=${effectivePrevMonth} LIMIT 1`,
  ]);

  const monthlyIncome = Number(incomeThisMonth[0].total);
  const monthlyExpenses = Number(expensesThisMonth[0].total);
  const totalDebtBalance = debtsAll.reduce((s: number, d: Record<string, unknown>) => s + Number(d.current_balance), 0);
  const totalDebtPayments = debtsAll.reduce((s: number, d: Record<string, unknown>) => s + Number(d.minimum_payment), 0);
  const totalSavings = savingsAll.reduce((s: number, a: Record<string, unknown>) => s + Number(a.current_balance), 0);
  const emergencyFund = savingsAll.filter((a: Record<string, unknown>) => a.type === "emergency").reduce((s: number, a: Record<string, unknown>) => s + Number(a.current_balance), 0);
  const totalAssets = assetsAll.reduce((s: number, a: Record<string, unknown>) => s + Number(a.estimated_value), 0);
  const totalReceivables = receivablesAll.reduce((s: number, r: Record<string, unknown>) => s + Number(r.current_balance), 0);
  const netWorth = totalAssets + totalSavings + totalReceivables - totalDebtBalance;

  const prevNW = netWorthHistory.length > 0 ? Number(netWorthHistory[0].net_worth) : 0;
  const prevDebtBal = prevMonthDebtBal.length > 0 ? Number(prevMonthDebtBal[0].total_debts) : totalDebtBalance;

  const budgetTotal = budgetData.length;
  const budgetOnTrack = budgetData.filter((b: Record<string, unknown>) => Number(b.spent) <= Number(b.budgeted_amount)).length;

  const health = computeHealthScore({
    monthly_income: monthlyIncome,
    monthly_expenses: monthlyExpenses,
    total_debt_payments: totalDebtPayments,
    total_debt_balance: totalDebtBalance,
    prev_month_debt_balance: prevDebtBal,
    total_savings: totalSavings,
    savings_deposits_this_month: Number(savingsDepositsThisMonth[0].total),
    emergency_fund: emergencyFund,
    total_assets: totalAssets,
    net_worth: netWorth,
    prev_net_worth: prevNW,
    budget_categories_total: budgetTotal,
    budget_categories_on_track: budgetOnTrack,
  });

  // Build consolidated accounts array
  const accounts = [
    // Savings accounts
    ...savingsAll.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      name: a.name as string,
      type: 'savings' as const,
      balance: Number(a.current_balance),
      original: undefined,
      paid: undefined,
      progress: a.target_amount ? Math.min((Number(a.current_balance) / Number(a.target_amount)) * 100, 100) : undefined,
    })),
    // Debts
    ...debtsAll.filter((d: Record<string, unknown>) => d.status === 'active').map((d: Record<string, unknown>) => ({
      id: d.id as string,
      name: d.name as string,
      type: 'debt' as const,
      balance: Number(d.current_balance),
      original: Number(d.original_amount),
      paid: Number(d.total_paid || 0),
      progress: d.original_amount ? Math.min((Number(d.total_paid || 0) / Number(d.original_amount)) * 100, 100) : undefined,
    })),
    // Assets
    ...assetsAll.map((a: Record<string, unknown>) => ({
      id: a.id as string,
      name: a.name as string,
      type: 'asset' as const,
      balance: Number(a.estimated_value),
      original: undefined,
      paid: undefined,
      progress: undefined,
    })),
    // Receivables
    ...receivablesAll.filter((r: Record<string, unknown>) => r.status === 'active').map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      type: 'receivable' as const,
      balance: Number(r.current_balance),
      original: Number(r.original_amount),
      paid: Number(r.original_amount) - Number(r.current_balance),
      progress: r.original_amount ? Math.min(((Number(r.original_amount) - Number(r.current_balance)) / Number(r.original_amount)) * 100, 100) : undefined,
    })),
  ];

  // Simplified health data
  const simpleHealth = {
    score: health.score,
    grade: health.grade as 'excellent' | 'strong' | 'progressing' | 'struggling' | 'critical',
    dti_ratio: health.dti_ratio,
    savings_rate: health.savings_rate,
  };

  return NextResponse.json({
    net_worth: netWorth,
    monthly_income: monthlyIncome,
    monthly_expenses: monthlyExpenses,
    surplus: monthlyIncome - monthlyExpenses,
    effective_month: effectiveMonth,
    accounts,
    cash_flow: cashFlow.map((r: Record<string, unknown>) => ({
      month: r.month,
      income: Number(r.income),
      expenses: Number(r.expenses),
    })),
    recent_transactions: recentTx.map((t: Record<string, unknown>) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      category_name: t.category_name,
      date: t.date,
    })),
    health: simpleHealth,
  });
}
