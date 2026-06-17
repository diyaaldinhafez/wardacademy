import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Next 16 proxy convention (formerly "middleware").
export function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only the authenticated teacher workspace needs session handling.
export const config = {
  matcher: ["/studio/:path*"],
};
