"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function EmployeeRegisterPage() {
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
