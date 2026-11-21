import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@adyen/adyen-web/styles/adyen.css", () => ({}));

const checkoutOptions = vi.fn();
const register = vi.fn();
const mount = vi.fn();
const unmount = vi.fn();
const dropinOptions = vi.fn();
const dropinSubmit = vi.fn();
const showValidation = vi.fn();
const dropinState = { activePaymentMethod: {} as unknown, isValid: true };

vi.mock("@adyen/adyen-web", () => {
  const AdyenCheckout = Object.assign(
    async (options: Record<string, unknown>) => {
      checkoutOptions(options);
      return { options, update: vi.fn() };
    },
    { register },
  );
  class Dropin {
    constructor(_checkout: unknown, options: Record<string, unknown>) {
      dropinOptions(options);
    }
    mount = mount;
    unmount = unmount;
    submit = dropinSubmit;
    showValidation = showValidation;
    get activePaymentMethod() {
      return dropinState.activePaymentMethod;
    }
    get isValid() {
      return dropinState.isValid;
    }
  }
  const component = (name: string) => ({ name });
  return {
    AdyenCheckout,
    Dropin,
    Card: component("Card"),
    GooglePay: component("GooglePay"),
    ApplePay: component("ApplePay"),
    PayPal: component("PayPal"),
    Klarna: component("Klarna"),
    Bancontact: component("Bancontact"),
    Redirect: component("Redirect"),
    Giftcard: component("Giftcard"),
  };
});

import {
  ADYEN_DROPIN_COMPONENTS,
  AdyenPaymentForm,
} from "@/components/checkout/AdyenPaymentForm";

function renderForm(
  props: Partial<Parameters<typeof AdyenPaymentForm>[0]> = {},
) {
  return render(
    <AdyenPaymentForm
      sessionId="CS1234"
      sessionData="Ab02b4c0!SESSION"
      clientKey="test_SESSIONKEY"
      environment="live"
      onReady={vi.fn()}
      onBeforeSubmit={vi.fn().mockResolvedValue("Ab02b4c0!PAYABLE")}
      onApproved={vi.fn()}
      onFailed={vi.fn()}
      {...props}
    />,
  );
}

async function adyenOptions() {
  await waitFor(() => expect(checkoutOptions).toHaveBeenCalled());
  return checkoutOptions.mock.calls.at(-1)?.[0] as Record<string, any>;
}

describe("AdyenPaymentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dropinState.activePaymentMethod = {};
    dropinState.isValid = true;
  });

  it("loads Drop-in with the session's client key and environment", async () => {
    renderForm();

    const options = await adyenOptions();
    expect(options.clientKey).toBe("test_SESSIONKEY");
    expect(options.environment).toBe("live");
    expect(options.session).toEqual({
      id: "CS1234",
      sessionData: "Ab02b4c0!SESSION",
    });
  });

  it("registers no gift card component", async () => {
    renderForm();

    await adyenOptions();
    expect(ADYEN_DROPIN_COMPONENTS).not.toContain("Giftcard");
    const registered = register.mock.calls[0].map(
      (component: { name: string }) => component.name,
    );
    expect(registered).toEqual([...ADYEN_DROPIN_COMPONENTS]);
    expect(
      dropinOptions.mock.calls[0][0].paymentMethodComponents.map(
        (component: { name: string }) => component.name,
      ),
    ).not.toContain("Giftcard");
  });

  it("makes the session payable before paying, resolving with the new session data", async () => {
    const onBeforeSubmit = vi.fn().mockResolvedValue("Ab02b4c0!PAYABLE");
    renderForm({ onBeforeSubmit });
    const options = await adyenOptions();
    const actions = { resolve: vi.fn(), reject: vi.fn() };

    options.beforeSubmit({ paymentMethod: { type: "scheme" } }, {}, actions);

    await waitFor(() =>
      expect(actions.resolve).toHaveBeenCalledWith({
        paymentMethod: { type: "scheme" },
        sessionData: "Ab02b4c0!PAYABLE",
      }),
    );
    expect(onBeforeSubmit).toHaveBeenCalledTimes(1);
    expect(actions.reject).not.toHaveBeenCalled();
  });

  it("rejects the payment when Spree refuses to make the session payable", async () => {
    renderForm({
      onBeforeSubmit: vi
        .fn()
        .mockRejectedValue(new Error("Payment session can no longer be paid")),
    });
    const options = await adyenOptions();
    const actions = { resolve: vi.fn(), reject: vi.fn() };

    options.beforeSubmit({}, {}, actions);

    await waitFor(() => expect(actions.reject).toHaveBeenCalled());
    expect(actions.resolve).not.toHaveBeenCalled();
    expect(
      await screen.findByText("Payment session can no longer be paid"),
    ).toBeTruthy();
  });

  it("keeps Drop-in mounted after a failed payment, for another try", async () => {
    const onApproved = vi.fn();
    renderForm({ onApproved });
    const options = await adyenOptions();
    await waitFor(() => expect(mount).toHaveBeenCalled());

    options.onPaymentCompleted({ resultCode: "Refused" });

    expect(
      await screen.findByText("Payment refused. Please try again."),
    ).toBeTruthy();
    expect(onApproved).not.toHaveBeenCalled();
    expect(unmount).not.toHaveBeenCalled();
  });

  it("hands the session result on when Adyen authorises the payment", async () => {
    const onApproved = vi.fn();
    renderForm({ onApproved });
    const options = await adyenOptions();

    options.onPaymentCompleted({
      resultCode: "Authorised",
      sessionResult: "RESULT",
    });

    expect(onApproved).toHaveBeenCalledWith("RESULT");
    expect(unmount).not.toHaveBeenCalled();
  });

  describe("an attempt that ends without a payment", () => {
    async function loadedForm(onFailed = vi.fn()) {
      let handle: { confirmPayment: (url: string) => Promise<unknown> } | null =
        null;
      renderForm({
        onFailed,
        onReady: (h) => {
          handle = h;
        },
      });
      const options = await adyenOptions();
      await waitFor(() => expect(handle).not.toBeNull());
      return { options, handle: handle!, onFailed };
    }

    it("shows Drop-in's field errors without submitting, and reports it", async () => {
      const { handle, onFailed } = await loadedForm();
      dropinState.isValid = false;

      await expect(
        handle.confirmPayment("https://shop/return"),
      ).resolves.toEqual({});

      expect(showValidation).toHaveBeenCalled();
      expect(dropinSubmit).not.toHaveBeenCalled();
      expect(onFailed).toHaveBeenCalledExactlyOnceWith("invalid");
    });

    it("submits valid fields without reporting a failure", async () => {
      const { handle, onFailed } = await loadedForm();

      await handle.confirmPayment("https://shop/return");

      expect(dropinSubmit).toHaveBeenCalled();
      expect(onFailed).not.toHaveBeenCalled();
    });

    it("reports a refused payment, a failed one and an error", async () => {
      const { options, onFailed } = await loadedForm();

      options.onPaymentCompleted({ resultCode: "Refused" });
      options.onPaymentFailed({ resultCode: "Error" });
      options.onError(new Error("Wallet sheet closed"));

      expect(onFailed).toHaveBeenCalledTimes(3);
      expect(onFailed.mock.calls).toEqual([["ended"], ["ended"], ["ended"]]);
    });

    it("reports Spree refusing to make the session payable", async () => {
      const onFailed = vi.fn();
      renderForm({
        onFailed,
        onBeforeSubmit: vi.fn().mockRejectedValue(new Error("Amount changed")),
      });
      const options = await adyenOptions();
      const actions = { resolve: vi.fn(), reject: vi.fn() };

      options.beforeSubmit({}, {}, actions);

      await waitFor(() =>
        expect(onFailed).toHaveBeenCalledExactlyOnceWith("ended"),
      );
      expect(actions.reject).toHaveBeenCalled();
    });
  });
});
