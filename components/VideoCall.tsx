"use client";

import { useRef, useState } from "react";
import type DailyIframe from "@daily-co/daily-js";
import { joinVideoSession } from "@/app/video-actions";

type Frame = ReturnType<typeof DailyIframe.createFrame>;

/** In-platform Daily video call for a 1:1 session. */
export default function VideoCall({ sessionId, label = "انضمام للجلسة", className }: { sessionId: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "in" | "error">("idle");
  const [err, setErr] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<Frame | null>(null);

  async function join() {
    setState("loading");
    setErr("");
    try {
      const { url, token } = await joinVideoSession(sessionId);
      const Daily = (await import("@daily-co/daily-js")).default;
      const frame = Daily.createFrame(containerRef.current!, {
        showLeaveButton: true,
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "12px" },
      });
      frame.on("left-meeting", () => {
        frame.destroy();
        frameRef.current = null;
        setState("idle");
      });
      frameRef.current = frame;
      await frame.join({ url, token });
      setState("in");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "تعذّر الانضمام للجلسة.");
      setState("error");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {state !== "in" && (
        <button onClick={join} disabled={state === "loading"} className={className ?? "ward-btn ward-btn--primary ward-btn--sm"}>
          {state === "loading" ? "جارٍ الاتصال…" : `🎥 ${label}`}
        </button>
      )}
      {err && <p style={{ fontSize: 12, color: "var(--rose-700, #b4435f)" }}>{err}</p>}
      <div ref={containerRef} style={{ width: "100%", height: state === "in" ? 440 : 0, overflow: "hidden", transition: "height .2s" }} />
    </div>
  );
}
