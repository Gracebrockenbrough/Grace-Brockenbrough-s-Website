/** Public tracking pages. Live status inside Tote needs carrier integrations (future). */
export function trackingUrl(carrier: string | null, number: string): string | null {
  const n = encodeURIComponent(number);
  switch ((carrier ?? "").toUpperCase()) {
    case "UPS":
      return `https://www.ups.com/track?tracknum=${n}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case "FEDEX":
      return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    default:
      return null;
  }
}
