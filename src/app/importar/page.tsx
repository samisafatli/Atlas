import { ImportPreview } from "./preview";

export const metadata = {
  description:
    "Confira transações de um CSV ou OFX do Nubank antes de importar.",
};

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <section>
        <h1 className="mb-3 text-3xl font-medium">
          Prévia do arquivo do Nubank
        </h1>

        <ImportPreview />
        {erro ? (
          <p
            className="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-800"
            role="alert"
          >
            {erro === "legado"
              ? "Esta conta contém importações antigas. Corrija os lotes originais antes de importar novamente, para evitar duplicatas. Consulte o procedimento de reparo no README."
              : erro === "salvar"
                ? "Não foi possível salvar. Nenhum lançamento parcial foi mantido; confira o banco e tente novamente."
                : "Prévia inválida ou desatualizada. Selecione novamente o CSV ou OFX."}
          </p>
        ) : null}
      </section>
    </main>
  );
}
