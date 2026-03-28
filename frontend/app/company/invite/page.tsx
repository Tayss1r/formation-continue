"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CompanyInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  useEffect(() => {
    const target = token
      ? `/dashboard/invite?token=${encodeURIComponent(token)}`
      : "/dashboard/invite";
    router.replace(target);
  }, [token, router]);

  return null;
}
