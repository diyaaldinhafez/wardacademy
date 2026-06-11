import type { Metadata } from "next";
import EnrollScreen from "@/components/EnrollScreen";

export const metadata: Metadata = {
  title: "Get started — Ward Academy",
  description: "Register, book a free trial, and take a quick placement test.",
};

/**
 * Dedicated enrolment page — reads ?goal=key (server) and hands the focused,
 * bilingual screen the goal key to pre-fill.
 */
export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<{ goal?: string }>;
}) {
  const { goal } = await searchParams;
  return <EnrollScreen goalKey={goal} />;
}
