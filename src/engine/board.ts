// Board de TradeRF: quotes del trader (precio en pantalla, selectivo o a todos),
// órdenes resting del cliente (tasa + lado), y ejecuciones (primer-pincha-opera).
// Transporte BroadcastChannel + localStorage (demo). Prod: Supabase Realtime.

export type Lado = "compra" | "venta";        // punta del cliente
export type Venue = "OTC" | "TR";             // TR = TeleRenta
export type Liquidacion = "PH" | "PM" | "CN"; // pago hoy / mañana / contado normal (T0/T1/T2)

export interface Quote {
  id: string; ts: number; traderId: string; traderName: string; papelId: string;
  bidRate?: number;      // dos puntas (bid > offer en tasa); o
  single?: number;       // una sola tasa ("un interés")
  offerRate?: number;
  montoRef: number;      // tamaño que muestra
  audience: "all" | string[]; // a todos o a clientes elegidos
  live: boolean;         // en pantalla; el trader la saca -> false
}

export interface Orden {
  id: string; ts: number; clientId: string; clientName: string; papelId: string;
  lado: Lado; venue: Venue; liquidacion: Liquidacion; monto: number; tasa: number;
  status: "resting" | "done" | "canceled";
}

export interface Fill {
  id: string; ts: number; quoteId?: string; papelId: string;
  clientId: string; clientName: string; lado: Lado; monto: number;
  tasaFill: number; precioRef: number; venue: Venue; liquidacion: Liquidacion;
}

export interface BoardState { quotes: Quote[]; ordenes: Orden[]; fills: Fill[]; }
const KEY = "traderf.board.v1";
const EMPTY: BoardState = { quotes: [], ordenes: [], fills: [] };

export class Board {
  private ch: BroadcastChannel | null = null;
  private listeners = new Set<(s: BoardState) => void>();
  constructor() {
    try { this.ch = new BroadcastChannel("traderf"); this.ch.onmessage = () => this.emit(); } catch { /* ignore */ }
    try { window.addEventListener("storage", (e) => { if (e.key === KEY) this.emit(); }); } catch { /* ignore */ }
  }
  state(): BoardState { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...EMPTY }; } }
  private write(s: BoardState) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
    try { this.ch?.postMessage("u"); } catch { /* ignore */ }
    this.emit();
  }
  postQuote(q: Quote) { const s = this.state(); s.quotes = [q, ...s.quotes].slice(0, 100); this.write(s); }
  pullQuote(id: string) { const s = this.state(); s.quotes = s.quotes.map((q) => q.id === id ? { ...q, live: false } : q); this.write(s); }
  addFill(f: Fill, quoteId?: string) {
    const s = this.state();
    s.fills = [f, ...s.fills].slice(0, 200);
    if (quoteId) s.quotes = s.quotes.map((q) => q.id === quoteId ? { ...q, live: false } : q);
    this.write(s);
  }
  postOrden(o: Orden) { const s = this.state(); s.ordenes = [o, ...s.ordenes].slice(0, 200); this.write(s); }
  setOrden(id: string, status: Orden["status"]) { const s = this.state(); s.ordenes = s.ordenes.map((o) => o.id === id ? { ...o, status } : o); this.write(s); }
  reset() { this.write({ ...EMPTY }); }
  subscribe(cb: (s: BoardState) => void) { this.listeners.add(cb); cb(this.state()); return () => { this.listeners.delete(cb); }; }
  private emit() { const s = this.state(); this.listeners.forEach((f) => f(s)); }
}

export function newId(p: string) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

export const LIQ_LABEL: Record<Liquidacion, string> = { PH: "Pago hoy (PH)", PM: "Pago mañana (PM)", CN: "Contado normal (CN)" };

/** ¿La quote es visible para este cliente? */
export function quoteVisible(q: Quote, clientId: string): boolean {
  if (!q.live) return false;
  return q.audience === "all" || q.audience.includes(clientId);
}
