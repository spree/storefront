"use client";

import type { CompanyInvitation, CompanyMembership } from "@spree/sdk";
import { Mail, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addCompanyMember,
  removeCompanyMember,
  revokeCompanyInvitation,
} from "@/lib/data/companies";

/**
 * The people who may act for this node, and the invitations still outstanding.
 *
 * Adding takes an email and nothing else: the server turns it into a
 * membership when that person already has an account and an emailed invitation
 * when they do not, so the buyer never has to know which case they are in.
 *
 * Every member may manage the directory — the open-source edition ships no
 * company roles, and the server enforces standing rather than rank.
 */
export function CompanyMembers({
  companyId,
  members,
  invitations,
}: {
  companyId: string;
  members: CompanyMembership[];
  invitations: CompanyInvitation[];
}) {
  const t = useTranslations("companies");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    startTransition(async () => {
      const result = await addCompanyMember(companyId, email.trim());
      if (result.success) {
        setEmail("");
        setError(null);
      } else {
        setError(result.error ?? t("addMemberFailed"));
      }
    });
  };

  return (
    <section className="rounded-lg border">
      <header className="border-b p-4">
        <h2 className="font-medium">{t("members")}</h2>
      </header>

      <div className="divide-y">
        {members.map((member) => (
          <div key={member.id} className="flex items-center gap-3 p-4">
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate">{member.email}</span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await removeCompanyMember(companyId, member.id);
                })
              }
              aria-label={t("removeMember")}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        {invitations.map((invitation) => (
          <div key={invitation.id} className="flex items-center gap-3 p-4">
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate">{invitation.email}</span>
              <span className="text-muted-foreground text-xs">
                {t("invitationPending")}
              </span>
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await revokeCompanyInvitation(companyId, invitation.id);
                })
              }
            >
              {t("revoke")}
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 border-t p-4">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("addMemberPlaceholder")}
          aria-label={t("addMember")}
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !email.trim()}>
          <UserPlus className="size-4" />
          {t("addMember")}
        </Button>
      </form>

      {error && (
        <p className="px-4 pb-4 text-destructive text-sm" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
