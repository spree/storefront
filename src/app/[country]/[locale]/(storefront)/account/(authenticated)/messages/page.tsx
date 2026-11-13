import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AccountPageHeader } from "@/components/account/AccountPageHeader";
import { MessageThreadList } from "@/components/account/MessageThreadList";
import { getMessageThreads } from "@/lib/data/messages";

interface MessagesPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default async function MessagesPage({ params }: MessagesPageProps) {
  await connection();
  const { country, locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "messages",
  });
  const basePath = `/${country}/${locale}`;
  const response = await getMessageThreads({ limit: 50 });
  const threads = Array.isArray(response?.data) ? response.data : [];

  return (
    <div>
      <AccountPageHeader title={t("inboxTitle")} />
      <MessageThreadList
        threads={threads}
        basePath={basePath}
        locale={locale}
      />
    </div>
  );
}
