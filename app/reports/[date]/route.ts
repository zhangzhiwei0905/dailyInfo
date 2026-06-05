export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  return new Response(null, {
    status: 308,
    headers: { Location: `/report/${date}` },
  });
}
