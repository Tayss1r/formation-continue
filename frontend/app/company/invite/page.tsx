"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function CompanyInviteContent() {
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

export default function CompanyInvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompanyInviteContent />
    </Suspense>
  );
}
