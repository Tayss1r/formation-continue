"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function EmployeeRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  useEffect(() => {
    const target = token
      ? `/signup?token=${encodeURIComponent(token)}`
      : "/signup";
    router.replace(target);
  }, [token, router]);

  return null;
}

export default function EmployeeRegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EmployeeRegisterContent />
    </Suspense>
  );
}
