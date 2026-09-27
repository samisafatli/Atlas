export const accountSeed = {
  name: "Conta principal",
  type: "CHECKING",
  currency: "BRL",
};

export const categorySeeds = [
  ...[
    "Alimentação",
    "Mercado",
    "Transporte",
    "Moradia",
    "Saúde",
    "Lazer",
    "Compras",
    "Assinaturas",
    "Viagem",
    "Educação",
    "Investimentos",
    "Transferências",
    "Outros",
  ].map((name) => ({ name, type: "EXPENSE" })),
  { name: "Receita", type: "INCOME" },
  { name: "Salário", type: "INCOME" },
];
