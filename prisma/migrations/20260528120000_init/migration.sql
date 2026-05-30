CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "Member" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CategoryRatio" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "basisPoints" INTEGER NOT NULL,
  CONSTRAINT "CategoryRatio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "amountYen" INTEGER NOT NULL,
  "payerMemberId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "recurringRuleId" TEXT,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExpenseSplit" (
  "id" TEXT NOT NULL,
  "expenseId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "basisPoints" INTEGER NOT NULL,
  CONSTRAINT "ExpenseSplit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Transfer" (
  "id" TEXT NOT NULL,
  "fromMemberId" TEXT NOT NULL,
  "toMemberId" TEXT NOT NULL,
  "amountYen" INTEGER NOT NULL,
  "transferredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringExpenseRule" (
  "id" TEXT NOT NULL,
  "frequency" "RecurrenceFrequency" NOT NULL,
  "dayOfMonth" INTEGER,
  "dayOfWeek" INTEGER,
  "description" TEXT NOT NULL,
  "amountYen" INTEGER NOT NULL,
  "payerMemberId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastGeneratedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringExpenseRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringExpenseSplit" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "basisPoints" INTEGER NOT NULL,
  CONSTRAINT "RecurringExpenseSplit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecurringExpenseGeneration" (
  "id" TEXT NOT NULL,
  "ruleId" TEXT NOT NULL,
  "targetDate" TIMESTAMP(3) NOT NULL,
  "expenseId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringExpenseGeneration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "CategoryRatio_categoryId_memberId_key" ON "CategoryRatio"("categoryId", "memberId");
CREATE UNIQUE INDEX "ExpenseSplit_expenseId_memberId_key" ON "ExpenseSplit"("expenseId", "memberId");
CREATE UNIQUE INDEX "RecurringExpenseSplit_ruleId_memberId_key" ON "RecurringExpenseSplit"("ruleId", "memberId");
CREATE UNIQUE INDEX "RecurringExpenseGeneration_ruleId_targetDate_key" ON "RecurringExpenseGeneration"("ruleId", "targetDate");

ALTER TABLE "CategoryRatio" ADD CONSTRAINT "CategoryRatio_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CategoryRatio" ADD CONSTRAINT "CategoryRatio_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseSplit" ADD CONSTRAINT "ExpenseSplit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromMemberId_fkey" FOREIGN KEY ("fromMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toMemberId_fkey" FOREIGN KEY ("toMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseRule" ADD CONSTRAINT "RecurringExpenseRule_payerMemberId_fkey" FOREIGN KEY ("payerMemberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseRule" ADD CONSTRAINT "RecurringExpenseRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseSplit" ADD CONSTRAINT "RecurringExpenseSplit_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringExpenseRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseSplit" ADD CONSTRAINT "RecurringExpenseSplit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringExpenseGeneration" ADD CONSTRAINT "RecurringExpenseGeneration_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringExpenseRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
