import { createBackupObject, backupJson } from "@/lib/backup";
import { currentProfile } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const payload = backupJson(await createBackupObject());
    const day = new Date().toISOString().slice(0, 10);
    const { id } = await currentProfile();
    return new Response(payload, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="atlas-backup-${id}-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Não foi possível gerar o backup." },
      { status: 500 },
    );
  }
}
