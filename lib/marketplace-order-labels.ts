export function getMarketplaceOrderStatusLabel(status: string): string {
  switch (status) {
    case "PENDING":
      return "Reserved — payment due";
    case "PENDING_FULFILLMENT":
      return "Paid — fulfillment pending";
    case "COMPLETED":
      return "Complete";
    case "CANCELLED":
      return "Cancelled";
    case "FAILED":
      return "Failed";
    default:
      return status;
  }
}
