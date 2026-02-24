type PaymentResult = {
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  transactionRef: string;
  message?: string;
};

type PaymentInput = {
  method: "MOBILE_MONEY" | "BANK_TRANSFER";
  amount: number;
  currency?: string;
  transactionRef: string;
  recipient: {
    employeeId: string;
    mobileMoneyNumber?: string | null;
  };
};

export async function processPayment(input: PaymentInput): Promise<PaymentResult> {
  const provider = (process.env.PAYMENT_PROVIDER || "mock").toLowerCase();
  if (provider === "mock") {
    return {
      status: "SUCCESS",
      transactionRef: input.transactionRef,
      message: "Mock payment processed",
    };
  }

  if (provider === "disabled") {
    return {
      status: "SKIPPED",
      transactionRef: input.transactionRef,
      message: "Payment provider disabled",
    };
  }

  // Placeholder for real provider integrations
  return {
    status: "FAILED",
    transactionRef: input.transactionRef,
    message: "Payment provider not configured",
  };
}

export default { processPayment };
