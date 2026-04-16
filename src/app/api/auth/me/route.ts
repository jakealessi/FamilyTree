import { NextResponse } from "next/server";

import { prisma } from "@/lib/server/db";
import { readTreeAuth } from "@/lib/server/request";

export async function GET(request: Request) {
  const auth = await readTreeAuth(request);
  if (!auth.userId) {
    return NextResponse.json({ user: null, trees: [] });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      displayName: true,
      ownedTrees: {
        select: {
          slug: true,
          title: true,
          lastActivityAt: true,
        },
        orderBy: { lastActivityAt: "desc" },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ user: null, trees: [] });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    trees: user.ownedTrees.map((tree) => ({
      slug: tree.slug,
      title: tree.title,
      lastActivityAt: tree.lastActivityAt.toISOString(),
    })),
  });
}
