"use server";

import { createHash } from "node:crypto";
import type { ListParams } from "@spree/sdk";
import { ensureFreshSession, getClient, withAuthRefresh } from "@/lib/spree";
import { withFallback } from "./utils";

export async function getMessageThreads(params?: ListParams) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().customer.messageThreads.list(params, options);
      });
    },
    {
      data: [],
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
    },
  );
}

export async function getUnreadMessageCount() {
  const page = await getMessageThreads({ limit: 50 });
  return page.data.filter((thread) => thread.unread).length;
}

export async function getMessageThread(id: string) {
  return withFallback(async () => {
    return withAuthRefresh(async (options) => {
      return getClient().customer.messageThreads.get(id, options);
    });
  }, null);
}

export async function getMessageThreadMessages(
  threadId: string,
  params?: ListParams,
) {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().customer.messageThreads.messages.list(
          threadId,
          params,
          options,
        );
      });
    },
    {
      data: [],
      meta: {
        page: 1,
        limit: 100,
        count: 0,
        pages: 0,
        from: 0,
        to: 0,
        in: 0,
        previous: null,
        next: null,
      },
    },
  );
}

export async function openMessageThread(params: {
  subject_type: "order" | "buyer_offer" | "custom_order_request";
  subject_id: string;
}) {
  return withAuthRefresh(async (options) => {
    return getClient().customer.messageThreads.create(params, options);
  });
}

export async function contactSeller(params: {
  seller_id: string;
  body: string;
}) {
  await ensureFreshSession();
  return withAuthRefresh(async (options) => {
    return getClient().customer.messageThreads.contactSeller(params, options);
  });
}

export async function askAboutProduct(params: {
  product_id: string;
  body: string;
}) {
  await ensureFreshSession();
  return withAuthRefresh(async (options) => {
    return getClient().customer.messageThreads.askAboutProduct(params, options);
  });
}

export async function sendMessageThreadReply(
  threadId: string,
  body: string,
  images?: string[],
) {
  return withAuthRefresh(async (options) => {
    return getClient().customer.messageThreads.messages.create(
      threadId,
      {
        body: body || undefined,
        images: images?.length ? images : undefined,
      },
      options,
    );
  });
}

/**
 * Presign + PUT a private image for a message attachment. Returns the signed
 * blob id to pass as `images` on message create.
 */
export async function uploadMessageImage(formData: FormData) {
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

export async function reportMessageThread(params: {
  threadId: string;
  body: string;
  reasonId?: string;
}) {
  return withAuthRefresh(async (options) => {
    return getClient().abuseReports.create(
      {
        subject_type: "message_thread",
        subject_id: params.threadId,
        body: params.body,
        reason_id: params.reasonId,
      },
      options,
    );
  });
}

export async function reportMessage(params: {
  messageId: string;
  body: string;
  reasonId?: string;
}) {
  return withAuthRefresh(async (options) => {
    return getClient().abuseReports.create(
      {
        subject_type: "message",
        subject_id: params.messageId,
        body: params.body,
        reason_id: params.reasonId,
      },
      options,
    );
  });
}

export async function getAbuseReportReasons() {
  return withFallback(
    async () => {
      return withAuthRefresh(async (options) => {
        return getClient().abuseReports.reasons("message_thread", options);
      });
    },
    { data: [] },
  );
}

export async function markMessageThreadRead(threadId: string) {
  return withAuthRefresh(async (options) => {
    return getClient().customer.messageThreads.markRead(threadId, options);
  });
}
