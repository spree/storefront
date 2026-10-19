import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = {
  dataRequests: {
    get: vi.fn(),
    confirm: vi.fn(),
  },
};

vi.mock("@/lib/spree", () => ({
  getClient: () => mockClient,
}));

import { confirmDataRequest, getDataRequest } from "../data-requests";

const dataRequest = {
  id: "dsr_UkLWZg9DAJ",
  number: "DSR1001",
  kind: "erasure",
  status: "awaiting_confirmation",
};

describe("data requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("looks the request up by its emailed token", async () => {
    mockClient.dataRequests.get.mockResolvedValue(dataRequest);

    await expect(getDataRequest("signed-token")).resolves.toEqual(dataRequest);
    expect(mockClient.dataRequests.get).toHaveBeenCalledWith("signed-token");
  });

  it("answers null for a token Spree does not recognise", async () => {
    mockClient.dataRequests.get.mockRejectedValue(new Error("not found"));

    await expect(getDataRequest("bad-token")).resolves.toBeNull();
  });

  it("confirms the request with the token", async () => {
    mockClient.dataRequests.confirm.mockResolvedValue({
      ...dataRequest,
      status: "pending",
    });

    const result = await confirmDataRequest("signed-token");

    expect(result).toEqual({
      success: true,
      dataRequest: { ...dataRequest, status: "pending" },
    });
  });

  it("reports why a confirmation failed", async () => {
    mockClient.dataRequests.confirm.mockRejectedValue(
      new Error("This confirmation link has expired or is no longer valid"),
    );

    const result = await confirmDataRequest("old-token");

    expect(result).toEqual({
      success: false,
      error: "This confirmation link has expired or is no longer valid",
    });
  });
});
