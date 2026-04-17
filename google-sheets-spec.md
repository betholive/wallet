# NinsiimaWallet → Google Sheets Spec

## Sheets (8 Total)

---

### 1. Dashboard
| Cell | Content | Formula |
|------|---------|---------|
| B4 | Net Worth | `=Assets!B2+Savings!B2+Debts!F2-Debts!B2` |
| B5 | What You Own | `=Assets!B2+Savings!B2+Debts!F2` |
| B6 | What You Owe | `=Debts!B2` |
| B8 | Health Score | `=Health!B2` |
| C8 | Grade | `=Health!C2` |
| B11 | Monthly Income | `=SUMIFS(Transactions!C:C,Transactions!B:B,"income",Transactions!E:E,">="&EOMONTH(TODAY(),-1)+1,Transactions!E:E,"<="&EOMONTH(TODAY(),0))` |
| B12 | Monthly Expenses | `=SUMIFS(Transactions!C:C,Transactions!B:B,"expense",Transactions!E:E,">="&EOMONTH(TODAY(),-1)+1,Transactions!E:E,"<="&EOMONTH(TODAY(),0))` |
| B13 | Surplus | `=B11-B12` |
| B16 | DTI % | `=IF(B11>0,(Debts!D2/B11)*100,0)` |
| B17 | Savings Rate % | `=Health!D2` |

**Formatting:**
- Net Worth: Green (>0) / Red (<0)
- Health Score: Color scale 0→100 (Red→Green)
- Surplus: Green bg (+) / Red bg (-)
- DTI: Red (>36%), Orange (20-36%), Green (<20%)

---

### 2. Transactions (Master Ledger)

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | ID | Auto | `=ROW()-1` |
| B | Type | Dropdown | `income,expense` |
| C | Amount | Number | >0, UGX format |
| D | Category | Dropdown | From Categories |
| E | Date | Date | Valid date |
| F | Description | Text | Optional |
| G | Is Recurring | Checkbox | TRUE/FALSE |
| H | Recurrence | Dropdown | `monthly,weekly,blank` |

**Formatting:**
- Type: Green bg (income), Red bg (expense)
- Amount: Green text (income), Red text (expense)

---

### 3. Categories (Reference)

| Category | Type | Bucket | Color |
|----------|------|--------|-------|
| Salary | income | - | #16a34a |
| Business Income | income | - | #059669 |
| Freelance | income | - | #0d9488 |
| Other Income | income | - | #6b7280 |
| Rent | expense | needs | #dc2626 |
| Utilities | expense | needs | #ea580c |
| Transport | expense | needs | #d97706 |
| Food | expense | needs | #ca8a04 |
| Healthcare | expense | needs | #e11d48 |
| Education | expense | needs | #7c3aed |
| Personal Expense | expense | wants | #8b5cf6 |
| Entertainment | expense | wants | #ec4899 |
| Clothing | expense | wants | #f472b6 |
| Subscriptions | expense | wants | #6366f1 |
| Business Expense | expense | wants | #0ea5e9 |
| Family Expense | expense | needs | #ef4444 |
| Other Expense | expense | wants | #9ca3af |

---

### 4. Budgets

| Column | Field | Formula |
|--------|-------|---------|
| A | Month | YYYY-MM |
| B | Category | From Categories |
| C | Bucket | `needs,wants` |
| D | Budgeted | Manual entry |
| E | Spent | `=SUMIFS(Transactions!C:C,Transactions!D:D,B2,Transactions!B:B,"expense",Transactions!E:E,">="&DATE(LEFT(A2,4),MID(A2,6,2),1),Transactions!E:E,"<="&EOMONTH(DATE(LEFT(A2,4),MID(A2,6,2),1),0))` |
| F | Remaining | `=D2-E2` |
| G | % Used | `=IF(D2>0,E2/D2*100,0)` |

**Summary (Side Panel):**
```
Monthly Income: =Dashboard!B11
Needs Budgeted: =SUMIFS(D:D,C:C,"needs")
Needs Spent: =SUMIFS(E:E,C:C,"needs")
Wants Budgeted: =SUMIFS(D:D,C:C,"wants")
Wants Spent: =SUMIFS(E:E,C:C,"wants")
```

**Formatting:**
- % Used: Green (<80%), Yellow (80-100%), Red (>100%)
- Progress: `=SPARKLINE(G2/100,{"charttype","bar";"max",1})`

---

### 5. Debts (Rows 2-50) + Receivables (Rows 52-100)

**Debts Columns:**
| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| Name | Creditor | Original | Balance | Rate% | MinPay | Start | Due | Status | TotalPaid | Progress% |

**Formulas:**
- Progress% (K): `=IF(C2>0,(J2/C2)*100,0)`
- Remaining Months (L): `=IF(AND(F2>0,D2>0),ROUNDUP(D2/F2,0),"N/A")`

**Summary:**
- Total Debt: `=SUM(D2:D50)`
- Total Min Payments: `=SUM(F2:F50)`
- Avg Rate: `=AVERAGE(E2:E50)`
- Paid Off Count: `=COUNTIF(I2:I50,"paid_off")`

**Receivables (Rows 52-100):**
- Total Receivables: `=SUM(D52:D100)`
- Net Position: `=Debts!B2-F2`

**Formatting:**
- Balance: Red bg (debts), Green bg (receivables)
- Status: Green text (paid_off)
- Progress: Color scale 0%→100% (Red→Green)

---

### 6. Savings

| Column | Field | Formula |
|--------|-------|---------|
| A | Name | Text |
| B | Type | `fixed,emergency,shared_investment` |
| C | Balance | Number |
| D | Target | Number |
| E | Goal% | `=IF(D2>0,C2/D2*100,0)` |
| F | Annual Rate% | Number |
| G | Goal Label | Text |
| H | Partners | Text |
| I | Monthly Deposit | Number |

**Summary:**
- Total Savings: `=SUM(C2:C50)`
- Emergency Fund: `=SUMIFS(C:C,B:B,"emergency")`
- Fixed Savings: `=SUMIFS(C:C,B:B,"fixed")`
- Shared: `=SUMIFS(C:C,B:B,"shared_investment")`

**Formatting:**
- Type: Teal (emergency), Blue (fixed), Purple (shared)
- Goal%: Green (≥100%), Yellow (50-99%), Red (<50%)

---

### 7. Assets

| A | B | C | D | E |
|---|---|---|---|---|
| Name | Category | Value | Purchase Date | Notes |

**Categories:** property, vehicle, investment, other

**Summary:**
- Total: `=SUM(C2:C100)`
- By Category: `=SUMIFS(C:C,B:B,"property")`

**Formatting:**
- Category colors: Blue (property), Orange (vehicle), Green (investment), Gray (other)
- Value: Gradient based on amount

---

### 8. Health (Calculations)

| Metric | Value | Formula |
|--------|-------|---------|
| Score | 0-100 | Weighted composite (see below) |
| Grade | Text | `=IF(B2>=80,"excellent",IF(B2>=60,"strong",IF(B2>=40,"progressing",IF(B2>=20,"struggling","critical"))))` |
| Savings Rate% | % | `=IF(MonthlyIncome>0,(Savings/MonthlyIncome)*100,0)` |
| DTI% | % | `=IF(Income>0,(DebtPayments/Income)*100,0)` |
| Emergency Months | # | `=EmergencyFund/MAX(MonthlyExpenses,1)` |
| Freedom Number | UGX | `=MonthlyExpenses*12*25` |
| Freedom Progress% | % | `=MIN((Savings+Assets)/FreedomNumber*100,100)` |

**Health Score Formula:**
```
Score = (SavingsRateScore*0.20) + 
        (DTIScore*0.25) + 
        (BudgetScore*0.15) + 
        (EmergencyScore*0.15) + 
        (NetWorthScore*0.15) + 
        (DebtScore*0.10)

Where:
- SavingsRateScore = MIN(SavingsRate/20, 1) * 100
- DTIScore = IF(DTI>50,0,IF(DTI>36,20,IF(DTI>20,60,100)))
- EmergencyScore = IF(EmergMonths>=6,100,IF(EmergMonths>=3,80,IF(EmergMonths>=1,40,EmergMonths*40)))
- NetWorthScore = IF(NW>PrevNW,100,IF(NW=PrevNW,50,0))
- DebtScore = IF(TotalDebt=0,100,IF(DebtShrinking,80,20))
```

**Grade Colors:**
- Excellent (80-100): Green #16a34a
- Strong (60-79): Teal #0d9488
- Progressing (40-59): Orange #d97706
- Struggling (20-39): Dark Orange #ea580c
- Critical (0-19): Red #dc2626

---

## Universal Formatting

### Currency:
```
#,##0" UGX"
```

### Date Helpers:
```excel
Current Month: =TEXT(TODAY(),"YYYY-MM")
First of Month: =EOMONTH(TODAY(),-1)+1
End of Month: =EOMONTH(TODAY(),0)
```

### Sparkline Progress Bar:
```excel
=SPARKLINE(percentage/100,{
  "charttype","bar";
  "max",1;
  "color1",IF(percentage>100,"red",IF(percentage>80,"orange","green"))
})
```

### Common Patterns:
```excel
// Monthly aggregation
=SUMIFS(amount,type,"expense",date,">="&start,date,"<="&end)

// Percentage of target
=IF(target>0,(actual/target)*100,0)

// Remaining months
=ROUNDUP(balance/min_payment,0)

// Net worth
=Assets+Savings+Receivables-Debts
```

---

## Color Reference

| Use | Hex |
|-----|-----|
| Primary/Wallet | #0d9488 |
| Income/Success | #16a34a |
| Expense/Danger | #dc2626 |
| Needs | #3b82f6 |
| Wants | #8b5cf6 |
| Warning | #f59e0b |

## Dropdown Lists

- Type: `income,expense`
- Bucket: `needs,wants,savings_debt`
- Savings Type: `fixed,emergency,shared_investment`
- Asset Category: `property,vehicle,investment,other`
- Status: `active,paid_off,overdue`
- Recurrence: `monthly,weekly`
