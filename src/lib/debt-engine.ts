export interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate_monthly: number;
  minimum_payment: number;
}

export interface PayoffStep {
  month: number;
  debt_name: string;
  payment: number;
  interest: number;
  principal: number;
  remaining: number;
}

export interface PayoffResult {
  order: string[];
  total_months: number;
  total_interest: number;
  total_paid: number;
  debt_free_date: string;
  timeline: { month: number; total_balance: number }[];
}

function simulatePayoff(debts: Debt[], extraMonthly: number, sortFn: (a: Debt, b: Debt) => number): PayoffResult {
  if (debts.length === 0) {
    return { order: [], total_months: 0, total_interest: 0, total_paid: 0, debt_free_date: "", timeline: [] };
  }

  const balances = new Map<string, number>();
  const sorted = [...debts].sort(sortFn);
  const order: string[] = sorted.map(d => d.name);

  for (const d of debts) {
    balances.set(d.id, d.current_balance);
  }

  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const timeline: { month: number; total_balance: number }[] = [];
  const maxMonths = 600;

  while (month < maxMonths) {
    const totalBal = Array.from(balances.values()).reduce((s, b) => s + b, 0);
    if (totalBal <= 0) break;

    timeline.push({ month, total_balance: Math.round(totalBal) });
    month++;

    let extraLeft = extraMonthly;

    for (const d of sorted) {
      let bal = balances.get(d.id) || 0;
      if (bal <= 0) continue;

      const interest = bal * (d.interest_rate_monthly / 100);
      totalInterest += interest;
      bal += interest;

      const minPay = Math.min(d.minimum_payment, bal);
      bal -= minPay;
      totalPaid += minPay;

      balances.set(d.id, Math.max(bal, 0));
    }

    for (const d of sorted) {
      if (extraLeft <= 0) break;
      let bal = balances.get(d.id) || 0;
      if (bal <= 0) continue;

      const extraPay = Math.min(extraLeft, bal);
      bal -= extraPay;
      extraLeft -= extraPay;
      totalPaid += extraPay;
      balances.set(d.id, Math.max(bal, 0));
    }
  }

  const finalBal = Array.from(balances.values()).reduce((s, b) => s + b, 0);
  if (finalBal <= 0) {
    timeline.push({ month, total_balance: 0 });
  }

  const now = new Date();
  const freeDate = new Date(now.getFullYear(), now.getMonth() + month);
  const debtFreeDate = freeDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return {
    order,
    total_months: month,
    total_interest: Math.round(totalInterest),
    total_paid: Math.round(totalPaid),
    debt_free_date: debtFreeDate,
    timeline,
  };
}

export function snowball(debts: Debt[], extraMonthly: number = 0): PayoffResult {
  return simulatePayoff(debts, extraMonthly, (a, b) => a.current_balance - b.current_balance);
}

export function avalanche(debts: Debt[], extraMonthly: number = 0): PayoffResult {
  return simulatePayoff(debts, extraMonthly, (a, b) => b.interest_rate_monthly - a.interest_rate_monthly);
}
