import { Suspense } from "react";
import { OAuthCallbackClient } from "./OAuthCallbackClient";

export default async function OAuthCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  return (
    <Suspense fallback={null}>
      <OAuthCallbackClient provider={provider} />
    </Suspense>
  );
}
