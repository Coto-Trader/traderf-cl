# TradeRF — Diseño

Pantalla de **renta fija** de la Suite TradeAI (traderf.cl): órdenes de cliente y
board de tasas del trader. Es TradeFX con ADN de bonos.

## Orden de cliente
- **Lugar:** OTC o **TR (TeleRenta)**.
- **Liquidación:** PH (pago hoy, T0) · PM (pago mañana, T1) · CN (contado normal, T2).
- **Punta:** compra / venta.
- **Papel:** nombre corto (nemotécnico) que resuelve el instrumento **y su régimen
  de impuesto** (Art. 104 exento vs afecto). Semilla: BTP, BTU, BCP, BCU + un afecto.
- **Monto** nominal.

## Precio
- Se cotiza en **tasa (TIR)**: dos puntas (**bid > offer** en tasa) o una sola tasa.
- **Precio de referencia (% par)** derivado de la tasa: PV de cupones + amortización
  (`engine/bond.ts`, clean, aproximado). El cálculo fino (devengado, tabla de
  desarrollo, base, impuesto bruto-neto) = etapa 2 ("el intermedio").

## Mecánica (board)
- El **trader deja precio en pantalla**, **selectivo** (clientes elegidos) o **a
  todos**; puede **sacarlo** (pull).
- **Primer-pincha-opera:** el primer cliente que pega consume la quote (fill).
- El **cliente deja su orden** (tasa + lado) **resting**; la mesa la trabaja/ejecuta.

## Arquitectura
Demo: React estático (tema suite) + `Board` (BroadcastChannel + localStorage),
rol trader/cliente en la misma app (dos ventanas sincronizan). Prod: Supabase
(Auth + Realtime) + feed real (precios/láminas).

## Verificado (demo)
Nombre corto resuelve papel + impuesto; precio desde TIR con convención correcta
(bid tasa > offer tasa ⇒ precio inverso); quote selectiva (A ve, B no);
primer-pincha-opera (quote consumida); fill con precio ref derivado.

## Siguiente
Cálculo fino (devengado/tabla de desarrollo, impuesto), matching de órdenes,
feed real de mercado, confirmaciones + TradeChat, Supabase, y deploy a traderf.cl.
