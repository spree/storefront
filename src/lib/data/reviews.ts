"use server";

import { createHash } from "node:crypto";
import type {
  CreateProductReviewParams,
  ListParams,
  ProductReview,
  UpdateProductReviewParams,
} from "@spree/sdk";
import { getClient, getLocaleOptions, withAuthRefresh } from "@/lib/spree";
import { withFallback } from "./utils";

const emptyPage = {
  data: [] as ProductReview[],
  meta: {
    page: 1,
    limit: 25,
    count: 0,
    pages: 0,
    from: 0,
    to: 0,
    in: 0,
    previous: null,
    next: null,
  },
};

export async function getProductReviews(
  productIdOrSlug: string,
  params?: ListParams & {
    sort?: "newest" | "highest" | "lowest" | "most_helpful";
    q?: Record<string, string | number | boolean>;
  },
) {
  const client = getClient();
  const reviews = client.products && Reflect.get(client.products, "reviews");
  if (!reviews || typeof Reflect.get(reviews, "list") !== "function") {
    warnMissingReviewMethod("products");
    return emptyPage;
  }
  return withFallback(
    async () => reviews.list(productIdOrSlug, params),
    emptyPage,
  );
}

export async function getSellerReviews(
  sellerIdOrSlug: string,
  page = 1,
  limit = 10,
  sort?: string,
) {
  const client = getClient();
  const reviews = client.sellers && Reflect.get(client.sellers, "reviews");
  if (!reviews || typeof Reflect.get(reviews, "list") !== "function") {
    warnMissingReviewMethod("sellers");
    return emptyPage;
  }
  const options = await getLocaleOptions();
  const namedSort =
    sort === "newest" || sort === "highest" || sort === "lowest"
      ? sort
      : undefined;
  return withFallback(
    async () =>
      reviews.list(
        sellerIdOrSlug,
        { page, limit, ...(namedSort ? { sort: namedSort } : {}) },
        options,
      ),
    emptyPage,
  );
}

function warnMissingReviewMethod(resource: "products" | "sellers") {
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `The installed @spree/sdk does not expose ${resource}.reviews.list; showing no reviews.`,
    );
  }
}

export async function getMyProductReviews(params?: ListParams) {
  const customer = getClient().customer;
  const productReviews = customer && Reflect.get(customer, "productReviews");
  const list = productReviews && Reflect.get(productReviews, "list");
  if (typeof list !== "function") return emptyPage;

  return withFallback(
    async () =>
      withAuthRefresh(async (options) =>
        list.call(productReviews, params ? { ...params } : undefined, options),
      ),
    emptyPage,
  );
}

export async function getReviewablePurchases() {
  const customer = getClient().customer;
  const reviewablePurchases =
    customer && Reflect.get(customer, "reviewablePurchases");
  const list = reviewablePurchases && Reflect.get(reviewablePurchases, "list");
  if (typeof list !== "function") return { data: [], meta: { count: 0 } };

  return withFallback(
    async () =>
      withAuthRefresh(async (options) =>
        list.call(reviewablePurchases, options),
      ),
    { data: [], meta: { count: 0 } },
  );
}

export async function createProductReview(params: CreateProductReviewParams) {
  return withAuthRefresh(async (options) =>
    getClient().customer.productReviews.create(params, options),
  );
}

export async function updateProductReview(
  id: string,
  params: UpdateProductReviewParams,
) {
  return withAuthRefresh(async (options) =>
    getClient().customer.productReviews.update(id, params, options),
  );
}

export async function uploadReviewMedia(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("missing_file");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("md5").update(buffer).digest("base64");

  return withAuthRefresh(async (options) => {
    const client = getClient();
    const upload = await client.customer.directUploads.create(
      {
        blob: {
          filename: file.name,
          byte_size: file.size,
          checksum,
          content_type: file.type || "application/octet-stream",
        },
      },
      options,
    );

    const put = await fetch(upload.direct_upload.url, {
      method: "PUT",
      headers: upload.direct_upload.headers,
      body: buffer,
    });
    if (!put.ok) {
      throw new Error(`upload_failed_${put.status}`);
    }

    return upload.signed_id;
  });
}
