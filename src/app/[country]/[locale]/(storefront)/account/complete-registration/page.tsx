import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CompleteRegistrationForm } from "@/components/account/CompleteRegistrationForm";
import { getRegistrationToken } from "@/lib/spree";

interface CompleteRegistrationPageProps {
  params: Promise<{ country: string; locale: string }>;
}

export default function CompleteRegistrationPage(
  props: CompleteRegistrationPageProps,
) {
  return (
    <Suspense fallback={null}>
      <CompleteRegistrationPageContent {...props} />
    </Suspense>
  );
}

async function CompleteRegistrationPageContent({
  params,
}: CompleteRegistrationPageProps) {
  const { country, locale } = await params;
  await connection();

  // The token expires in fifteen minutes and is spent by the first submit.
  // Without one there is nothing to finish, so send the shopper back to sign
  // in rather than showing a form that can only fail.
  if (!(await getRegistrationToken())) {
    redirect(`/${country}/${locale}/account`);
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <CompleteRegistrationForm />
    </div>
  );
}
