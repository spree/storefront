interface ShopLinkIconProps {
  label: string;
  url: string;
}

export function ShopLinkIcon({ label, url }: ShopLinkIconProps) {
  const normalizedLabel = label.trim().toLowerCase();
  const normalizedUrl = url.toLowerCase();
  let content: React.ReactNode;

  if (
    normalizedLabel.includes("facebook") ||
    normalizedUrl.includes("facebook.com")
  ) {
    content = (
      <path d="M13.4 21v-8.2h2.75l.41-3.2H13.4V7.56c0-.93.26-1.56 1.59-1.56h1.69V3.14C16.39 3.05 15.42 3 14.28 3c-2.76 0-4.65 1.68-4.65 4.77V9.6H7v3.2h2.63V21h3.77Z" />
    );
  } else if (
    normalizedLabel.includes("instagram") ||
    normalizedUrl.includes("instagram.com")
  ) {
    content = (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.7" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </>
    );
  } else if (
    normalizedLabel.includes("pinterest") ||
    normalizedUrl.includes("pinterest.")
  ) {
    content = (
      <path d="M12 2.75a9.25 9.25 0 0 0-3.37 17.87c-.02-.76 0-1.67.19-2.5l1.37-5.8s-.34-.68-.34-1.69c0-1.58.92-2.75 2.07-2.75.98 0 1.45.74 1.45 1.63 0 .99-.63 2.47-.95 3.84-.27 1.15.58 2.09 1.72 2.09 2.06 0 3.45-2.65 3.45-5.79 0-2.39-1.61-4.18-4.54-4.18-3.31 0-5.37 2.47-5.37 5.23 0 .95.28 1.63.72 2.15.2.24.23.34.16.62l-.22.9c-.07.29-.29.4-.54.29-1.51-.62-2.21-2.27-2.21-4.13 0-3.07 2.59-6.76 7.72-6.76 4.13 0 6.85 2.99 6.85 6.2 0 4.24-2.36 7.4-5.83 7.4-1.17 0-2.28-.63-2.66-1.34l-.76 3.04c-.23.84-.68 1.68-1.09 2.34A9.25 9.25 0 1 0 12 2.75Z" />
    );
  } else if (
    normalizedLabel.includes("youtube") ||
    normalizedUrl.includes("youtube.com") ||
    normalizedUrl.includes("youtu.be")
  ) {
    content = (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="4" />
        <path d="m10 9 5.5 3-5.5 3V9Z" fill="currentColor" stroke="none" />
      </>
    );
  } else if (
    normalizedLabel.includes("tiktok") ||
    normalizedUrl.includes("tiktok.com")
  ) {
    content = (
      <path d="M15.1 3h3.05c.18 1.66 1.1 3.14 2.85 3.9v3.18a8.03 8.03 0 0 1-4.65-1.52v6.65a5.94 5.94 0 1 1-5.94-5.94c.38 0 .76.04 1.12.11v3.36a2.62 2.62 0 1 0 1.94 2.53V3h1.63Z" />
    );
  } else if (normalizedLabel === "x" || normalizedUrl.includes("x.com")) {
    content = (
      <path d="M4 3h4.7l4.3 5.75L17.9 3H20l-6.05 7.16L21 21h-4.7l-4.72-6.3L6.1 21H4l6.35-7.72L4 3Zm3.65 1.8H7.2l10.2 14.4h.48L7.65 4.8Z" />
    );
  } else if (
    normalizedLabel.includes("twitter") ||
    normalizedUrl.includes("twitter.com")
  ) {
    content = (
      <path d="M22 5.92a8.2 8.2 0 0 1-2.36.65 4.12 4.12 0 0 0 1.8-2.27 8.23 8.23 0 0 1-2.6.99 4.1 4.1 0 0 0-7 3.74 11.64 11.64 0 0 1-8.45-4.28 4.1 4.1 0 0 0 1.27 5.47 4.06 4.06 0 0 1-1.86-.51v.05a4.1 4.1 0 0 0 3.29 4.02 4.12 4.12 0 0 1-1.85.07 4.11 4.11 0 0 0 3.83 2.85A8.23 8.23 0 0 1 2 18.4a11.61 11.61 0 0 0 6.29 1.84c7.55 0 11.68-6.25 11.68-11.68l-.01-.53A8.34 8.34 0 0 0 22 5.92Z" />
    );
  } else {
    content = (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3.5 12h17M12 3c2.25 2.46 3.38 5.46 3.38 9S14.25 18.54 12 21c-2.25-2.46-3.38-5.46-3.38-9S9.75 5.46 12 3Z" />
      </>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {content}
    </svg>
  );
}
