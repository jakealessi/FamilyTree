import { TreeWorkspace } from "@/components/tree/tree-workspace";

type TreePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string; personal?: string }>;
};

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
