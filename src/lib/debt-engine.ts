export interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate_monthly: number;
  minimum_payment: number;
  due_date?: string; // ISO date string
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
  required_monthly_payment: number; // To pay off by due date
  is_feasible: boolean; // Can it be paid by due date?
  warning?: string;
}

// Calculate months between now and due date
function monthsToDueDate(dueDateStr?: string): number {
  if (!dueDateStr) return 600; // No due date = use max
  const due = new Date(dueDateStr);
  const now = new Date();
  const months = (due.getFullYear() - now.getFullYear()) * 12 + (due.getMonth() - now.getMonth());
  return Math.max(1, months); // At least 1 month
}

// Calculate required payment to pay off a debt by its due date
export function calculateRequiredPayment(debt: Debt): { monthly: number; is_feasible: boolean; warning?: string } {
  const months = monthsToDueDate(debt.due_date);
  const balance = debt.current_balance;
  const rate = debt.interest_rate_monthly / 100;
  
  // If no interest, simple division
  if (rate === 0 || months === 0) {
    return { monthly: balance / months, is_feasible: true };
  }
  
  // Amortization formula: P = r*PV / (1 - (1+r)^-n)
  // Where P = payment, r = monthly rate, PV = present value, n = number of payments
  const monthlyPayment = (rate * balance) / (1 - Math.pow(1 + rate, -months));
  
  // Check if payment exceeds balance (very short term)
  if (monthlyPayment > balance * 1.5) {
    return { 
      monthly: balance, 
      is_feasible: false, 
      warning: `Due date requires paying ${Math.round(monthlyPayment / balance * 100)}% of balance monthly` 
    };
  }
  
  return { monthly: monthlyPayment, is_feasible: true };
}

function simulatePayoff(debts: Debt[], extraMonthly: number, sortFn: (a: Debt, b: Debt) => number): PayoffResult {
  if (debts.length === 0) {
    return { 
      order: [], total_months: 0, total_interest: 0, total_paid: 0, 
      debt_free_date: "", timeline: [], required_monthly_payment: 0, is_feasible: true 
    };
  }

  const sorted = [...debts].sort(sortFn);
  const order: string[] = sorted.map(d => d.name);
  
  // Calculate required payments for each debt based on due dates
  let totalRequiredPayment = 0;
  const requiredPayments = new Map<string, number>();
  
  for (const d of sorted) {
    const req = calculateRequiredPayment(d);
    // Use the MAX of required payment or minimum payment
    const payment = Math.max(req.monthly, d.minimum_payment || 0);
    requiredPayments.set(d.id, payment);
    totalRequiredPayment += payment;
  }
  
  const balances = new Map<string, number>();
  const monthsRemaining = new Map<string, number>();
  
  for (const d of debts) {
    balances.set(d.id, d.current_balance);
    monthsRemaining.set(d.id, monthsToDueDate(d.due_date));
  }

  let month = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  const timeline: { month: number; total_balance: number }[] = [];
  const maxMonths = Math.max(...Array.from(monthsRemaining.values())) + 12; // Buffer
  
  // Check feasibility
  const isFeasible = extraMonthly + sorted.reduce((s, d) => s + (d.minimum_payment || 0), 0) >= totalRequiredPayment * 0.9;

  while (month < maxMonths && month < 600) {
    const totalBal = Array.from(balances.values()).reduce((s, b) => s + b, 0);
    if (totalBal <= 0) break;
    
    // Cap total balance to prevent overflow display
    const displayBal = totalBal > 1e15 ? 1e15 : totalBal;
    timeline.push({ month, total_balance: Math.round(displayBal) });
    month++;

    let extraLeft = extraMonthly;

    for (const d of sorted) {
      let bal = balances.get(d.id) || 0;
      if (bal <= 0) continue;
      
      // Decrement months remaining
      const monthsLeft = (monthsRemaining.get(d.id) || 600) - 1;
      monthsRemaining.set(d.id, monthsLeft);

      // Calculate interest (cap to prevent overflow)
      const interest = Math.min(bal * (d.interest_rate_monthly / 100), bal * 10);
      totalInterest = Math.min(totalInterest + interest, 1e15); // Cap total interest
      bal += interest;

      // Determine payment: use required payment if approaching due date, else minimum
      const requiredPay = requiredPayments.get(d.id) || 0;
      let payment = 0;
      
      if (monthsLeft <= 0) {
        // Overdue - pay off immediately if possible
        payment = Math.min(bal, extraLeft + (d.minimum_payment || 0) + requiredPay);
        extraLeft = 0;
      } else if (monthsLeft <= 3 || bal > requiredPay * monthsLeft * 1.2) {
        // Getting close to due date, accelerate
        payment = Math.min(requiredPay, bal);
      } else {
        // Normal minimum payment
        payment = Math.min(d.minimum_payment || 0, bal);
      }
      
      bal -= payment;
      totalPaid = Math.min(totalPaid + payment, 1e15); // Cap total paid

      // Apply extra payments strategically
      if (extraLeft > 0 && bal > 0) {
        const extraPay = Math.min(extraLeft, bal);
        bal -= extraPay;
        extraLeft -= extraPay;
        totalPaid = Math.min(totalPaid + extraPay, 1e15);
      }

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
  
  // Generate warning if not feasible
  let warning: string | undefined;
  if (!isFeasible) {
    const shortfall = totalRequiredPayment - (extraMonthly + sorted.reduce((s, d) => s + (d.minimum_payment || 0), 0));
    warning = `Need ${Math.round(shortfall).toLocaleString()} UGX more monthly to meet due dates`;
  }
  
  // Check for any overdue debts
  const overdueDebts = sorted.filter(d => {
    const monthsLeft = monthsToDueDate(d.due_date);
    return monthsLeft <= 0 && (balances.get(d.id) || 0) > 0;
  });
  
  if (overdueDebts.length > 0 && !warning) {
    warning = `${overdueDebts.length} debt(s) overdue: ${overdueDebts.map(d => d.name).join(", ")}`;
  }

  return {
    order,
    total_months: month,
    total_interest: Math.round(Math.min(totalInterest, 1e12)),
    total_paid: Math.round(Math.min(totalPaid, 1e12)),
    debt_free_date: debtFreeDate,
    timeline,
    required_monthly_payment: Math.round(totalRequiredPayment),
    is_feasible: isFeasible && overdueDebts.length === 0,
    warning,
  };
}

export function snowball(debts: Debt[], extraMonthly: number = 0): PayoffResult {
  return simulatePayoff(debts, extraMonthly, (a, b) => a.current_balance - b.current_balance);
}

export function avalanche(debts: Debt[], extraMonthly: number = 0): PayoffResult {
  return simulatePayoff(debts, extraMonthly, (a, b) => b.interest_rate_monthly - a.interest_rate_monthly);
}

// Helper to get payoff strategy recommendation
export function getPayoffRecommendation(debts: Debt[], extraMonthly: number = 0): string {
  const snow = snowball(debts, extraMonthly);
  const ava = avalanche(debts, extraMonthly);
  
  if (!snow.is_feasible && !ava.is_feasible) {
    return "⚠️ Increase monthly payments to meet due dates. Consider debt consolidation or negotiating terms.";
  }
  
  const interestDiff = snow.total_interest - ava.total_interest;
  const monthDiff = snow.total_months - ava.total_months;
  
  if (interestDiff > 100000) {
    return `💰 Avalanche saves ${Math.round(interestDiff).toLocaleString()} UGX in interest`;
  } else if (monthDiff > 2) {
    return `⏱️ Snowball pays off ${monthDiff} months faster for psychological wins`;
  } else {
    return "✅ Both strategies are similar — pick what motivates you more";
  }
}
