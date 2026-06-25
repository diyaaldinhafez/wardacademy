import "server-only";

// Daily.co integration for the in-platform 1:1 session video call.
// The API key stays server-side; the browser only ever receives a room URL and a
// short-lived meeting token minted here.

const API = "https://api.daily.co/v1";

function apiKey(): string {
  const k = process.env.DAILY_API_KEY;
  if (!k) throw new Error("Video isn't configured yet — add DAILY_API_KEY to the environment.");
  return k;
}

async function daily(path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
}

/** Get the private room for a session, creating it on first use. Returns its URL. */
export async function ensureRoom(name: string): Promise<string> {
  let res = await daily(`/rooms/${name}`);
  if (res.status === 404) {
    res = await daily("/rooms", {
      method: "POST",
      body: JSON.stringify({
        name,
        privacy: "private",
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // auto-clean after a day
          eject_at_room_exp: true,
        },
      }),
    });
  }
  if (!res.ok) throw new Error("Couldn't prepare the video room.");
  const room = (await res.json()) as { url?: string };
  if (!room.url) throw new Error("Couldn't prepare the video room.");
  return room.url;
}

/** Mint a short-lived meeting token scoped to a room + identity (teacher = owner). */
export async function mintToken({ roomName, userName, isOwner }: { roomName: string; userName: string; isOwner: boolean }): Promise<string> {
  const res = await daily("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: { room_name: roomName, user_name: userName, is_owner: isOwner, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 4 },
    }),
  });
  if (!res.ok) throw new Error("Couldn't create the session access token.");
  const out = (await res.json()) as { token?: string };
  if (!out.token) throw new Error("Couldn't create the session access token.");
  return out.token;
}

export const roomNameFor = (sessionId: string) => `ward-session-${sessionId}`;
