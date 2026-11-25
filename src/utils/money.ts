export function parsePesoAmount(value: string): number | null {
  const normalized = value.trim().replace(/,/g, '');
  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  const centavos = Math.round(amount * 100);
  return Number.isSafeInteger(centavos) ? centavos : null;
}

export function formatCentavos(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
}
