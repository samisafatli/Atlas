"use client";

import { deleteTransaction } from "./actions";

export function ConfirmDelete({
  id,
  description,
}: {
  id: string;
  description: string;
}) {
  return (
    <form
      action={deleteTransaction}
      onSubmit={(event) => {
        if (!window.confirm(`Excluir a transação “${description}”?`))
          event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="text-sm text-rose-700 hover:underline" type="submit">
        Excluir
      </button>
    </form>
  );
}
