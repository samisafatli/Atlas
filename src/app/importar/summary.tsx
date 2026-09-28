import type { ImportedTransaction } from "@/lib/nubank-csv";
import { formatCents } from "@/lib/finance-format";

export function ImportSummary({
  transactions,
}: {
  transactions: ImportedTransaction[];
}) {
  const sum = (type: string) =>
    transactions
      .filter((row) => row.type === type)
      .reduce((total, row) => total + BigInt(row.amountCents), 0n);
  return (
    <div className="mt-3 grid gap-2 text-sm">
      <p>
        Receitas: {formatCents(sum("INCOME"))} · Cobranças/despesas:{" "}
        {formatCents(sum("EXPENSE"))}
      </p>
      <p>
        Créditos/estornos: {formatCents(sum("REFUND"))} · Despesas líquidas:{" "}
        {formatCents(sum("EXPENSE") - sum("REFUND"))}
      </p>
      <p>
        Transferências/pagamentos: {formatCents(sum("TRANSFER"))} (fora do
        resultado).
      </p>
      {transactions[0]?.sourceType !== "CREDIT_CARD" ? (
        <p>
          Aplicações: {formatCents(sum("INVESTMENT_DEPOSIT"))} · Resgates:{" "}
          {formatCents(sum("INVESTMENT_WITHDRAWAL"))} (fora do resultado). Esses
          movimentos não identificam a caixinha nem seu titular e não atualizam
          o patrimônio automaticamente.
        </p>
      ) : null}
      {transactions[0]?.sourceType === "CREDIT_CARD" ? (
        <p>
          Esta fatura não mostra seu salário, Pix ou compras no débito. Importe
          também o extrato da conta. Parcelas são contabilizadas pelo valor e
          data presentes no CSV; não projetamos parcelas futuras.
        </p>
      ) : (
        <p>
          Débito e Pix enviados entram como despesas; recebimentos entram como
          receitas. Confira transferências entre suas próprias contas e
          reembolsos: altere a natureza em Transações → Editar quando
          necessário.
        </p>
      )}
    </div>
  );
}
