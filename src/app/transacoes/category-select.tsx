"use client";

type Props = {
  description: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
};

export function CategorySelect({ description, categoryId, categories }: Props) {
  return (
    <select
      aria-label={`Categoria de ${description}`}
      className="max-w-48 rounded border border-[var(--line)] bg-transparent px-2 py-1 text-sm"
      defaultValue={categoryId ?? ""}
      name="categoryId"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      <option value="">Sem categoria</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}
