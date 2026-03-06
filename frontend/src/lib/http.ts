export class HttpError extends Error {
  status: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function safeParseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // fallback
  }
}

export async function http<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 12_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: "include", // Important for cookies
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const body = await safeParseJson(res);

    if (!res.ok) {
      // coba ambil message yang jelas
      const msg =
        (isObject(body) && typeof body.message === "string" && body.message) ||
        `Request failed (${res.status})`;
      throw new HttpError(msg, res.status, body);
    }

    return body as T;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new HttpError("Request timeout. Coba lagi.", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}