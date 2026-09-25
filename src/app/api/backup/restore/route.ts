import { parseBackup, restoreBackup } from "@/lib/backup";

export const runtime = "nodejs";
const MAX_BACKUP_BYTES = 100 * 1024 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BACKUP_BYTES)
    return Response.json(
      { error: "O arquivo excede o limite de 100 MB." },
      { status: 413 },
    );
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "Envie um arquivo de backup válido." },
      { status: 400 },
    );
  }
  if (formData.get("confirmRestore") !== "yes") {
    return Response.json(
      { error: "Confirme explicitamente a restauração antes de continuar." },
      { status: 400 },
    );
  }
  const file = formData.get("file");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > MAX_BACKUP_BYTES
  )
    return Response.json(
      { error: "Selecione um arquivo JSON de backup de até 100 MB." },
      { status: 400 },
    );
  let contents: string;
  try {
    contents = await file.text();
  } catch {
    return Response.json(
      { error: "Não foi possível ler o arquivo enviado." },
      { status: 400 },
    );
  }
  const backup = parseBackup(contents);
  if (!backup)
    return Response.json(
      { error: "Backup inválido ou incompatível. Nenhum dado foi alterado." },
      { status: 400 },
    );
  try {
    const protectionFile = await restoreBackup(backup);
    return Response.json({ ok: true, protectionFile });
  } catch {
    return Response.json(
      {
        error:
          "A restauração não foi concluída. Os dados atuais continuam protegidos pelo backup automático.",
      },
      { status: 500 },
    );
  }
}
