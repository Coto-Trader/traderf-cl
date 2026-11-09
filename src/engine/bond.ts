import { Papel } from "../model/instruments";

const MS_YEAR = 365.25 * 86400000;

export function yearsTo(vencISO: string, today = new Date()): number {
  const v = new Date(vencISO + "T00:00:00Z").getTime();
  return Math.max(0, (v - today.getTime()) / MS_YEAR);
}

/**
 * Precio de referencia (% del par) desde la tasa (TIR, %). PV de cupones +
 * amortización al vencimiento, sin devengado (clean, aproximado). Es referencia
 * de pantalla; el cálculo fino (devengado, tabla de desarrollo, base) = etapa 2.
 */
export function precioDesdeTasa(papel: Papel, tasaPct: number, today = new Date()): number {
  const years = yearsTo(papel.vencimiento, today);
  const n = Math.max(1, Math.round(papel.freq * years));
  const c = papel.cuponPct / papel.freq;          // cupón por período (sobre 100 par)
  const y = tasaPct / 100 / papel.freq;           // tasa por período
  if (Math.abs(y) < 1e-9) return c * n + 100;
  const annuity = c * (1 - Math.pow(1 + y, -n)) / y;
  const redemption = 100 * Math.pow(1 + y, -n);
  return annuity + redemption;
}

/** Duración modificada aproximada (años), solo para color de pantalla. */
export function duracionAprox(papel: Papel, tasaPct: number, today = new Date()): number {
  const p0 = precioDesdeTasa(papel, tasaPct, today);
  const p1 = precioDesdeTasa(papel, tasaPct + 0.01, today);
  return Math.abs((p1 - p0) / p0) / 0.0001; // sensibilidad por 1bp -> años aprox
}
