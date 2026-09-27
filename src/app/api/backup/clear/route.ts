import { clearData } from "@/lib/backup";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json(
      { error: "Origem da solicitação inválida." },
      { status: 403 },
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Solicitação inválida." }, { status: 400 });
  }
  if (
    !body ||
    !["transactions", "all"].includes(body.mode) ||
    body.confirmation !== "LIMPAR"
  ) {
    return Response.json(
      { error: "Escolha o que limpar e digite LIMPAR para confirmar." },
      { status: 400 },
    );
  }
  try {
    const protectionFile = await clearData(body.mode);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, protectionFile });
  } catch {
    return Response.json(
      {
        error:
          "A limpeza não foi concluída. Nenhuma exclusão foi aplicada. Verifique se há espaço e permissão para salvar o backup.",
      },
      { status: 500 },
    );
  }
}
