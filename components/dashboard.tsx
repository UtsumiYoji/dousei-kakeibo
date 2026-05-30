"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckSquare,
  Edit3,
  Play,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus
} from "lucide-react";
import { BASIS_POINTS_TOTAL, basisPointsToPercent, formatYen, percentToBasisPoints, splitAmount } from "@/lib/money";

type Member = {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
};

type Ratio = {
  memberId: string;
  basisPoints: number;
};

type Category = {
  id: string;
  name: string;
  displayOrder: number;
  ratios: Array<Ratio & { member?: Member }>;
};

type Expense = {
  id: string;
  occurredAt: string;
  description: string;
  amountYen: number;
  settledAt: string | null;
  payerMemberId: string;
  categoryId: string;
  payer: Member;
  category: Category;
  splits: Array<Ratio & { member: Member }>;
};

type Transfer = {
  id: string;
  amountYen: number;
  transferredAt: string;
  fromMemberId: string;
  toMemberId: string;
  fromMember: Member;
  toMember: Member;
};

type Settlement = {
  balances: Array<{
    memberId: string;
    name: string;
    paidYen: number;
    owedYen: number;
    transferOutYen: number;
    transferInYen: number;
    balanceYen: number;
  }>;
  suggestedTransfers: Array<{
    fromMemberId: string;
    fromName: string;
    toMemberId: string;
    toName: string;
    amountYen: number;
  }>;
};

type RecurringRule = {
  id: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  description: string;
  amountYen: number;
  payerMemberId: string;
  categoryId: string;
  isActive: boolean;
  lastGeneratedAt: string | null;
  payer: Member;
  category: Category;
  splits: Array<Ratio & { member: Member }>;
};

const days = ["日", "月", "火", "水", "木", "金", "土"];

export function Dashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [settlement, setSettlement] = useState<Settlement>({ balances: [], suggestedTransfers: [] });
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [expenseFilter, setExpenseFilter] = useState<"unsettled" | "settled" | "all">("unsettled");
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [status, setStatus] = useState("読み込み中です");
  const [error, setError] = useState("");

  const activeMembers = useMemo(() => members.filter((member) => member.isActive), [members]);
  const defaultRatios = useMemo(() => createEqualRatios(activeMembers), [activeMembers]);

  const [memberName, setMemberName] = useState("");
  const [categoryEditingId, setCategoryEditingId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryRatios, setCategoryRatios] = useState<Ratio[]>([]);

  const [expenseEditingId, setExpenseEditingId] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [expensePayerId, setExpensePayerId] = useState("");
  const [expenseRatios, setExpenseRatios] = useState<Ratio[]>([]);

  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  const [ruleEditingId, setRuleEditingId] = useState("");
  const [ruleFrequency, setRuleFrequency] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("MONTHLY");
  const [ruleDayOfMonth, setRuleDayOfMonth] = useState("1");
  const [ruleDayOfWeek, setRuleDayOfWeek] = useState("1");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleAmount, setRuleAmount] = useState("");
  const [ruleCategoryId, setRuleCategoryId] = useState("");
  const [rulePayerId, setRulePayerId] = useState("");
  const [ruleRatios, setRuleRatios] = useState<Ratio[]>([]);

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    refreshExpenses();
  }, [expenseFilter]);

  useEffect(() => {
    if (!expenseCategoryId && categories[0]) setExpenseCategoryId(categories[0].id);
    if (!ruleCategoryId && categories[0]) setRuleCategoryId(categories[0].id);
  }, [categories, expenseCategoryId, ruleCategoryId]);

  useEffect(() => {
    if (!expensePayerId && activeMembers[0]) setExpensePayerId(activeMembers[0].id);
    if (!rulePayerId && activeMembers[0]) setRulePayerId(activeMembers[0].id);
    if (!transferFromId && activeMembers[0]) setTransferFromId(activeMembers[0].id);
    if (!transferToId && activeMembers[1]) setTransferToId(activeMembers[1].id);
  }, [activeMembers, expensePayerId, rulePayerId, transferFromId, transferToId]);

  useEffect(() => {
    const suggestion = settlement.suggestedTransfers[0] ?? defaultTransferFromBalances(settlement);
    if (!suggestion) return;
    setTransferFromId(suggestion.fromMemberId);
    setTransferToId(suggestion.toMemberId);
  }, [settlement]);

  useEffect(() => {
    if (categoryRatios.length === 0 && defaultRatios.length > 0) setCategoryRatios(defaultRatios);
    if (expenseRatios.length === 0 && defaultRatios.length > 0) setExpenseRatios(defaultRatios);
    if (ruleRatios.length === 0 && defaultRatios.length > 0) setRuleRatios(defaultRatios);
  }, [categoryRatios.length, defaultRatios, expenseRatios.length, ruleRatios.length]);

  async function refreshAll() {
    await withStatus("最新データを読み込みました", async () => {
      const [memberData, categoryData, expenseData, transferData, settlementData, ruleData] = await Promise.all([
        api<Member[]>("/api/members"),
        api<Category[]>("/api/categories"),
        api<Expense[]>(`/api/expenses?settled=${expenseFilter}`),
        api<Transfer[]>("/api/transfers"),
        api<Settlement>("/api/settlements"),
        api<RecurringRule[]>("/api/recurring")
      ]);
      setMembers(memberData);
      setCategories(categoryData);
      setExpenses(expenseData);
      setTransfers(transferData);
      setSettlement(settlementData);
      setRecurringRules(ruleData);
    });
  }

  async function refreshExpenses() {
    const data = await api<Expense[]>(`/api/expenses?settled=${expenseFilter}`);
    setExpenses(data);
    setSelectedExpenses([]);
  }

  async function refreshDerived() {
    const [expenseData, settlementData, transferData, ruleData] = await Promise.all([
      api<Expense[]>(`/api/expenses?settled=${expenseFilter}`),
      api<Settlement>("/api/settlements"),
      api<Transfer[]>("/api/transfers"),
      api<RecurringRule[]>("/api/recurring")
    ]);
    setExpenses(expenseData);
    setSettlement(settlementData);
    setTransfers(transferData);
    setRecurringRules(ruleData);
  }

  async function withStatus(successMessage: string, action: () => Promise<void>) {
    setError("");
    setStatus("処理中です");
    try {
      await action();
      setStatus(successMessage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "処理に失敗しました");
      setStatus("");
    }
  }

  async function submitMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withStatus("メンバーを保存しました", async () => {
      await api("/api/members", { method: "POST", body: { name: memberName } });
      setMemberName("");
      await refreshAll();
    });
  }

  async function submitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { name: categoryName, ratios: categoryRatios };
    await withStatus("カテゴリを保存しました", async () => {
      if (categoryEditingId) {
        await api(`/api/categories/${categoryEditingId}`, { method: "PATCH", body: payload });
      } else {
        await api("/api/categories", { method: "POST", body: payload });
      }
      setCategoryEditingId("");
      setCategoryName("");
      setCategoryRatios(defaultRatios);
      await refreshAll();
    });
  }

  async function moveCategory(categoryId: string, direction: -1 | 1) {
    const currentIndex = categories.findIndex((category) => category.id === categoryId);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= categories.length) return;

    const nextCategories = [...categories];
    [nextCategories[currentIndex], nextCategories[nextIndex]] = [nextCategories[nextIndex], nextCategories[currentIndex]];

    await withStatus("カテゴリの並び順を更新しました", async () => {
      const updated = await api<Category[]>("/api/categories/reorder", {
        method: "POST",
        body: { orderedIds: nextCategories.map((category) => category.id) }
      });
      setCategories(updated);
      if (updated[0]) {
        setExpenseCategoryId((current) => current || updated[0].id);
        setRuleCategoryId((current) => current || updated[0].id);
      }
    });
  }

  async function submitExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      description: expenseDescription,
      amountYen: Number(expenseAmount),
      payerMemberId: expensePayerId,
      categoryId: expenseCategoryId,
      ratios: expenseRatios
    };
    await withStatus("支出を保存しました", async () => {
      if (expenseEditingId) {
        await api(`/api/expenses/${expenseEditingId}`, { method: "PATCH", body: payload });
      } else {
        await api("/api/expenses", { method: "POST", body: payload });
      }
      resetExpenseForm();
      await refreshDerived();
    });
  }

  async function submitTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await withStatus("お金受け渡しを登録しました", async () => {
      await api("/api/transfers", {
        method: "POST",
        body: { fromMemberId: transferFromId, toMemberId: transferToId, amountYen: Number(transferAmount) }
      });
      setTransferAmount("");
      await refreshDerived();
    });
  }

  async function submitRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      frequency: ruleFrequency,
      dayOfMonth: ruleFrequency === "MONTHLY" ? Number(ruleDayOfMonth) : null,
      dayOfWeek: ruleFrequency === "WEEKLY" ? Number(ruleDayOfWeek) : null,
      description: ruleDescription,
      amountYen: Number(ruleAmount),
      payerMemberId: rulePayerId,
      categoryId: ruleCategoryId,
      ratios: ruleRatios
    };
    await withStatus("自動支出ルールを保存しました", async () => {
      if (ruleEditingId) {
        await api(`/api/recurring/${ruleEditingId}`, { method: "PATCH", body: payload });
      } else {
        await api("/api/recurring", { method: "POST", body: payload });
      }
      resetRuleForm();
      await refreshDerived();
    });
  }

  function selectCategory(id: string, target: "expense" | "rule") {
    const category = categories.find((item) => item.id === id);
    const ratios = category?.ratios.map((ratio) => ({ memberId: ratio.memberId, basisPoints: ratio.basisPoints })) ?? defaultRatios;
    if (target === "expense") {
      setExpenseCategoryId(id);
      setExpenseRatios(ratios);
    } else {
      setRuleCategoryId(id);
      setRuleRatios(ratios);
    }
  }

  function editExpense(expense: Expense) {
    setExpenseEditingId(expense.id);
    setExpenseDescription(expense.description);
    setExpenseAmount(String(expense.amountYen));
    setExpenseCategoryId(expense.categoryId);
    setExpensePayerId(expense.payerMemberId);
    setExpenseRatios(expense.splits.map((split) => ({ memberId: split.memberId, basisPoints: split.basisPoints })));
  }

  function resetExpenseForm() {
    setExpenseEditingId("");
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseRatios(categoryRatiosFor(expenseCategoryId) ?? defaultRatios);
  }

  function editCategory(category: Category) {
    setCategoryEditingId(category.id);
    setCategoryName(category.name);
    setCategoryRatios(category.ratios.map((ratio) => ({ memberId: ratio.memberId, basisPoints: ratio.basisPoints })));
  }

  function editRule(rule: RecurringRule) {
    setRuleEditingId(rule.id);
    setRuleFrequency(rule.frequency);
    setRuleDayOfMonth(String(rule.dayOfMonth ?? 1));
    setRuleDayOfWeek(String(rule.dayOfWeek ?? 1));
    setRuleDescription(rule.description);
    setRuleAmount(String(rule.amountYen));
    setRuleCategoryId(rule.categoryId);
    setRulePayerId(rule.payerMemberId);
    setRuleRatios(rule.splits.map((split) => ({ memberId: split.memberId, basisPoints: split.basisPoints })));
  }

  function resetRuleForm() {
    setRuleEditingId("");
    setRuleDescription("");
    setRuleAmount("");
    setRuleRatios(categoryRatiosFor(ruleCategoryId) ?? defaultRatios);
  }

  function categoryRatiosFor(categoryId: string) {
    const category = categories.find((item) => item.id === categoryId);
    return category?.ratios.map((ratio) => ({ memberId: ratio.memberId, basisPoints: ratio.basisPoints }));
  }

  const totalUnsettledYen = expenses.filter((expense) => !expense.settledAt).reduce((sum, expense) => sum + expense.amountYen, 0);
  const totalSettledYen = settlement.balances.reduce((sum, balance) => sum + balance.owedYen, 0);
  const canSelectExpenses = expenseFilter === "unsettled";
  const expenseAmountYen = Number(expenseAmount);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/kakeibo-mark.svg" alt="" />
          <div>
            <h1>同棲家計簿</h1>
            <span>支払い、割り勘、清算を一か所で管理</span>
          </div>
        </div>
        <div className="toolbar">
          <button className="icon-button" type="button" onClick={refreshAll} title="更新" aria-label="更新">
            <RefreshCw size={18} />
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => withStatus("自動支出を実行しました", async () => refreshAfter(await api("/api/recurring/run", { method: "POST", body: {} })))}
          >
            <Play size={16} />
            自動支出実行
          </button>
        </div>
      </header>

      <div className="content">
        <div className="summary-grid">
          <Metric label="未計上支出" value={formatYen(totalUnsettledYen)} />
          <Metric label="清算対象合計" value={formatYen(totalSettledYen)} />
          {settlement.balances.map((balance) => (
            <BalanceMetric key={balance.memberId} name={balance.name} balanceYen={balance.balanceYen} />
          ))}
        </div>

        <div className={`status ${error ? "error" : ""}`}>{error || status}</div>

        <section className="section">
          <div className="section-header">
            <div>
              <h2>支出管理</h2>
              <p>未計上支出を登録し、必要なものを清算管理へ送ります。</p>
            </div>
          </div>

          <form className="panel" onSubmit={submitExpense}>
            <div className="form-grid">
              <label className="wide">
                支出内容
                <input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} placeholder="カフェ代、スーパー" />
              </label>
              <label>
                金額
                <input inputMode="numeric" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} placeholder="10000" />
              </label>
              <label>
                支払者
                <select value={expensePayerId} onChange={(event) => setExpensePayerId(event.target.value)}>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </label>
              <label>
                カテゴリ
                <select value={expenseCategoryId} onChange={(event) => selectCategory(event.target.value, "expense")}>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <RatioEditor
              members={activeMembers}
              ratios={expenseRatios}
              amountYen={Number.isFinite(expenseAmountYen) ? expenseAmountYen : undefined}
              onChange={setExpenseRatios}
            />
            <div className="inline-row" style={{ marginTop: 12 }}>
              <button className="primary-button" type="submit" disabled={activeMembers.length === 0 || categories.length === 0}>
                <Save size={16} />
                {expenseEditingId ? "支出を更新" : "支出を追加"}
              </button>
              {expenseEditingId && <button type="button" onClick={resetExpenseForm}>キャンセル</button>}
            </div>
          </form>

          <div className="table-toolbar">
            <div className="inline-row">
              <button
                className="primary-button"
                type="button"
                disabled={!canSelectExpenses || selectedExpenses.length === 0}
                onClick={() =>
                  withStatus("選択した支出を清算計上しました", async () => {
                    await api("/api/expenses/settle", { method: "POST", body: { ids: selectedExpenses } });
                    await refreshDerived();
                    setSelectedExpenses([]);
                  })
                }
              >
                <CheckSquare size={16} />
                清算計上する
              </button>
              <span className="badge">{canSelectExpenses ? `${selectedExpenses.length}件選択中` : "未計上のみ選択可"}</span>
            </div>
            <div className="tabs" aria-label="支出テーブルの表示切り替え">
              {(["unsettled", "settled", "all"] as const).map((filter) => (
                <button key={filter} className={expenseFilter === filter ? "active" : ""} type="button" onClick={() => setExpenseFilter(filter)}>
                  {filter === "unsettled" ? "未計上" : filter === "settled" ? "計上済み" : "すべて"}
                </button>
              ))}
            </div>
          </div>
          <ExpenseTable
            expenses={expenses}
            selected={selectedExpenses}
            selectable={canSelectExpenses}
            onSelected={setSelectedExpenses}
            onEdit={editExpense}
            onDelete={(id) =>
              withStatus("支出を削除しました", async () => {
                await api(`/api/expenses/${id}`, { method: "DELETE" });
                await refreshDerived();
              })
            }
          />
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <h2>清算管理</h2>
              <p>清算計上済みの支出とお金受け渡し履歴から過不足を計算します。</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>メンバー</th><th>支払済み</th><th>負担額</th><th>渡した</th><th>受け取った</th><th>過不足</th></tr>
              </thead>
              <tbody>
                {settlement.balances.map((balance) => (
                  <tr key={balance.memberId}>
                    <td>{balance.name}</td>
                    <td>{formatYen(balance.paidYen)}</td>
                    <td>{formatYen(balance.owedYen)}</td>
                    <td>{formatYen(balance.transferOutYen)}</td>
                    <td>{formatYen(balance.transferInYen)}</td>
                    <td className={balance.balanceYen >= 0 ? "positive" : "negative"}>{formatYen(balance.balanceYen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <form className="panel" onSubmit={submitTransfer}>
            <div className="form-grid three">
              <label>
                受け渡し者
                <select value={transferFromId} onChange={(event) => setTransferFromId(event.target.value)}>
                  {activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
              <label>
                受け取り者
                <select value={transferToId} onChange={(event) => setTransferToId(event.target.value)}>
                  {activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
              <label>
                金額
                <input inputMode="numeric" value={transferAmount} onChange={(event) => setTransferAmount(event.target.value)} placeholder="5000" />
              </label>
            </div>
            <button className="primary-button" type="submit" style={{ marginTop: 12 }} disabled={activeMembers.length < 2}>
              <Plus size={16} />
              お金受け渡し登録
            </button>
          </form>
          <TransferTable transfers={transfers} />
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <h2>メンバー・カテゴリ</h2>
              <p>カテゴリの割り勘率は合計100%になるように保存します。</p>
            </div>
          </div>
          <div className="panel">
            <form className="form-grid two" onSubmit={submitMember}>
              <label>
                メンバー名
                <input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="名前" />
              </label>
              <button className="primary-button" type="submit">
                <UserPlus size={16} />
                メンバー追加
              </button>
            </form>
            <MemberTable
              members={members}
              onRename={(member) => {
                const name = window.prompt("新しい名前", member.name);
                if (name == null) return;
                withStatus("メンバー名を更新しました", async () => {
                  await api(`/api/members/${member.id}`, { method: "PATCH", body: { name } });
                  await refreshAll();
                });
              }}
              onDeactivate={(member) =>
                withStatus("メンバーを無効化しました", async () => {
                  await api(`/api/members/${member.id}`, { method: "DELETE" });
                  await refreshAll();
                })
              }
            />
          </div>
          <form className="panel" onSubmit={submitCategory}>
            <div className="form-grid two">
              <label>
                カテゴリ名
                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="家賃" />
              </label>
              <button className="primary-button" type="submit" disabled={activeMembers.length === 0}>
                <Save size={16} />
                {categoryEditingId ? "カテゴリ更新" : "カテゴリ追加"}
              </button>
            </div>
            <RatioEditor members={activeMembers} ratios={categoryRatios} onChange={setCategoryRatios} />
          </form>
          <CategoryTable categories={categories} onEdit={editCategory} onMove={moveCategory} />
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <h2>自動支出</h2>
              <p>家賃など定期的な支払いをアプリ内workerで自動生成します。</p>
            </div>
          </div>
          <form className="panel" onSubmit={submitRule}>
            <div className="form-grid">
              <label className="wide">
                支出内容
                <input value={ruleDescription} onChange={(event) => setRuleDescription(event.target.value)} placeholder="家賃" />
              </label>
              <label>
                金額
                <input inputMode="numeric" value={ruleAmount} onChange={(event) => setRuleAmount(event.target.value)} placeholder="120000" />
              </label>
              <label>
                周期
                <select value={ruleFrequency} onChange={(event) => setRuleFrequency(event.target.value as "DAILY" | "WEEKLY" | "MONTHLY")}>
                  <option value="DAILY">毎日</option>
                  <option value="WEEKLY">毎週</option>
                  <option value="MONTHLY">毎月</option>
                </select>
              </label>
              {ruleFrequency === "MONTHLY" && (
                <label>
                  日にち
                  <input inputMode="numeric" value={ruleDayOfMonth} onChange={(event) => setRuleDayOfMonth(event.target.value)} />
                </label>
              )}
              {ruleFrequency === "WEEKLY" && (
                <label>
                  曜日
                  <select value={ruleDayOfWeek} onChange={(event) => setRuleDayOfWeek(event.target.value)}>
                    {days.map((day, index) => <option key={day} value={index}>{day}</option>)}
                  </select>
                </label>
              )}
              <label>
                支払者
                <select value={rulePayerId} onChange={(event) => setRulePayerId(event.target.value)}>
                  {activeMembers.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
              <label>
                カテゴリ
                <select value={ruleCategoryId} onChange={(event) => selectCategory(event.target.value, "rule")}>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            </div>
            <RatioEditor members={activeMembers} ratios={ruleRatios} onChange={setRuleRatios} />
            <div className="inline-row" style={{ marginTop: 12 }}>
              <button className="primary-button" type="submit" disabled={activeMembers.length === 0 || categories.length === 0}>
                <CalendarClock size={16} />
                {ruleEditingId ? "ルール更新" : "ルール追加"}
              </button>
              {ruleEditingId && <button type="button" onClick={resetRuleForm}>キャンセル</button>}
            </div>
          </form>
          <RecurringTable
            rules={recurringRules}
            onEdit={editRule}
            onToggle={(rule) =>
              withStatus("自動支出ルールを更新しました", async () => {
                await api(`/api/recurring/${rule.id}`, { method: "PATCH", body: { isActive: !rule.isActive } });
                await refreshDerived();
              })
            }
          />
        </section>
      </div>
    </main>
  );

  async function refreshAfter(_result: unknown) {
    await refreshDerived();
  }
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BalanceMetric({ name, balanceYen }: { name: string; balanceYen: number }) {
  const className = balanceYen > 0 ? "positive" : balanceYen < 0 ? "negative" : "";

  return (
    <div className="metric">
      <span>{name}</span>
      <strong className={className}>{formatYen(balanceYen)}</strong>
    </div>
  );
}

function RatioEditor({
  members,
  ratios,
  amountYen,
  onChange
}: {
  members: Member[];
  ratios: Ratio[];
  amountYen?: number;
  onChange: (ratios: Ratio[]) => void;
}) {
  const total = ratios.reduce((sum, ratio) => sum + ratio.basisPoints, 0);
  const shares = useMemo(() => {
    if (!amountYen || amountYen <= 0 || total !== BASIS_POINTS_TOTAL) return new Map<string, number>();
    return new Map(splitAmount(amountYen, ratios).map((share) => [share.memberId, share.amountYen]));
  }, [amountYen, ratios, total]);

  return (
    <>
      <div className="ratio-list">
        {members.map((member, index) => {
          const nextMember = members[index + 1];
          const ratio = ratios.find((item) => item.memberId === member.id) ?? { memberId: member.id, basisPoints: 0 };
          const nextRatio = nextMember ? ratios.find((item) => item.memberId === nextMember.id) ?? { memberId: nextMember.id, basisPoints: 0 } : null;
          return (
            <Fragment key={member.id}>
              <label className="ratio-input">
                <span>{member.name}</span>
                <input
                  inputMode="decimal"
                  value={String(basisPointsToPercent(ratio.basisPoints))}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    onChange(upsertRatio(ratios, member.id, Number.isFinite(next) ? percentToBasisPoints(next) : 0));
                  }}
                />
                {amountYen !== undefined && (
                  <small>{shares.has(member.id) ? formatYen(shares.get(member.id) ?? 0) : "-"}</small>
                )}
              </label>
              {nextMember && nextRatio && (
                <div className="ratio-shift">
                  <button
                    type="button"
                    disabled={nextRatio.basisPoints < 1000}
                    onClick={() => onChange(shiftRatio(ratios, nextMember.id, member.id, 1000))}
                    title={`${nextMember.name}から${member.name}へ10%移す`}
                    aria-label={`${nextMember.name}から${member.name}へ10%移す`}
                  >
                    <ArrowUp size={14} />
                    10%
                  </button>
                  <button
                    type="button"
                    disabled={ratio.basisPoints < 1000}
                    onClick={() => onChange(shiftRatio(ratios, member.id, nextMember.id, 1000))}
                    title={`${member.name}から${nextMember.name}へ10%移す`}
                    aria-label={`${member.name}から${nextMember.name}へ10%移す`}
                  >
                    <ArrowDown size={14} />
                    10%
                  </button>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      <div className={`status ${total !== BASIS_POINTS_TOTAL ? "error" : ""}`}>割り勘率合計: {basisPointsToPercent(total)}%</div>
    </>
  );
}

function ExpenseTable({
  expenses,
  selected,
  selectable,
  onSelected,
  onEdit,
  onDelete
}: {
  expenses: Expense[];
  selected: string[];
  selectable: boolean;
  onSelected: (ids: string[]) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}) {
  if (expenses.length === 0) return <div className="empty">支出はまだありません。</div>;
  const allChecked = selectable && expenses.length > 0 && expenses.every((expense) => selected.includes(expense.id));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={allChecked}
                disabled={!selectable}
                onChange={(event) => onSelected(event.target.checked ? expenses.map((expense) => expense.id) : [])}
              />
            </th>
            <th>日付</th><th>内容</th><th>カテゴリ</th><th>金額</th><th>支払者</th><th>割り勘</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selected.includes(expense.id)}
                  disabled={!selectable}
                  onChange={(event) => onSelected(event.target.checked ? [...selected, expense.id] : selected.filter((id) => id !== expense.id))}
                />
              </td>
              <td>{new Date(expense.occurredAt).toLocaleDateString("ja-JP")}</td>
              <td>{expense.description}</td>
              <td>{expense.category.name}</td>
              <td>{formatYen(expense.amountYen)}</td>
              <td>{expense.payer.name}</td>
              <td>{shareText(expense.amountYen, expense.splits)}</td>
              <td>
                <div className="inline-row">
                  <button className="icon-button" type="button" onClick={() => onEdit(expense)} title="編集" aria-label="編集"><Edit3 size={16} /></button>
                  <button className="icon-button" type="button" onClick={() => onDelete(expense.id)} title="削除" aria-label="削除"><Trash2 size={16} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoryTable({
  categories,
  onEdit,
  onMove
}: {
  categories: Category[];
  onEdit: (category: Category) => void;
  onMove: (categoryId: string, direction: -1 | 1) => void;
}) {
  if (categories.length === 0) return <div className="empty">カテゴリはまだありません。seedを実行するか、ここから追加してください。</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>順序</th><th>カテゴリ</th><th>デフォルト割り勘率</th><th>操作</th></tr></thead>
        <tbody>
          {categories.map((category, index) => (
            <tr key={category.id}>
              <td>
                <div className="inline-row">
                  <button className="icon-button" type="button" disabled={index === 0} onClick={() => onMove(category.id, -1)} title="上へ" aria-label="上へ">
                    <ArrowUp size={16} />
                  </button>
                  <button className="icon-button" type="button" disabled={index === categories.length - 1} onClick={() => onMove(category.id, 1)} title="下へ" aria-label="下へ">
                    <ArrowDown size={16} />
                  </button>
                </div>
              </td>
              <td>{category.name}</td>
              <td>{category.ratios.map((ratio) => `${ratio.member?.name ?? ratio.memberId}: ${basisPointsToPercent(ratio.basisPoints)}%`).join(" / ")}</td>
              <td><button className="icon-button" type="button" onClick={() => onEdit(category)} title="編集" aria-label="編集"><Edit3 size={16} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MemberTable({
  members,
  onRename,
  onDeactivate
}: {
  members: Member[];
  onRename: (member: Member) => void;
  onDeactivate: (member: Member) => void;
}) {
  if (members.length === 0) return <div className="empty">メンバーはまだありません。</div>;
  return (
    <div className="table-wrap" style={{ marginTop: 12 }}>
      <table>
        <thead><tr><th>名前</th><th>状態</th><th>操作</th></tr></thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>{member.name}</td>
              <td><span className="badge">{member.isActive ? "有効" : "無効"}</span></td>
              <td>
                <div className="inline-row">
                  <button className="icon-button" type="button" onClick={() => onRename(member)} title="編集" aria-label="編集"><Edit3 size={16} /></button>
                  <button className="danger-button" type="button" disabled={!member.isActive} onClick={() => onDeactivate(member)}>無効化</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransferTable({ transfers }: { transfers: Transfer[] }) {
  if (transfers.length === 0) return <div className="empty">お金受け渡し履歴はまだありません。</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>日付</th><th>受け渡し者</th><th>受け取り者</th><th>金額</th></tr></thead>
        <tbody>
          {transfers.map((transfer) => (
            <tr key={transfer.id}>
              <td>{new Date(transfer.transferredAt).toLocaleDateString("ja-JP")}</td>
              <td>{transfer.fromMember.name}</td>
              <td>{transfer.toMember.name}</td>
              <td>{formatYen(transfer.amountYen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecurringTable({
  rules,
  onEdit,
  onToggle
}: {
  rules: RecurringRule[];
  onEdit: (rule: RecurringRule) => void;
  onToggle: (rule: RecurringRule) => void;
}) {
  if (rules.length === 0) return <div className="empty">自動支出ルールはまだありません。</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>状態</th><th>周期</th><th>内容</th><th>金額</th><th>支払者</th><th>カテゴリ</th><th>最終生成</th><th>操作</th></tr></thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td><span className="badge">{rule.isActive ? "有効" : "停止"}</span></td>
              <td>{frequencyText(rule)}</td>
              <td>{rule.description}</td>
              <td>{formatYen(rule.amountYen)}</td>
              <td>{rule.payer.name}</td>
              <td>{rule.category.name}</td>
              <td>{rule.lastGeneratedAt ? new Date(rule.lastGeneratedAt).toLocaleString("ja-JP") : "-"}</td>
              <td>
                <div className="inline-row">
                  <button className="icon-button" type="button" onClick={() => onEdit(rule)} title="編集" aria-label="編集"><Edit3 size={16} /></button>
                  <button type="button" onClick={() => onToggle(rule)}>{rule.isActive ? "停止" : "有効化"}</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function frequencyText(rule: RecurringRule) {
  if (rule.frequency === "DAILY") return "毎日";
  if (rule.frequency === "WEEKLY") return `毎週${days[rule.dayOfWeek ?? 0]}曜`;
  return `毎月${rule.dayOfMonth}日`;
}

function shareText(amountYen: number, ratios: Ratio[]) {
  return splitAmount(amountYen, ratios)
    .map((share) => `${basisPointsToPercent(share.basisPoints)}% ${formatYen(share.amountYen)}`)
    .join(" / ");
}

function upsertRatio(ratios: Ratio[], memberId: string, basisPoints: number): Ratio[] {
  const next = ratios.filter((ratio) => ratio.memberId !== memberId);
  next.push({ memberId, basisPoints });
  return next;
}

function shiftRatio(ratios: Ratio[], fromMemberId: string, toMemberId: string, amountBasisPoints: number): Ratio[] {
  const from = ratios.find((ratio) => ratio.memberId === fromMemberId) ?? { memberId: fromMemberId, basisPoints: 0 };
  const to = ratios.find((ratio) => ratio.memberId === toMemberId) ?? { memberId: toMemberId, basisPoints: 0 };
  const amount = Math.min(amountBasisPoints, from.basisPoints);

  return ratios.map((ratio) => {
    if (ratio.memberId === fromMemberId) return { ...ratio, basisPoints: ratio.basisPoints - amount };
    if (ratio.memberId === toMemberId) return { ...ratio, basisPoints: ratio.basisPoints + amount };
    return ratio;
  }).concat(
    ratios.some((ratio) => ratio.memberId === fromMemberId) ? [] : [{ memberId: fromMemberId, basisPoints: from.basisPoints - amount }],
    ratios.some((ratio) => ratio.memberId === toMemberId) ? [] : [{ memberId: toMemberId, basisPoints: to.basisPoints + amount }]
  );
}

function createEqualRatios(members: Member[]): Ratio[] {
  if (members.length === 0) return [];
  const base = Math.floor(BASIS_POINTS_TOTAL / members.length);
  let remaining = BASIS_POINTS_TOTAL - base * members.length;
  return members.map((member) => {
    const extra = remaining > 0 ? 1 : 0;
    remaining -= extra;
    return { memberId: member.id, basisPoints: base + extra };
  });
}

function defaultTransferFromBalances(settlement: Settlement) {
  const debtor = [...settlement.balances]
    .filter((balance) => balance.balanceYen < 0)
    .sort((a, b) => a.balanceYen - b.balanceYen)[0];
  const creditor = [...settlement.balances]
    .filter((balance) => balance.balanceYen > 0)
    .sort((a, b) => b.balanceYen - a.balanceYen)[0];

  if (!debtor || !creditor) return null;
  return {
    fromMemberId: debtor.memberId,
    toMemberId: creditor.memberId
  };
}

async function api<T = unknown>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(path, {
    method: options?.method ?? "GET",
    headers: options?.body == null ? undefined : { "Content-Type": "application/json" },
    body: options?.body == null ? undefined : JSON.stringify(options.body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? "APIリクエストに失敗しました");
  }
  return data as T;
}
