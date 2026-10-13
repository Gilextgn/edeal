"use client";

import { useEffect } from "react";
import { resetActivity } from "@/components/session-timeout";

// Sur les écrans de connexion : le compteur d'inactivité repart de zéro, pour
// que la session suivante ne soit pas fermée à cause de la précédente.
export function ResetActivity() {
  useEffect(() => {
    resetActivity();
  }, []);
  return null;
}
