import { hasAdminSession } from "@/lib/web/auth";
import { prisma } from "@/lib/db/prisma";
import { subscribeRun } from "@/lib/web/run-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await hasAdminSession())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await context.params;

  // Verify run exists
  const run = await prisma.generationRun.findUnique({ where: { id } });
  if (!run) {
    return new Response("Not found", { status: 404 });
  }

  // If already finished, return the final state immediately
  if (run.status !== "running") {
    return new Response(
      `event: done\ndata: ${run.status}\n\n` +
      (run.logExcerpt ? run.logExcerpt.split("\n").map((l: string) => `event: log\ndata: ${l}\n\n`).join("") : ""),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      },
    );
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: string) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
          if (event === "done") {
            setTimeout(() => controller.close(), 500);
          }
        } catch {
          // Stream already closed
        }
      };

      const unsubscribe = subscribeRun(id, send);

      // Keep-alive every 15s to prevent proxy timeout
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15_000);

      // Cleanup on abort
      const onClose = () => {
        unsubscribe();
        clearInterval(keepAlive);
        try { controller.close(); } catch {}
      };

      // Note: AbortSignal cleanup is handled by the stream closing
      // when the client disconnects, which triggers the catch in send()
      setTimeout(onClose, 600_000); // 10 min max timeout
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
