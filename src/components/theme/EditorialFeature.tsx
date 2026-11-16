import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import styles from "./editorial-storefront.module.css";

interface EditorialFeatureProps {
  campaign?: boolean;
  image: string;
  imageAlt?: string;
  imageOnLeft?: boolean;
  eyebrow: string;
  heading: string;
  body: string;
  href: string | null;
  linkLabel: string;
  newTab?: boolean;
  content?: ReactNode;
  alignment?: CSSProperties["textAlign"];
}

export function EditorialFeature({
  campaign,
  image,
  imageAlt = "",
  imageOnLeft,
  eyebrow,
  heading,
  body,
  href,
  linkLabel,
  newTab,
  content,
  alignment,
}: EditorialFeatureProps) {
  const Heading = campaign ? "h1" : "h2";

  return (
    <div
      className={styles.feature}
      data-editorial-campaign={campaign ? "" : undefined}
      data-editorial-image-left={imageOnLeft ? "" : undefined}
      data-editorial-has-image={image ? "" : undefined}
    >
      {image && (
        <div className={styles.featureImage}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            preload={campaign}
            unoptimized={!image.startsWith("/marketplace/")}
            sizes="(max-width: 767px) 100vw, (max-width: 1440px) 58vw, 770px"
          />
        </div>
      )}
      <div className={styles.featureCopy} style={{ textAlign: alignment }}>
        {content || (
          <>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <Heading data-editorial-heading>{heading}</Heading>
            {body && <p className={styles.featureBody}>{body}</p>}
            {href && linkLabel && (
              <Link
                className={styles.featureLink}
                href={href}
                target={newTab ? "_blank" : undefined}
                rel={newTab ? "noopener noreferrer" : undefined}
              >
                {linkLabel} <ArrowUpRight className="size-4" aria-hidden />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
