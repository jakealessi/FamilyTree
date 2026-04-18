import type { Metadata } from "next";
import "./globals.css";

function resolveMetadataBase() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: {
    default: "Branchbook",
    template: "%s | Branchbook",
  },
  applicationName: "Branchbook",
  description:
    "Build a private family tree together without forcing anyone to create an account.",
  openGraph: {
    title: "Branchbook",
    description:
      "A private, no-account family tree for sharing people, photos, and memories by link.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Branchbook",
    description:
      "Build a private family tree together without forcing anyone to create an account.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
