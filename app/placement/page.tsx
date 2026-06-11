import type { Metadata } from "next";
import { Suspense } from "react";
import PlacementClient from "@/components/PlacementClient";

export const metadata: Metadata = {
  title: "Placement test — Ward Academy",
  robots: { index: false, follow: false },
};

export default function PlacementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <PlacementClient />
    </Suspense>
  );
}
