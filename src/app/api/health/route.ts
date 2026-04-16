import { NextResponse } from "next/server";

/**
 * Liveness probe: no DB call (avoids waking serverless DB on every ping).
 * Use for load balancers and deploy hooks.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
  });
}
