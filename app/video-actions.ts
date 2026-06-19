"use server";

import { createClient } from "@/lib/supabase/server";
import { ensureRoom, mintToken, roomNameFor } from "@/lib/video";

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
  if (!user) throw new Error("سجّل الدخول أولاً.");

  // RLS scopes sessions to the instructor / learner who owns them.
  const { data: s } = await supabase.from("sessions").select("id, instructor_id, learner_id").eq("id", sessionId).maybeSingle();
  if (!s) throw new Error("الجلسة غير موجودة.");
  const isInstructor = s.instructor_id === user.id;
  const isLearner = s.learner_id === user.id;
  if (!isInstructor && !isLearner) throw new Error("لست طرفاً في هذه الجلسة.");

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const name = roomNameFor(sessionId);
  const url = await ensureRoom(name);
  const token = await mintToken({ roomName: name, userName: profile?.full_name ?? "مستخدم", isOwner: isInstructor });
  return { url, token };
}
