import type { AccountKind, CatGroup, PayMethod, TxType } from "./types";

export const METHOD_LABELS: Record<PayMethod, string> = {
  debit: "Débito",
  credit: "Crédito",
  pix: "PIX",
  cash: "Dinheiro",
  boleto: "Boleto",
  other: "Outro",
};

export const TYPE_LABELS: Record<TxType, string> = {
  expense: "Despesa",
  income: "Receita",
  transfer: "Transferência",
};

export const GROUP_LABELS: Record<CatGroup, string> = {
  essential: "Essencial",
  fixed: "Fixa",
  variable: "Variável",
};

export const KIND_LABELS: Record<AccountKind, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  wallet: "Carteira/Dinheiro",
  investment: "Investimentos",
};
