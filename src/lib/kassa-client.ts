export async function kassaPost<T>(path: string, payload: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Cannot connect to Kassa. Check your internet connection.");
  }
  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = result && typeof result === "object" && "message" in result
      ? (result as { message: unknown }).message
      : null;
    throw new Error(
      typeof message === "string"
        ? message
        : Array.isArray(message)
          ? message.filter((m): m is string => typeof m === "string").join(". ")
          : "Request failed. Please try again.",
    );
  }
  return result as T;
}
