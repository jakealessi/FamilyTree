import { createHash, randomBytes } from "node:crypto";

const slugAdjectives = [
  "amber",
  "cedar",
  "golden",
  "harbor",
  "hollow",
  "meadow",
  "moss",
  "oak",
  "river",
  "sage",
  "willow",
];

const slugNouns = [
  "branch",
  "canopy",
  "grove",
  "hearth",
  "orchard",
  "roots",
  "story",
  "thicket",
  "timber",
  "trail",
];

export function generateOpaqueToken(prefix: string) {
  return `${prefix}_${randomBytes(18).toString("base64url")}`;
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function accentColorFromToken(token: string) {
  return `#${hashToken(token).slice(0, 6)}`;
}

export function generateRecoveryCode() {
  return Array.from({ length: 4 }, () =>
    randomBytes(2).toString("hex").toUpperCase(),
  ).join("-");
}

export function normalizeRecoveryCode(value: string) {
  return value.trim().toUpperCase();
}

export function slugifyTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

export function generateTreeSlug(title: string) {
  const titleSeed = slugifyTitle(title);
  const adjective =
    slugAdjectives[Math.floor(Math.random() * slugAdjectives.length)] ?? "family";
  const noun = slugNouns[Math.floor(Math.random() * slugNouns.length)] ?? "tree";
  const suffix = randomBytes(3).toString("hex");
  const readable = [titleSeed, adjective, noun].filter(Boolean).join("-");

  return `${readable}-${suffix}`.slice(0, 64);
}

export function buildTreeLink(origin: string, slug: string, token?: string | null) {
  const url = new URL(`/tree/${slug}`, origin);
  if (token) {
    url.searchParams.set("token", token);
  }
  return url.toString();
}

export function buildPersonalLink(
  origin: string,
  slug: string,
  personalToken: string,
) {
  const url = new URL(`/tree/${slug}`, origin);
  url.searchParams.set("personal", personalToken);
  return url.toString();
}
