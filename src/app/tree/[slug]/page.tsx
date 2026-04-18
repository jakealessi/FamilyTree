import type { Metadata } from "next";

import { TreeWorkspace } from "@/components/tree/tree-workspace";

type TreePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; personal?: string }>;
};

export async function generateMetadata({ params }: TreePageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: "Private family tree",
    description: `Private Branchbook tree: ${slug}`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default async function TreePage({ params, searchParams }: TreePageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <TreeWorkspace
      slug={slug}
      initialToken={resolvedSearchParams.token ?? null}
      initialPersonalToken={resolvedSearchParams.personal ?? null}
    />
  );
}
