"use client";

import { deleteAssetSnapshot } from "./actions";

export function ConfirmSnapshotDelete({ id }: { id: string }) {
  return (
    <form
      action={deleteAssetSnapshot}
      onSubmit={(event) => {
        if (!window.confirm("Excluir este snapshot e seus valores históricos?"))
          event.preventDefault();
      }}
    >
      <input name="id" type="hidden" value={id} />
      <button className="text-sm text-rose-700 underline" type="submit">
        Excluir
      </button>
    </form>
  );
}
