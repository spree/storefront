"use server";

export async function finalizeRazorpaySession(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  const response = await fetch(
    `${process.env.SPREE_API_URL}/razorpay/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to verify Razorpay signature with backend.");
  }

  return await response.json();
}
