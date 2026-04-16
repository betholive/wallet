# NinsiimaWallet — Personal Wealth Tracker

A comprehensive personal finance app with budgets, debt payoff strategies, savings goals, and financial health insights.

## Features

- **Dashboard** — Net worth tracking, Financial Health Score (0-100), 50/30/20 budget gauge, actionable advice
- **Transactions** — Income and expense tracking with categories and recurring support
- **Budgets** — Per-category monthly budgets with 50/30/20 overlay and adherence tracking
- **Debts** — Debt snowball vs avalanche payoff engine with DTI monitoring
- **Savings** — Fixed goals, emergency fund, shared investments with daily accrual
- **Assets** — Property, vehicle, investment tracking

## Tech Stack

- Next.js 14.2 + React 18 + TypeScript
- Neon Postgres via `@neondatabase/serverless`
- next-auth v4 (credentials provider)
- Tailwind CSS 3.4 + custom teal palette
- Recharts for charts
- Lucide React for icons

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env.local`:**
   ```
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=your-secret-here
   NEXTAUTH_URL=http://localhost:3000
   ```

3. **Set up database:**
   Run `db/schema.sql` in your Neon SQL Editor

4. **Run dev server:**
   ```bash
   npm run dev
   ```

5. **Login with:**
   - Email: `ninsiima@wallet.com`
   - Password: `Vision2040`

## Deploy to Vercel

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## License

Private — for personal use only.
