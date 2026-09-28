"use client";

import { Trash2 } from "lucide-react";
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
      <button
        aria-label={`Excluir “${description}”`}
        className="grid size-9 place-items-center rounded-lg text-rose-700 transition hover:bg-rose-50"
        title="Excluir"
        type="submit"
      >
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}
