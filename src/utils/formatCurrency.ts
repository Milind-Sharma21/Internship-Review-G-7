const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

export default function formatCurrency(amount: number): string {
  return usdFormatter.format(amount);
}
