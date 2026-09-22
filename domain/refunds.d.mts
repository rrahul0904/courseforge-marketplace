export function refundOutcome(input: { netCents: number; amountRefundedCents: number }): { refundedCents: number; status: "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED"; revokeEntitlements: boolean };
