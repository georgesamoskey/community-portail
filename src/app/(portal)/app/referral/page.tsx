"use client";

import Link from "next/link";
import { ViralGrowthCard } from "@/components/viral-growth-card";
import { useI18n } from "@/lib/i18n/context";
import { useBff } from "@/lib/use-bff";
import { PageHeader, Panel } from "@/lib/ui";

export default function ReferralPage() {
  const { t } = useI18n();
  const engagement = useBff("/engagement/me");
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.referral")}
        description={t("viral.desc")}
      />
      <Panel>
        <ViralGrowthCard engagement={engagement.data as never} />
      </Panel>
    </div>
  );
}
