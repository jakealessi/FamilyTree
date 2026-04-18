import { randomBytes } from "node:crypto";

const SUPABASE_REF_PREFIX = "supabase://";
const DEFAULT_SUPABASE_BUCKET = "family-tree-media";
const DEFAULT_SIGNED_URL_TTL_SEC = 60 * 60;

type UploadFileArgs = {
  bytes: Buffer;
  fileName: string;
  mimeType: string;
  treeSlug: string;
  personId: string;
  mediaType: "PROFILE" | "GALLERY";
};

type SupabaseRef = {
  bucket: string;
  path: string;
};

function supabaseUrl() {
  const raw =
    process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  return raw.replace(/\/+$/, "") || null;
}

function supabaseServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

function supabaseBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_SUPABASE_BUCKET;
}

function signedUrlTtlSec() {
  const parsed = Number(process.env.MEDIA_SIGNED_URL_TTL_SEC ?? DEFAULT_SIGNED_URL_TTL_SEC);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SIGNED_URL_TTL_SEC;
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function extensionFromUpload(fileName: string, mimeType: string) {
  const rawExtension = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (rawExtension) {
    return rawExtension;
  }

  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
}

function sanitizePathSegment(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
}

function buildSupabaseRef(bucket: string, path: string) {
  return `${SUPABASE_REF_PREFIX}${bucket}/${path}`;
}

function parseSupabaseRef(value: string): SupabaseRef | null {
  if (!value.startsWith(SUPABASE_REF_PREFIX)) {
    return null;
  }

  const remainder = value.slice(SUPABASE_REF_PREFIX.length);
  const slashIndex = remainder.indexOf("/");
  if (slashIndex <= 0) {
    return null;
  }

  const bucket = remainder.slice(0, slashIndex);
  const path = remainder.slice(slashIndex + 1);
  if (!bucket || !path) {
    return null;
  }

  return { bucket, path };
}

function storageMode() {
  if (supabaseUrl() && supabaseServiceRoleKey()) {
    return "SUPABASE";
  }

  return process.env.NODE_ENV === "production" ? "EXTERNAL_ONLY" : "INLINE";
}

async function uploadToSupabase(args: UploadFileArgs) {
  const baseUrl = supabaseUrl();
  const serviceRoleKey = supabaseServiceRoleKey();
  if (!baseUrl || !serviceRoleKey) {
    throw Object.assign(new Error("Storage is not configured."), {
      code: "MEDIA_STORAGE_NOT_CONFIGURED",
    });
  }

  const bucket = supabaseBucket();
  const extension = extensionFromUpload(args.fileName, args.mimeType);
  const familySegment = sanitizePathSegment(args.treeSlug) || "tree";
  const personSegment = sanitizePathSegment(args.personId) || "person";
  const kindSegment = args.mediaType === "PROFILE" ? "profile" : "gallery";
  const uniqueSuffix = randomBytes(8).toString("hex");
  const path = `${familySegment}/${personSegment}/${kindSegment}-${Date.now()}-${uniqueSuffix}.${extension}`;

  const response = await fetch(
    `${baseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "content-type": args.mimeType,
        "x-upsert": "false",
      },
      body: new Uint8Array(args.bytes),
    },
  );

  if (!response.ok) {
    throw Object.assign(new Error(await response.text()), {
      code: "MEDIA_UPLOAD_FAILED",
    });
  }

  return buildSupabaseRef(bucket, path);
}

export async function storeUploadedImageFile(args: UploadFileArgs) {
  const mode = storageMode();

  if (mode === "SUPABASE") {
    return uploadToSupabase(args);
  }

  if (mode === "INLINE") {
    return `data:${args.mimeType};base64,${args.bytes.toString("base64")}`;
  }

  throw Object.assign(
    new Error("File uploads require external storage in production."),
    {
      code: "MEDIA_STORAGE_NOT_CONFIGURED",
    },
  );
}

async function resolveSupabaseSignedUrl(ref: SupabaseRef) {
  const baseUrl = supabaseUrl();
  const serviceRoleKey = supabaseServiceRoleKey();
  if (!baseUrl || !serviceRoleKey) {
    return null;
  }

  const response = await fetch(
    `${baseUrl}/storage/v1/object/sign/${encodeURIComponent(ref.bucket)}/${encodeStoragePath(ref.path)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        expiresIn: signedUrlTtlSec(),
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as
    | { signedURL?: string; signedUrl?: string }
    | null;
  const signedPath = payload?.signedURL ?? payload?.signedUrl;
  if (!signedPath) {
    return null;
  }

  return signedPath.startsWith("http") ? signedPath : `${baseUrl}/storage/v1${signedPath}`;
}

export async function resolveMediaReferences(values: string[]) {
  const uniqueValues = [...new Set(values.filter(Boolean))];
  const resolvedEntries = await Promise.all(
    uniqueValues.map(async (value) => {
      const ref = parseSupabaseRef(value);
      if (!ref) {
        return [value, value] as const;
      }

      return [value, await resolveSupabaseSignedUrl(ref)] as const;
    }),
  );

  return new Map<string, string | null>(resolvedEntries);
}
