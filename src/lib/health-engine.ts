export interface HealthInput {
  monthly_income: number;
  monthly_expenses: number;
  total_debt_payments: number;
  total_debt_balance: number;
  prev_month_debt_balance: number;
  total_savings: number;
  savings_deposits_this_month: number;
  emergency_fund: number;
  total_assets: number;
  net_worth: number;
  prev_net_worth: number;
  budget_categories_total: number;
  budget_categories_on_track: number;
}

export interface HealthResult {
  score: number;
  grade: "critical" | "struggling" | "progressing" | "strong" | "excellent";
  color: string;
  savings_rate: number;
  dti_ratio: number;
  cash_flow_ratio: number;
  emergency_months: number;
  budget_adherence: number;
  net_worth_growing: boolean;
  debt_shrinking: boolean;
  advice: string[];
  financial_freedom_number: number;
  freedom_progress: number;
}

export function computeHealthScore(input: HealthInput): HealthResult {
  const {
    monthly_income, monthly_expenses, total_debt_payments,
    total_debt_balance, prev_month_debt_balance,
    total_savings, savings_deposits_this_month, emergency_fund,
    total_assets, net_worth, prev_net_worth,
    budget_categories_total, budget_categories_on_track,
  } = input;

  const income = Math.max(monthly_income, 1);

  // 1. Savings rate (target >= 20%)
  const savings_rate = (savings_deposits_this_month / income) * 100;
  const savingsScore = Math.min(savings_rate / 20, 1) * 100;

  // 2. DTI ratio (target < 20%, danger > 36%)
  const dti_ratio = (total_debt_payments / income) * 100;
  let dtiScore = 100;
  if (dti_ratio > 50) dtiScore = 0;
  else if (dti_ratio > 36) dtiScore = 20;
  else if (dti_ratio > 20) dtiScore = 60;
  else dtiScore = 100;

  // 3. Budget adherence
  const budget_adherence = budget_categories_total > 0
    ? (budget_categories_on_track / budget_categories_total) * 100
    : 50;

  // 4. Emergency fund (target 3-6 months)
  const monthlyExpense = Math.max(monthly_expenses, 1);
  const emergency_months = emergency_fund / monthlyExpense;
  let emergencyScore = 0;
  if (emergency_months >= 6) emergencyScore = 100;
  else if (emergency_months >= 3) emergencyScore = 80;
  else if (emergency_months >= 1) emergencyScore = 40;
  else emergencyScore = emergency_months * 40;

  // 5. Net worth trend
  const net_worth_growing = net_worth > prev_net_worth;
  const nwScore = net_worth_growing ? 100 : (net_worth === prev_net_worth ? 50 : 0);

  // 6. Debt payoff progress
  const debt_shrinking = total_debt_balance < prev_month_debt_balance;
  const debtProgressScore = total_debt_balance === 0 ? 100 : (debt_shrinking ? 80 : 20);

  // Weighted composite
  const score = Math.round(
    savingsScore * 0.20 +
    dtiScore * 0.25 +
    budget_adherence * 0.15 +
    emergencyScore * 0.15 +
    nwScore * 0.15 +
    debtProgressScore * 0.10
  );

  // Cash flow ratio
  const cash_flow_ratio = income / Math.max(monthly_expenses + total_debt_payments, 1);

  // Financial freedom number (Rule of 25)
  const annual_expenses = monthly_expenses * 12;
  const financial_freedom_number = annual_expenses * 25;
  const freedom_progress = financial_freedom_number > 0
    ? Math.min(((total_savings + total_assets) / financial_freedom_number) * 100, 100)
    : 0;

  // Grade
  let grade: HealthResult["grade"];
  let color: string;
  if (score >= 80) { grade = "excellent"; color = "#16a34a"; }
  else if (score >= 60) { grade = "strong"; color = "#0d9488"; }
  else if (score >= 40) { grade = "progressing"; color = "#d97706"; }
  else if (score >= 20) { grade = "struggling"; color = "#ea580c"; }
  else { grade = "critical"; color = "#dc2626"; }

  // Advice
  const advice: string[] = [];

  if (dti_ratio > 36) {
    advice.push(`Your debt-to-income ratio is ${dti_ratio.toFixed(0)}% — critically high. Focus all extra money on the highest-rate debt first.`);
  } else if (dti_ratio > 20) {
    advice.push(`DTI at ${dti_ratio.toFixed(0)}%. Accelerate debt payoff to get below 20%.`);
  }

  if (emergency_months < 3) {
    advice.push(`Emergency fund covers only ${emergency_months.toFixed(1)} months. Build to 3 months before accelerating other goals.`);
  }

  if (savings_rate < 20) {
    advice.push(`Savings rate is ${savings_rate.toFixed(0)}%. Target 20% — try cutting wants spending to free up more.`);
  }

  if (!net_worth_growing && net_worth < prev_net_worth) {
    advice.push("Net worth declined this month. Review where money is going — check budget adherence.");
  }

  if (total_debt_balance > 0 && !debt_shrinking) {
    advice.push("Debt balances aren't shrinking. Make sure you're paying more than just interest.");
  }

  if (budget_adherence < 70) {
    advice.push(`Only ${budget_adherence.toFixed(0)}% of budget categories are on track. Tighten spending on over-budget items.`);
  }

  if (advice.length === 0) {
    advice.push("You're on a strong path. Keep building assets and watch your net worth grow.");
  }

  return {
    score,
    grade,
    color,
    savings_rate,
    dti_ratio,
    cash_flow_ratio,
    emergency_months,
    budget_adherence,
    net_worth_growing,
    debt_shrinking,
    advice,
    financial_freedom_number,
    freedom_progress,
  };
}
