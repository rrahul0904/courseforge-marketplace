export function refundOutcome({ netCents, amountRefundedCents }) {
  if (!Number.isInteger(netCents) || netCents < 0) throw new Error("netCents must be a non-negative integer");
  if (!Number.isInteger(amountRefundedCents) || amountRefundedCents < 0) throw new Error("amountRefundedCents must be a non-negative integer");
  const refundedCents = Math.min(amountRefundedCents, netCents);
  return {
    refundedCents,
    status: refundedCents >= netCents && netCents > 0 ? "REFUNDED" : refundedCents > 0 ? "PARTIALLY_REFUNDED" : "PAID",
    revokeEntitlements: refundedCents >= netCents && netCents > 0
  };
}
