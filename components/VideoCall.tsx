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
      // Daily forbids two call instances on a page — reuse/destroy any existing one.
      const existing = Daily.getCallInstance?.();
      if (existing) await existing.destroy();
      const frame = Daily.createFrame(containerRef.current!, {
        showLeaveButton: true,
        iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "12px" },
      });
      frame.on("left-meeting", () => {
        frame.destroy();
        frameRef.current = null;
        setState("idle");
      });
      frame.on("error", (ev) => {
        console.error("[VideoCall] daily error", ev);
        setErr(`Daily: ${ev?.errorMsg ?? "خطأ غير معروف"}`);
      });
      frameRef.current = frame;
      // Reveal the container BEFORE joining so the Daily UI (camera check / join)
      // is visible and not stuck inside a 0-height box.
      setState("in");
      await frame.join({ url, token });
    } catch (e) {
      console.error("[VideoCall] join failed", e);
      if (frameRef.current) {
        try { await frameRef.current.destroy(); } catch { /* ignore */ }
        frameRef.current = null;
      }
      const msg = (e as { errorMsg?: string; message?: string })?.errorMsg ?? (e as Error)?.message ?? (typeof e === "string" ? e : JSON.stringify(e));
      setErr(`تعذّر الانضمام: ${msg}`);
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
      {state === "in" && (
        <button onClick={() => containerRef.current?.requestFullscreen?.()} className="ward-btn ward-btn--ghost ward-btn--sm" style={{ alignSelf: "flex-start" }}>
          ⛶ ملء الشاشة
        </button>
      )}
      <div ref={containerRef} style={{ width: "100%", height: state === "in" ? "min(72vh, 680px)" : 0, minHeight: state === "in" ? 420 : 0, overflow: "hidden", borderRadius: 12, background: "#000", transition: "height .2s" }} />
    </div>
  );
}
