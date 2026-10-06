export type ID = string;

export type TxType = "income" | "expense" | "transfer";
export type PayMethod = "debit" | "credit" | "pix" | "cash" | "boleto" | "other";
export type CatGroup = "essential" | "fixed" | "variable";
export type AccountKind = "checking" | "savings" | "wallet" | "investment";

export interface Account {
  id: ID;
  name: string;
  kind: AccountKind;
  initialBalance: number; // ajuste inicial
  color: string;
  icon: string;
  archived?: boolean;
}

export interface Category {
  id: ID;
  name: string;
  kind: "income" | "expense";
  group?: CatGroup; // apenas despesas
  parentId?: ID;
  color: string;
  icon: string;
}

export interface Card {
  id: ID;
  name: string;
  limit: number;
  closingDay: number; // dia de fechamento
  dueDay: number; // dia de vencimento
  color: string;
  accountId?: ID; // conta padrão p/ pagamento
}

export interface Transaction {
  id: ID;
  type: TxType;
  amount: number;
  date: string; // ISO yyyy-mm-dd (local)
  description: string;
  accountId?: ID; // origem (despesa/receita/transferência)
  toAccountId?: ID; // destino (transferência)
  cardId?: ID; // compras no crédito
  categoryId?: ID;
  method?: PayMethod;
  installment?: { group: string; n: number; of: number };
  recurKey?: string; // `${ruleId}:${yyyy-mm}`
  createdAt: number;
}

export interface CardPayment {
  id: ID;
  cardId: ID;
  month: string; // fatura yyyy-mm
  amount: number;
  date: string;
  accountId: ID;
}

export interface Budget {
  id: ID;
  categoryId: ID; // categoria raiz de despesa
  amount: number;
}

export interface Goal {
  id: ID;
  name: string;
  target: number;
  color: string;
  icon: string;
  deadline?: string;
  createdAt: number;
}

export interface GoalContrib {
  id: ID;
  goalId: ID;
  amount: number; // + depósito / - resgate
  date: string;
}

export interface Recurring {
  id: ID;
  type: "income" | "expense";
  amount: number;
  day: number;
  description: string;
  accountId?: ID;
  cardId?: ID;
  categoryId?: ID;
  method?: PayMethod;
  start: string; // yyyy-mm
  endDate?: string;
  active: boolean;
}

export interface AppData {
  accounts: Account[];
  categories: Category[];
  cards: Card[];
  txs: Transaction[];
  payments: CardPayment[];
  budgets: Budget[];
  goals: Goal[];
  contribs: GoalContrib[];
  recurring: Recurring[];
}

export type PageKey =
  | "dashboard"
  | "transactions"
  | "cards"
  | "accounts"
  | "planning"
  | "reports"
  | "calendar"
  | "more";
