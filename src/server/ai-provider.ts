import { setTimeout as delay } from "node:timers/promises";

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_CONFIGURED" | "TIMEOUT" | "RATE_LIMITED" | "PROVIDER_ERROR",
    readonly status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export type AiProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
};

type ChatResponse = { choices?: Array<{ message?: { content?: string } }> };

export class ConfigurableAiProvider {
  private readonly config: {
    apiKey?: string;
    baseUrl: string;
    model: string;
    timeoutMs: number;
    maxRetries: number;
    fetchImpl: typeof fetch;
  };

  constructor(config: AiProviderConfig = {}) {
    this.config = {
      ...(config.apiKey ? { apiKey: config.apiKey } : {}),
      baseUrl: config.baseUrl ?? process.env.AI_BASE_URL ?? "https://api.openai.com/v1",
      model: config.model ?? process.env.AI_MODEL ?? "gpt-4o-mini",
      timeoutMs: config.timeoutMs ?? 20_000,
      maxRetries: config.maxRetries ?? 2,
      fetchImpl: config.fetchImpl ?? fetch,
    };
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new AiProviderError("AI provider is not configured", "NOT_CONFIGURED");
    }
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await this.config.fetchImpl(`${this.config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            temperature: 0,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
          signal: controller.signal,
        });
        if (response.ok) {
          const body = (await response.json()) as ChatResponse;
          const content = body.choices?.[0]?.message?.content?.trim();
          if (!content)
            throw new AiProviderError("AI provider returned no content", "PROVIDER_ERROR");
          return content;
        }
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt < this.config.maxRetries
        ) {
          await delay(250 * 2 ** attempt);
          continue;
        }
        if (response.status === 429)
          throw new AiProviderError(
            "AI provider rate limit reached",
            "RATE_LIMITED",
            response.status,
          );
        throw new AiProviderError("AI provider request failed", "PROVIDER_ERROR", response.status);
      } catch (error) {
        if (error instanceof AiProviderError) throw error;
        if (error instanceof DOMException && error.name === "AbortError")
          throw new AiProviderError("AI provider request timed out", "TIMEOUT");
        if (attempt < this.config.maxRetries) {
          await delay(250 * 2 ** attempt);
          continue;
        }
        throw new AiProviderError("AI provider request failed", "PROVIDER_ERROR");
      } finally {
        clearTimeout(timer);
      }
    }
    throw new AiProviderError("AI provider request failed", "PROVIDER_ERROR");
  }
}

export function createAiProvider(source: NodeJS.ProcessEnv = process.env) {
  return new ConfigurableAiProvider({
    ...(source.AI_API_KEY ? { apiKey: source.AI_API_KEY } : {}),
    ...(source.AI_BASE_URL ? { baseUrl: source.AI_BASE_URL } : {}),
    ...(source.AI_MODEL ? { model: source.AI_MODEL } : {}),
  });
}
