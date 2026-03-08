"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

function PendingApprovalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Message */}
      <div className="space-y-3">
        <p className="text-foreground">
          Merci pour votre inscription ! Votre compte est actuellement en attente de vérification par notre équipe.
        </p>
        <p className="text-muted-foreground text-sm">
          Nous examinons vos documents et vous enverrons un email à{" "}
          {email ? <strong>{email}</strong> : "votre adresse email"} une fois votre compte approuvé.
        </p>
      </div>

      {/* Steps */}
      <div className="bg-muted rounded-xl p-6 text-left space-y-4">
        <h3 className="font-semibold text-foreground">Que se passe-t-il ensuite ?</h3>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary-600">1</span>
            </div>
            <span className="text-muted-foreground">
              Notre équipe examine vos documents de vérification
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary-600">2</span>
            </div>
            <span className="text-muted-foreground">
              Vous recevez un email de confirmation (sous 24-48h)
            </span>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            </div>
            <span className="text-muted-foreground">
              Une fois approuvé, connectez-vous et accédez à toutes les fonctionnalités
            </span>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div className="text-sm text-muted-foreground">
        Des questions ? Contactez-nous à{" "}
        <a
          href="mailto:formation@universite.tn"
          className="text-primary-600 hover:text-primary-700"
        >
          formation@universite.tn
        </a>
      </div>

      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <AuthLayout
      title="Compte en attente d'approbation"
      subtitle="Votre inscription est en cours de vérification"
    >
      <Suspense fallback={<LoadingFallback />}>
        <PendingApprovalContent />
      </Suspense>
    </AuthLayout>
  );
}
