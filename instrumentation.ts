export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initRedis } = await import("./lib/redis");
    await initRedis();
  }
}