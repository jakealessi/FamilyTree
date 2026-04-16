/**
 * Parse a fetch Response body as JSON. Returns null if empty or invalid.
 * Avoids throwing when the server returns HTML or plain text errors.
 */
export async function readResponseJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
