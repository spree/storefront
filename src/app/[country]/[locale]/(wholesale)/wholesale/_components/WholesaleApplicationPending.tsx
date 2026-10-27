"use client";

import { ArrowLeft, Building2, Clock, LogOut, Mail } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

interface WholesaleApplicationPendingProps {
  basePath: string;
  customerName: string;
  email: string;
  /**
   * What the buyer can do about it, from the API's `pricing_access` code:
   * register a business, or wait for the merchant to finish reviewing one.
   */
  remedy: "register" | "awaiting-approval" | "sign-in" | "none";
}

/**
 * Shown to a signed-in customer who cannot see trade prices yet.
 *
 * Two different situations, told apart by the API rather than guessed at: they
 * have no company and can found one now, or their company exists and the
 * merchant has not activated it, in which case the only honest thing to show
 * is what is on file and who to chase.
 */
export function WholesaleApplicationPending({
  basePath,
  customerName,
  email,
  remedy,
}: WholesaleApplicationPendingProps) {
  const t = useTranslations("wholesale");
  const { logout } = useAuth();
  const canRegister = remedy === "register";

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            {canRegister ? (
              <Building2 className="h-6 w-6 text-slate-700" />
            ) : (
              <Clock className="h-6 w-6 text-slate-700" />
            )}
          </div>
          <CardTitle>
            {canRegister ? t("register.title") : t("pending.title")}
          </CardTitle>
          <CardDescription>
            {canRegister
              ? t("register.description")
              : t("pending.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <dl className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("pending.nameLabel")}</dt>
              <dd className="font-medium text-slate-900">{customerName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">{t("pending.emailLabel")}</dt>
              <dd className="font-medium text-slate-900">{email}</dd>
            </div>
          </dl>

          <div className="space-y-2 text-sm text-slate-600">
            <p>{canRegister ? t("register.whatNext") : t("pending.whatNext")}</p>
            {!canRegister && (
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                {t("pending.support")}
              </p>
            )}
          </div>

          {canRegister && (
            <Button asChild className="w-full">
              <Link href={`${basePath}/wholesale/apply`}>
                <Building2 className="h-4 w-4" />
                {t("register.cta")}
              </Link>
            </Button>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline" className="flex-1">
              <Link href={basePath}>
                <ArrowLeft className="h-4 w-4" />
                {t("nav.backToStore")}
              </Link>
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => logout()}>
              <LogOut className="h-4 w-4" />
              {t("nav.signOut")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
