"use client";

import { BadgePercent } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function OffersPageIntro() {
  const t = useTranslations("offers");

  return (
    <section className="bg-[#f4eee9] px-4 py-7 sm:px-6 sm:py-9">
      <div className="mx-auto flex max-w-6xl items-start gap-4 sm:items-center sm:gap-6">
        <div className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-marketplace-brand-accent text-white sm:flex">
          <BadgePercent aria-hidden="true" className="size-7" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#8c5a37]">
            {t("pageEyebrow")}
          </p>
          <h1 className="mt-1 font-display text-2xl leading-tight text-[#302936] sm:text-3xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#625a62] sm:text-base">
            {t("heroDescription")}{" "}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="font-semibold text-[#302936] underline decoration-[#a69aa1] underline-offset-4 transition-colors hover:text-marketplace-brand-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marketplace-brand-accent"
                >
                  {t("learnMore")}
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border-0 bg-marketplace-surface p-6 shadow-xl sm:max-w-md sm:p-8">
                <div className="space-y-4 text-center">
                  <DialogTitle className="text-xl font-semibold text-marketplace-foreground">
                    {t("howOffersWork")}
                  </DialogTitle>
                  <DialogDescription className="text-sm leading-6 text-marketplace-muted-foreground">
                    {t("howOffersWorkFirst")}
                  </DialogDescription>
                  <p className="text-sm leading-6 text-marketplace-muted-foreground">
                    {t("howOffersWorkSecond")}
                  </p>
                  <DialogClose asChild>
                    <Button className="w-full rounded-full bg-[#302936] text-white hover:bg-[#403747]">
                      {t("gotIt")}
                    </Button>
                  </DialogClose>
                </div>
              </DialogContent>
            </Dialog>
          </p>
        </div>
      </div>
    </section>
  );
}
