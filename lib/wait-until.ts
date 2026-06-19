export async function waitUntil<T>(
  check: () => Promise<T | null | undefined | false>,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<T | null> {
  const { intervalMs = 120, timeoutMs = 25000 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}