export interface Debt {
  id: string;
  name: string;
  current_balance: number;
  original_amount: number;
  interest_rate_monthly: number;
  minimum_payment: number;
  due_date?: string;
  total_paid?: number; // Total payments made (from debt_payments)
}

export interface PayoffProgress {
  debt_id: string;
  debt_name: string;
  original: number;
  current_balance: number;
  total_paid: number;
  percent_paid: number;
  remaining_months: number | null; // Estimated if minimum_payment > 0
}

// Simple payoff progress based on ACTUAL payments, not projections
export function calculatePayoffProgress(debts: Debt[]): PayoffProgress[] {
  return debts.map(d => {
    const original = d.original_amount || d.current_balance + (d.total_paid || 0);
    const paid = d.total_paid || (original - d.current_balance);
    const percent = original > 0 ? Math.min((paid / original) * 100, 100) : 0;
    
    // Rough estimate: how many months at minimum payment
    let remainingMonths: number | null = null;
    if (d.minimum_payment > 0 && d.current_balance > 0) {
      remainingMonths = Math.ceil(d.current_balance / d.minimum_payment);
    }
    
    return {
      debt_id: d.id,
      debt_name: d.name,
      original,
      current_balance: d.current_balance,
      total_paid: paid,
      percent_paid: Math.round(percent),
      remaining_months: remainingMonths,
    };
  });
}

// Calculate total debt stats
export function getDebtStats(debts: Debt[]) {
  const totalBalance = debts.reduce((s, d) => s + d.current_balance, 0);
  const totalOriginal = debts.reduce((s, d) => s + (d.original_amount || d.current_balance), 0);
  const totalPaid = debts.reduce((s, d) => s + (d.total_paid || 0), 0);
  const totalMinPayment = debts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
  const avgRate = debts.length > 0 
    ? debts.reduce((s, d) => s + d.interest_rate_monthly, 0) / debts.length 
    : 0;
  
  return {
    total_balance: totalBalance,
    total_original: totalOriginal,
    total_paid: totalPaid,
    percent_paid: totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0,
    total_minimum_payment: totalMinPayment,
    avg_monthly_rate: avgRate,
    active_count: debts.filter(d => d.current_balance > 0).length,
  };
}

// Keep old exports for compatibility (deprecated)
export interface PayoffResult {
  order: string[];
  total_months: number;
  total_interest: number;
  total_paid: number;
  debt_free_date: string;
  timeline: { month: number; total_balance: number }[];
  required_monthly_payment: number;
  is_feasible: boolean;
  warning?: string;
}

// Stubbed - no more complex simulation
export function snowball(debts: Debt[], _extraMonthly: number = 0): PayoffResult {
  const stats = getDebtStats(debts);
  return {
    order: debts.map(d => d.name),
    total_months: 0,
    total_interest: 0,
    total_paid: stats.total_paid,
    debt_free_date: "",
    timeline: [],
    required_monthly_payment: stats.total_minimum_payment,
    is_feasible: true,
    warning: "Payoff simulation removed — track actual payments instead",
  };
}

export function avalanche(debts: Debt[], _extraMonthly: number = 0): PayoffResult {
  return snowball(debts, _extraMonthly);
}

export function getPayoffRecommendation(debts: Debt[], _extraMonthly: number = 0): string {
  const active = debts.filter(d => d.current_balance > 0).length;
  if (active === 0) return "✅ No active debts — you're debt free!";
  return `💡 ${active} active debt(s). Record payments to track payoff progress.`;
}
