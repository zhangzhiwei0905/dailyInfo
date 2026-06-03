const LOCALHOST_ALIASES = new Set(["127.0.0.1", "0.0.0.0", "[::1]", "::1"]);

export function canonicalizeLocalhost(hostHeader: string | null, path: string): string | null {
  if (!hostHeader) return null;
  const [hostname, port] = hostHeader.split(":");
  if (!LOCALHOST_ALIASES.has(hostname)) return null;
  return `http://localhost${port ? `:${port}` : ""}${path}`;
}
