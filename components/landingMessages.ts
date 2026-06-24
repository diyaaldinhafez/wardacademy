"use client";

import { useMessages } from "next-intl";
// Used only via `typeof` (a type position), so the bundler elides it — no
// runtime cost. Gives the active-locale landing subtree its real shape so
// component .map/.reduce callbacks stay fully typed.
import enMessages from "@/messages/en.json";

/** The active-locale `landing` message subtree, fully typed. */
export function useLandingMessages() {
  return (useMessages() as unknown as typeof enMessages).landing;
}
