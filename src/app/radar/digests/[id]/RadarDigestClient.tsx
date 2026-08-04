"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTelegram } from "@/hooks/useTelegram";

export function RadarDigestClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isInTelegram, showBackButton, hideBackButton } = useTelegram();

  useEffect(() => {
    if (!isInTelegram) return;
    showBackButton(() => router.back());
    return () => hideBackButton();
  }, [hideBackButton, isInTelegram, router, showBackButton]);

  return <>{children}</>;
}
