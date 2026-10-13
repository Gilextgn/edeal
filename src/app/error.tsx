"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorScreen } from "@/components/error-screen";

// Erreur imprévue sur un écran : un message clair au lieu d'une page cassée.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      error={error}
      retry={retry}
      texts={{
        title: t("title"),
        network: t("network"),
        generic: t("generic"),
        retry: t("retry"),
        home: t("home"),
      }}
    />
  );
}
