const ACCESS_KEY_PREFIX = "familytree:access";
const EDITOR_KEY_PREFIX = "familytree:editor";
const EDITOR_NAME_KEY_PREFIX = "familytree:editor-name";
const DEVICE_KEY = "familytree:device-id";

type StoredSession = {
  token: string | null;
  personalToken: string | null;
  updatedAt: number;
};

function readStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function accessKey(slug: string) {
  return `${ACCESS_KEY_PREFIX}:${slug}`;
}

function editorKey(slug: string) {
  return `${EDITOR_KEY_PREFIX}:${slug}`;
}

function editorNameKey(slug: string) {
  return `${EDITOR_NAME_KEY_PREFIX}:${slug}`;
}

export function getStoredSession(slug: string): StoredSession {
  const storage = readStorage();
  const fallback = {
    token: null,
    personalToken: null,
    updatedAt: Date.now(),
  };

  if (!storage) {
    return fallback;
  }

  const raw = storage.getItem(accessKey(slug));
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    return {
      token: parsed.token ?? null,
      personalToken: parsed.personalToken ?? null,
      updatedAt: parsed.updatedAt ?? Date.now(),
    };
  } catch {
    return fallback;
  }
}

export function storeSession(
  slug: string,
  nextSession: Partial<Pick<StoredSession, "token" | "personalToken">>,
) {
  const storage = readStorage();
  if (!storage) {
    return getStoredSession(slug);
  }

  const current = getStoredSession(slug);
  const merged = {
    token:
      "token" in nextSession
        ? (nextSession.token ?? null)
        : current.token,
    personalToken:
      "personalToken" in nextSession
        ? (nextSession.personalToken ?? null)
        : current.personalToken,
    updatedAt: Date.now(),
  };

  storage.setItem(accessKey(slug), JSON.stringify(merged));
  return merged;
}

export function clearStoredSession(slug: string) {
  readStorage()?.removeItem(accessKey(slug));
}

/**
 * Stable ID for this browser, used when creating a new tree so the same device is recognized as owner.
 */
export function getOrCreateDeviceToken() {
  const storage = readStorage();
  if (!storage) {
    return null;
  }

  const existing = storage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }

  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  storage.setItem(DEVICE_KEY, next);
  return next;
}

/**
 * Per-tree editor token for API calls. Uses a legacy per-slug value when present so existing owner bindings keep working.
 */
export function getOrCreateEditorToken(slug: string) {
  const storage = readStorage();
  if (!storage) {
    return null;
  }

  const legacy = storage.getItem(editorKey(slug));
  if (legacy) {
    return legacy;
  }

  const device = getOrCreateDeviceToken();
  if (!device) {
    return null;
  }

  storage.setItem(editorKey(slug), device);
  return device;
}

export function getStoredEditorName(slug: string) {
  return readStorage()?.getItem(editorNameKey(slug)) ?? "";
}

export function storeEditorName(slug: string, value: string) {
  readStorage()?.setItem(editorNameKey(slug), value.trim());
}
