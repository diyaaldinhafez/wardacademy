/* eslint-disable @typescript-eslint/no-explicit-any */
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ward/ui";
import AvailabilityMatrix from "@/components/availability/AvailabilityMatrix";

/** Read-only view of a teacher's regular-lesson availability (admin watches; teacher edits). */
export default async function AvailabilityView({ instructorId }: { instructorId: string }) {
  const supabase = await createClient();
  const t = await getTranslations({ locale: "en", namespace: "admin.availabilityView" });
  const { data: tenant } = await supabase.from("tenants").select("timezone").maybeSingle();
  const tz = tenant?.timezone ?? "Asia/Riyadh";

  const { data: rules } = await supabase.from("availability_rules").select("weekday, start_time, end_time, slot_minutes").eq("instructor_id", instructorId).order("weekday");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
        {t("readonlyA")} <Badge tone="neutral">{tz}</Badge>{t("readonlyB")}
      </p>
      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <AvailabilityMatrix rules={(rules ?? []) as any} />
      </Card>
    </div>
  );
}
