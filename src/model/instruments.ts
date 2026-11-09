// Papeles de renta fija (Chile). Semilla. El nombre corto (nemotécnico) resuelve
// el instrumento y su régimen de impuesto.

export type Moneda = "CLP" | "UF";
export type Impuesto = "art104" | "afecto"; // Art. 104 = exento de retención

export interface Papel {
  id: string;
  nemo: string;          // nombre corto
  name: string;
  moneda: Moneda;
  cuponPct: number;      // cupón anual (%)
  freq: number;          // cupones por año (2 = semestral)
  vencimiento: string;   // ISO
  impuesto: Impuesto;
}

export const PAPELES: Papel[] = [
  { id: "btp32", nemo: "BTP0450332", name: "Tesorería $ 4,5% 2032", moneda: "CLP", cuponPct: 4.5, freq: 2, vencimiento: "2032-03-01", impuesto: "art104" },
  { id: "btu44", nemo: "BTU0290444", name: "Tesorería UF 2,9% 2044", moneda: "UF", cuponPct: 2.9, freq: 2, vencimiento: "2044-04-01", impuesto: "art104" },
  { id: "bcp29", nemo: "BCP0500329", name: "Banco Central $ 5,0% 2029", moneda: "CLP", cuponPct: 5.0, freq: 2, vencimiento: "2029-03-01", impuesto: "art104" },
  { id: "bcu39", nemo: "BCU0280439", name: "Banco Central UF 2,8% 2039", moneda: "UF", cuponPct: 2.8, freq: 2, vencimiento: "2039-04-01", impuesto: "art104" },
  { id: "corp30", nemo: "BANCORP30", name: "Bono bancario afecto 5,2% 2030", moneda: "CLP", cuponPct: 5.2, freq: 2, vencimiento: "2030-06-01", impuesto: "afecto" },
];

/** Resuelve un papel por nombre corto (nemo), id o parte del nombre. */
export function resolverPapel(q: string): Papel | null {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  return (
    PAPELES.find((p) => p.nemo.toLowerCase() === s || p.id === s) ??
    PAPELES.find((p) => p.nemo.toLowerCase().startsWith(s)) ??
    PAPELES.find((p) => p.name.toLowerCase().includes(s)) ??
    null
  );
}

export const impuestoLabel = (i: Impuesto) => (i === "art104" ? "Art. 104 (exento)" : "Afecto");
