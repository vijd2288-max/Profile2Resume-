import { describe, expect, it, vi } from "vitest";
import { ConfigurableAiProvider } from "../src/server/ai-provider.js";

describe("AI provider", () => {
  it("requires a server-side API key", async () => {
    await expect(
      new ConfigurableAiProvider({ apiKey: "" }).complete("system", "user"),
    ).rejects.toMatchObject({
      code: "NOT_CONFIGURED",
    });
  });

  it("retries transient failures and returns structured content", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ choices: [{ message: { content: ' {"ok":true} ' } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    await expect(
      new ConfigurableAiProvider({ apiKey: "test", fetchImpl, maxRetries: 1 }).complete(
        "system",
        "user",
      ),
    ).resolves.toBe('{"ok":true}');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
