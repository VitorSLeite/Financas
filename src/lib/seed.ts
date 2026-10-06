import type { Category } from "./types";

/**
 * VT Flow inicia vazio. Este arquivo fornece APENAS nomes de categorias padrão —
 * sem nenhum valor financeiro, conta, cartão, transação, meta ou orçamento.
 */

const ROOT_COLORS: Record<string, string> = {
  "cat-casa": "#4DA3FF", "cat-alimentacao": "#00C9A7", "cat-transporte": "#8B7CFF",
  "cat-saude": "#FF5C6C", "cat-educacao": "#F5B94A", "cat-lazer": "#A99CFF",
  "cat-compras": "#7E8BA3", "cat-assinaturas": "#5E7BD6", "cat-viagem": "#2BD9BA",
  "cat-pessoal": "#E0788A", "cat-contas": "#4DA3FF", "cat-outros": "#5B6880",
  "cat-salario": "#00C9A7", "cat-freelance": "#2BD9BA", "cat-rendimentos": "#4DA3FF",
  "cat-reembolso": "#8B7CFF", "cat-outras-receitas": "#7E8BA3",
};

/** Aplica a paleta VT Flow a categorias padrão (subcategorias herdam a cor da raiz). */
export function recolor<T extends { id: string; color: string; parentId?: string }>(items: T[]): T[] {
  return items.map((c) => {
    const col = ROOT_COLORS[c.parentId ?? c.id] ?? ROOT_COLORS[c.id];
    return col ? { ...c, color: col } : c;
  });
}

export function seedCategories(): Category[] {
  const c = (
    id: string, name: string, kind: "income" | "expense", icon: string,
    group?: "essential" | "fixed" | "variable",
  ): Category => ({ id, name, kind, icon, group, color: ROOT_COLORS[id] ?? "#7E8BA3" });
  return [
    // despesas
    c("cat-casa", "Moradia", "expense", "home", "fixed"),
    c("cat-alimentacao", "Alimentação", "expense", "utensils", "essential"),
    c("cat-transporte", "Transporte", "expense", "car", "essential"),
    c("cat-saude", "Saúde", "expense", "heartPulse", "essential"),
    c("cat-educacao", "Educação", "expense", "graduation", "essential"),
    c("cat-lazer", "Lazer", "expense", "gamepad", "variable"),
    c("cat-compras", "Compras", "expense", "shoppingBag", "variable"),
    c("cat-assinaturas", "Assinaturas", "expense", "clapper", "fixed"),
    c("cat-viagem", "Viagem", "expense", "plane", "variable"),
    c("cat-pessoal", "Pessoal", "expense", "shirt", "variable"),
    c("cat-contas", "Contas", "expense", "receipt", "fixed"),
    c("cat-outros", "Outros", "expense", "tag", "variable"),
    // receitas
    c("cat-salario", "Salário", "income", "briefcase"),
    c("cat-freelance", "Freelance", "income", "banknote"),
    c("cat-rendimentos", "Rendimentos", "income", "trendingUp"),
    c("cat-reembolso", "Reembolsos", "income", "receipt"),
    c("cat-outras-receitas", "Outras receitas", "income", "circleDollar"),
  ];
}
