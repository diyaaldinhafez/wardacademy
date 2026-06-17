import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Next 16 proxy convention (formerly "middleware").
export function proxy(request: NextRequest) {
  return updateSession(request);
}

// The authenticated workspaces need session handling.
export const config = {
  matcher: ["/studio/:path*", "/learn/:path*", "/guardian/:path*"],
};
