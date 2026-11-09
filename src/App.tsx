import { useEffect, useMemo, useRef, useState } from "react";
import { Board, Fill, Lado, Liquidacion, LIQ_LABEL, newId, Orden, Quote, quoteVisible, Venue } from "./engine/board";
import { precioDesdeTasa } from "./engine/bond";
import { impuestoLabel, PAPELES, resolverPapel } from "./model/instruments";

const CLIENTS = [
  { id: "A", name: "Cliente A" },
  { id: "INST", name: "AFP Institucional" },
  { id: "B", name: "Cliente B" },
];
const papelById = (id: string) => PAPELES.find((p) => p.id === id)!;
const fmtRate = (n?: number) => (n == null ? "–" : n.toFixed(2));
const fmtPx = (n: number) => n.toFixed(3);
const fmtMonto = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 0 });

export function App() {
  const [role, setRole] = useState<"trader" | "cliente">("trader");
  const [clientId, setClientId] = useState("A");
  const traderId = "t1"; const traderName = "Trader Uno";
  const boardRef = useRef<Board>(new Board());
  const [st, setSt] = useState(boardRef.current.state());
  useEffect(() => boardRef.current.subscribe(setSt), []);

  const clientName = CLIENTS.find((c) => c.id === clientId)?.name ?? clientId;

  // --- trader: dejar precio ---
  const [qPapel, setQPapel] = useState("btu44");
  const [qMode, setQMode] = useState<"two" | "one">("two");
  const [qBid, setQBid] = useState("2.95");
  const [qOffer, setQOffer] = useState("2.93");
  const [qOne, setQOne] = useState("2.94");
  const [qMonto, setQMonto] = useState("1000");
  const [qAll, setQAll] = useState(true);
  const [qAud, setQAud] = useState<string[]>([]);

  function mostrar() {
    const q: Quote = {
      id: newId("q"), ts: Date.now(), traderId, traderName, papelId: qPapel,
      montoRef: parseFloat(qMonto) || 0, audience: qAll ? "all" : qAud, live: true,
      ...(qMode === "two" ? { bidRate: parseFloat(qBid), offerRate: parseFloat(qOffer) } : { single: parseFloat(qOne) }),
    };
    boardRef.current.postQuote(q);
  }
  function ejecutarOrden(o: Orden) {
    const p = papelById(o.papelId);
    const f: Fill = {
      id: newId("f"), ts: Date.now(), papelId: o.papelId, clientId: o.clientId, clientName: o.clientName,
      lado: o.lado, monto: o.monto, tasaFill: o.tasa, precioRef: precioDesdeTasa(p, o.tasa), venue: o.venue, liquidacion: o.liquidacion,
    };
    boardRef.current.addFill(f);
    boardRef.current.setOrden(o.id, "done");
  }

  // --- cliente: ticket ---
  const [query, setQuery] = useState("BTU");
  const papel = useMemo(() => resolverPapel(query), [query]);
  const [lado, setLado] = useState<Lado>("compra");
  const [venue, setVenue] = useState<Venue>("OTC");
  const [liq, setLiq] = useState<Liquidacion>("CN");
  const [monto, setMonto] = useState("1000");
  const [tasa, setTasa] = useState("2.94");
  const precioRef = papel && isFinite(parseFloat(tasa)) ? precioDesdeTasa(papel, parseFloat(tasa)) : null;

  function dejarOrden() {
    if (!papel) return;
    const o: Orden = {
      id: newId("o"), ts: Date.now(), clientId, clientName, papelId: papel.id,
      lado, venue, liquidacion: liq, monto: parseFloat(monto) || 0, tasa: parseFloat(tasa), status: "resting",
    };
    boardRef.current.postOrden(o);
  }
  function pegar(q: Quote, side: Lado) {
    const p = papelById(q.papelId);
    const tasaFill = side === "compra" ? (q.offerRate ?? q.single) : (q.bidRate ?? q.single);
    if (tasaFill == null) return;
    const f: Fill = {
      id: newId("f"), ts: Date.now(), quoteId: q.id, papelId: q.papelId, clientId, clientName,
      lado: side, monto: q.montoRef, tasaFill, precioRef: precioDesdeTasa(p, tasaFill), venue, liquidacion: liq,
    };
    boardRef.current.addFill(f, q.id);
  }

  const myQuotes = st.quotes.filter((q) => q.live && q.traderId === traderId);
  const resting = st.ordenes.filter((o) => o.status === "resting");
  const visibleQuotes = st.quotes.filter((q) => quoteVisible(q, clientId));
  const myOrders = st.ordenes.filter((o) => o.clientId === clientId);
  const fills = role === "trader" ? st.fills : st.fills.filter((f) => f.clientId === clientId);

  const rateBoxes = (q: Quote) => {
    const p = papelById(q.papelId);
    if (q.single != null) return (
      <div className="rates"><div className="ratebox"><div className="k">Tasa</div><div className="v">{fmtRate(q.single)}</div><div className="px">ref {fmtPx(precioDesdeTasa(p, q.single))}</div></div></div>
    );
    return (
      <div className="rates">
        <div className="ratebox bid"><div className="k">Bid (vendés)</div><div className="v">{fmtRate(q.bidRate)}</div><div className="px">ref {fmtPx(precioDesdeTasa(p, q.bidRate!))}</div></div>
        <div className="ratebox offer"><div className="k">Offer (comprás)</div><div className="v">{fmtRate(q.offerRate)}</div><div className="px">ref {fmtPx(precioDesdeTasa(p, q.offerRate!))}</div></div>
      </div>
    );
  };

  return (
    <>
      <div className="ribbon">
        <a href="https://tradeai.cl" target="_blank" rel="noreferrer">Suite TradeAI ↗</a><span className="sep">|</span>
        <a href="https://tradefx.cl" target="_blank" rel="noreferrer">TradeFX ↗</a><span className="sep">|</span>
        <span className="here">TradeRF</span><span className="spacer" />
        <div className="seg">
          <button className={role === "trader" ? "on" : ""} onClick={() => setRole("trader")}>Trader</button>
          <button className={role === "cliente" ? "on" : ""} onClick={() => setRole("cliente")}>Cliente</button>
        </div>
      </div>
      <div className="header">
        <h1>Trade<span className="accent">RF</span> · Renta Fija</h1>
        <div className="sub">Órdenes OTC / TeleRenta · PH·PM·CN · board de tasas · primer-pincha-opera · precio de referencia desde la TIR</div>
      </div>

      <div className="main">
        <div className="idbar">
          <span className="lbl">Rol</span><span className="role">{role === "trader" ? traderName + " · mesa" : clientName + " · cliente"}</span>
          {role === "cliente" && (<><span className="lbl">soy</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>{CLIENTS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></>)}
          <span className="spacer" /><span className="mono muted" style={{ fontSize: 11 }}>abrí otra ventana como el otro rol para ver el flujo</span>
        </div>

        {role === "trader" ? (
          <>
            <div className="panel">
              <div className="panel-head"><h2>Dejar precio en pantalla</h2><span className="hint">tasa (TIR) · selectivo o a todos</span></div>
              <div className="panel-body">
                <div className="grid c4" style={{ marginBottom: 10 }}>
                  <label className="field"><span className="lbl">Papel</span>
                    <select value={qPapel} onChange={(e) => setQPapel(e.target.value)}>{PAPELES.map((p) => <option key={p.id} value={p.id}>{p.nemo} · {p.name}</option>)}</select></label>
                  <label className="field"><span className="lbl">Cotización</span>
                    <div className="seg"><button className={qMode === "two" ? "on" : ""} onClick={() => setQMode("two")}>Dos puntas</button><button className={qMode === "one" ? "on" : ""} onClick={() => setQMode("one")}>Una tasa</button></div></label>
                  {qMode === "two" ? (<>
                    <label className="field"><span className="lbl">Bid</span><input type="number" step="0.01" value={qBid} onChange={(e) => setQBid(e.target.value)} /></label>
                    <label className="field"><span className="lbl">Offer</span><input type="number" step="0.01" value={qOffer} onChange={(e) => setQOffer(e.target.value)} /></label>
                  </>) : (<label className="field"><span className="lbl">Tasa</span><input type="number" step="0.01" value={qOne} onChange={(e) => setQOne(e.target.value)} /></label>)}
                </div>
                <div className="grid c2" style={{ marginBottom: 10 }}>
                  <label className="field"><span className="lbl">Monto ref</span><input type="number" value={qMonto} onChange={(e) => setQMonto(e.target.value)} /></label>
                  <label className="field"><span className="lbl">Mostrar a</span>
                    <div className="chips">
                      <span className={`chip ${qAll ? "on" : ""}`} onClick={() => setQAll(true)}>Todos</span>
                      {CLIENTS.map((c) => <span key={c.id} className={`chip ${!qAll && qAud.includes(c.id) ? "on" : ""}`} onClick={() => { setQAll(false); setQAud((a) => a.includes(c.id) ? a.filter((x) => x !== c.id) : [...a, c.id]); }}>{c.name}</span>)}
                    </div></label>
                </div>
                <button className="btn primary" onClick={mostrar}>Mostrar en pantalla ▸</button>
              </div>
            </div>

            <div className="cols">
              <div className="panel">
                <div className="panel-head"><h2>Mis precios en pantalla</h2><span className="hint">{myQuotes.length}</span></div>
                <div className="panel-body">
                  {myQuotes.length === 0 ? <div className="empty">Sin precios mostrados.</div> : myQuotes.map((q) => (
                    <div key={q.id} className="quote-card">
                      <div className="top"><span className="nemo">{papelById(q.papelId).nemo}</span><span className="dim">{fmtMonto(q.montoRef)}</span>
                        <span className={`badge ${q.audience === "all" ? "all" : ""}`}>{q.audience === "all" ? "a todos" : (q.audience as string[]).map((id) => CLIENTS.find((c) => c.id === id)?.name).join(", ")}</span>
                        <span className="spacer" /><button className="btn ghost danger" onClick={() => boardRef.current.pullQuote(q.id)}>Sacar</button></div>
                      {rateBoxes(q)}
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-head"><h2>Órdenes de clientes</h2><span className="hint">dejan tasa + lado · las trabajás</span></div>
                <div className="panel-body" style={{ overflowX: "auto" }}>
                  {resting.length === 0 ? <div className="empty">Sin órdenes.</div> : (
                    <table className="tbl"><thead><tr><th>Cliente</th><th>Papel</th><th>Lado</th><th>Liq</th><th className="num">Monto</th><th className="num">Tasa</th><th></th></tr></thead>
                      <tbody>{resting.map((o) => (
                        <tr key={o.id}><td>{o.clientName}</td><td className="dim">{papelById(o.papelId).nemo}</td>
                          <td className={o.lado === "compra" ? "pos" : "neg"}>{o.lado}</td><td className="dim">{o.liquidacion} · {o.venue}</td>
                          <td className="num">{fmtMonto(o.monto)}</td><td className="num">{fmtRate(o.tasa)}</td>
                          <td><button className="btn primary" onClick={() => ejecutarOrden(o)}>Ejecutar</button></td></tr>
                      ))}</tbody></table>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="panel">
              <div className="panel-head"><h2>Orden</h2><span className="hint">nombre corto resuelve papel + impuesto</span></div>
              <div className="panel-body">
                <div className="grid c3" style={{ marginBottom: 10 }}>
                  <label className="field"><span className="lbl">Papel (nombre corto)</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="BTU / BTP / BCP…" /></label>
                  <label className="field"><span className="lbl">Lado (punta)</span><div className="seg"><button className={lado === "compra" ? "on" : ""} onClick={() => setLado("compra")}>Compra</button><button className={lado === "venta" ? "on" : ""} onClick={() => setLado("venta")}>Venta</button></div></label>
                  <label className="field"><span className="lbl">Lugar</span><div className="seg"><button className={venue === "OTC" ? "on" : ""} onClick={() => setVenue("OTC")}>OTC</button><button className={venue === "TR" ? "on" : ""} onClick={() => setVenue("TR")}>TeleRenta</button></div></label>
                </div>
                <div className="grid c3" style={{ marginBottom: 10 }}>
                  <label className="field"><span className="lbl">Liquidación</span><div className="seg">{(["PH", "PM", "CN"] as Liquidacion[]).map((l) => <button key={l} className={liq === l ? "on" : ""} onClick={() => setLiq(l)}>{l}</button>)}</div></label>
                  <label className="field"><span className="lbl">Monto nominal</span><input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} /></label>
                  <label className="field"><span className="lbl">Tasa (TIR %)</span><input type="number" step="0.01" value={tasa} onChange={(e) => setTasa(e.target.value)} /></label>
                </div>
                {papel ? (
                  <div className="resolved">
                    Resuelto: <b>{papel.nemo}</b> · {papel.name} · <b>{papel.moneda}</b> · cupón {papel.cuponPct}% · <span className={`badge ${papel.impuesto === "art104" ? "exento" : "afecto"}`}>{impuestoLabel(papel.impuesto)}</span>
                    &nbsp;·&nbsp; precio ref <b>{precioRef != null ? fmtPx(precioRef) : "–"}</b> (a {fmtRate(parseFloat(tasa))}) · {LIQ_LABEL[liq]}
                  </div>
                ) : <div className="resolved neg">No se encontró el papel "{query}".</div>}
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <button className="btn primary" onClick={dejarOrden} disabled={!papel}>Dejar mi orden (tasa + lado)</button>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Precios en pantalla para mí</h2><span className="hint">el primero que pincha, opera</span></div>
              <div className="panel-body">
                {visibleQuotes.length === 0 ? <div className="empty">La mesa no te está mostrando precios ahora.</div> : visibleQuotes.map((q) => (
                  <div key={q.id} className="quote-card">
                    <div className="top"><span className="nemo">{papelById(q.papelId).nemo}</span><span className="dim">{papelById(q.papelId).name}</span><span className="dim">· {fmtMonto(q.montoRef)}</span>
                      <span className="spacer" /><span className="badge live">en vivo</span></div>
                    {rateBoxes(q)}
                    <div className="btn-row" style={{ marginTop: 9, justifyContent: "flex-end" }}>
                      <button className="btn" onClick={() => pegar(q, "venta")}>Vender @ bid</button>
                      <button className="btn primary" onClick={() => pegar(q, "compra")}>Comprar @ offer</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <div className="panel-head"><h2>Mis órdenes</h2></div>
              <div className="panel-body" style={{ overflowX: "auto" }}>
                {myOrders.length === 0 ? <div className="empty">Sin órdenes.</div> : (
                  <table className="tbl"><thead><tr><th>Papel</th><th>Lado</th><th>Liq</th><th className="num">Monto</th><th className="num">Tasa</th><th>Estado</th></tr></thead>
                    <tbody>{myOrders.map((o) => (<tr key={o.id}><td className="dim">{papelById(o.papelId).nemo}</td><td className={o.lado === "compra" ? "pos" : "neg"}>{o.lado}</td><td className="dim">{o.liquidacion}·{o.venue}</td><td className="num">{fmtMonto(o.monto)}</td><td className="num">{fmtRate(o.tasa)}</td><td><span className={`badge ${o.status === "done" ? "live" : o.status === "resting" ? "" : "off"}`}>{o.status === "done" ? "ejecutada" : o.status}</span></td></tr>))}</tbody></table>
                )}
              </div>
            </div>
          </>
        )}

        <div className="panel">
          <div className="panel-head"><h2>Operado {role === "trader" ? "· blotter" : "· mis operaciones"}</h2><span className="hint">{fills.length}</span></div>
          <div className="panel-body" style={{ overflowX: "auto" }}>
            {fills.length === 0 ? <div className="empty">Sin operaciones.</div> : (
              <table className="tbl"><thead><tr><th>Hora</th><th>Cliente</th><th>Papel</th><th>Lado</th><th>Lugar·Liq</th><th className="num">Monto</th><th className="num">Tasa</th><th className="num">Precio ref</th></tr></thead>
                <tbody>{fills.map((f) => (<tr key={f.id}><td className="dim">{new Date(f.ts).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td><td>{f.clientName}</td><td className="dim">{papelById(f.papelId).nemo}</td><td className={f.lado === "compra" ? "pos" : "neg"}>{f.lado}</td><td className="dim">{f.venue}·{f.liquidacion}</td><td className="num">{fmtMonto(f.monto)}</td><td className="num">{fmtRate(f.tasaFill)}</td><td className="num">{fmtPx(f.precioRef)}</td></tr>))}</tbody></table>
            )}
          </div>
        </div>

        <div className="notice">
          <b>Slice 1 (este):</b> ticket de orden RF (OTC/TR · PH/PM/CN · punta · papel por nombre corto + impuesto Art.104/afecto · monto · tasa), board del trader con precios <b>selectivos o a todos</b>, precio de referencia desde la TIR, <b>primer-pincha-opera</b> y órdenes resting del cliente que la mesa trabaja. &nbsp;
          <b>Siguiente:</b> cálculo fino (devengado/tabla de desarrollo, impuesto bruto-neto), matching, feed real y Supabase.
        </div>
      </div>
    </>
  );
}
