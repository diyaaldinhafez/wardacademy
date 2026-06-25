"use server";

import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ensureRoom, mintToken, roomNameFor } from "@/lib/video";

// Video is an internal surface (teacher + child) — English by decision.
const tv = async (key: string) => (await getTranslations({ locale: "en", namespace: "video" }))(key);

/**
 * Join the video call for a session. Only the session's instructor or learner
 * may join; the teacher joins as owner. Returns the room URL + a short-lived
 * meeting token (the Daily API key never reaches the browser).
 */
export async function joinVideoSession(sessionId: string): Promise<{ url: string; token: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error(await tv("errors.signInFirst"));

  // RLS already restricts the visible session to the user's own tenant.
  const { data: s } = await supabase.from("sessions").select("id, instructor_id, learner_id").eq("id", sessionId).maybeSingle();
  if (!s) throw new Error(await tv("errors.sessionNotFound"));

  // The teacher joins as owner; the session's learner joins as participant.
  // (Role-based, not an exact instructor_id match — legacy sessions may carry a
  // different instructor id, and a tenant has a single teacher in v1.)
  const { data: profile } = await supabase.from("profiles").select("full_name, roles").eq("id", user.id).maybeSingle();
  const isInstructor = ((profile?.roles as string[]) ?? []).includes("instructor");
  const isLearner = s.learner_id === user.id;
  if (!isInstructor && !isLearner) throw new Error(await tv("errors.notParticipant"));
  const name = roomNameFor(sessionId);
  const url = await ensureRoom(name);
  const token = await mintToken({ roomName: name, userName: profile?.full_name ?? (await tv("userFallback")), isOwner: isInstructor });
  return { url, token };
}
