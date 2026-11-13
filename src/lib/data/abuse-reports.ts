"use server";

import { getClient, withAuthRefresh } from "@/lib/spree";
import { withFallback } from "./utils";

export async function getSellerAbuseReportReasons() {
  return withFallback(
    async () => {
      const client = getClient();
      return client.abuseReports.reasons("seller");
    },
    { data: [] },
  );
}

export async function getListingAbuseReportReasons() {
  return withFallback(async () => getClient().abuseReports.reasons("product"), {
    data: [],
  });
}

export async function reportListing(params: {
  productId: string;
  body: string;
  reasonId?: string;
}) {
  const payload = {
    subject_type: "product",
    subject_id: params.productId,
    body: params.body,
    reason_id: params.reasonId,
  } as const;

  return withAuthRefresh((authenticated) =>
    getClient().abuseReports.create(payload, authenticated),
  );
}

export async function getProductReviewAbuseReportReasons() {
  return withFallback(
    async () => {
      const client = getClient();
      return client.abuseReports.reasons("product_review");
    },
    { data: [] },
  );
}

export async function reportSellerShop(params: {
  sellerId: string;
  body: string;
  reasonId?: string;
  reporterEmail?: string;
}) {
  const payload = {
    subject_type: "seller" as const,
    subject_id: params.sellerId,
    body: params.body,
    reason_id: params.reasonId,
    reporter_email: params.reporterEmail,
  };

  return withAuthRefresh(async (options) => {
    return getClient().abuseReports.create(payload, options);
  });
}

export async function reportProductReview(params: {
  reviewId: string;
  body: string;
  reasonId?: string;
  reporterEmail?: string;
}) {
  return withAuthRefresh(async (options) =>
    getClient().abuseReports.create(
      {
        subject_type: "product_review",
        subject_id: params.reviewId,
        body: params.body,
        reason_id: params.reasonId,
        reporter_email: params.reporterEmail,
      },
      options,
    ),
  );
}
