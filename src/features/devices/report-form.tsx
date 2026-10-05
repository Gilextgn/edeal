"use client";

import { useTranslations } from "next-intl";
import { ReportOperationForm } from "./report-fields";

// Constat d'entrée, ou correction de l'état d'un appareil en stock.
export function ReportForm({
  deviceId,
  userId,
  backHref,
}: {
  deviceId: string;
  userId: string;
  backHref: string;
}) {
  const t = useTranslations("reports");
  return (
    <ReportOperationForm
      deviceId={deviceId}
      userId={userId}
      backHref={backHref}
      submitLabel={t("submit")}
      build={() => ({ rpc: "create_intake_report", args: {} })}
    />
  );
}
