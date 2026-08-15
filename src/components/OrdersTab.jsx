import { useState } from "react";
import {
  Plus,
  CheckCircle2,
  Search,
  Ban,
  ListFilter,
  Receipt,
  Heart,
  Minus,
} from "lucide-react";
import { ORDER_TYPES, PAYMENT_STATUS, TRADE_STATUS, HIRE_STATUS, HIRE_MODES } from "../constants.js";
import { fmtMoney, fmtDate, orderBalance, clamp0, variantLabel } from "../utils.js";
import StatusDot from "./StatusDot.jsx";
import EmptyState from "./EmptyState.jsx";

// รวมฟังก์ชันของ TradeTab เดิม (onQuickTrade) และ HireTab เดิม (onQuickUse, onQuickHireStatus)
// เข้ามาไว้ในหน้าออเดอร์หน้าเดียว ตาม Bottom Navigation ใหม่ที่ตัดแท็บ "เทรด" กับ "ตีบอส/เชิญตี" ออก
export default function OrdersTab({
  data, custName, accName, openNew, openEdit, openReceipt,
  onQuickComplete, onQuickCancel, onQuickTrade, onQuickUse, onQuickHireStatus,
  initialFilter,
}) {
  const [filter, setFilter] = useState(initialFilter || "all");
  const [q, setQ] = useState("");
  const [showAdv, setShowAdv] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [tradeFilter, setTradeFilter] = useState("all");
  const [hireFilter, setHireFilter] = useState("all");
  const [cancelFilter, setCancelFilter] = useState("active");
  const [sortBy, setSortBy] = useState("date_desc");

  // เปลี่ยนตัวกรอง "ประเภทออเดอร์" ให้ล้างตัวกรองย่อย (ระบบเทรด / ตีบอส-เชิญตี-ฟาม) ทิ้งไปด้วยเสมอ
  // แก้บั๊กเดิม: ตัวกรองย่อยที่เลือกไว้ค้างอยู่ (เช่น "รอเทรด") จะยังกรองข้อมูลต่อแม้สลับไปแท็บอื่นที่ไม่ได้
  // แสดงปุ่มนั้นให้เห็นแล้ว ทำให้ข้อมูลของประเภทอื่น (เช่น ตีบอส) หายไปทั้งหมดแบบไม่มีสาเหตุที่มองเห็นได้
  const changeTypeFilter = (t) => {
    setFilter(t);
    setTradeFilter("all");
    setHireFilter("all");
  };

  const filtered = data.orders.filter(o => {
    if (cancelFilter === "active" && o.cancelled) return false;
    if (cancelFilter === "cancelled" && !o.cancelled) return false;
    if (filter !== "all" && o.type !== filter) return false;
    if (paymentFilter !== "all" && o.paymentStatus !== paymentFilter) return false;
    // ผูกตัวกรองย่อยไว้กับตัวกรองประเภทหลักเสมอ (กันไว้อีกชั้น เผื่อ state ค้าง) — ใช้ได้เฉพาะตอนแท็บ
    // ประเภทที่ตรงกันเท่านั้น ไม่ให้ไปกรองข้อมูลของประเภทอื่นที่ไม่ได้แสดงตัวกรองนี้อยู่
    if (filter === "sell_pokemon" && tradeFilter !== "all") {
      if (o.tradeStatus !== tradeFilter) return false;
    }
    if (filter !== "sell_pokemon" && hireFilter !== "all") {
      if (o.type === "sell_pokemon") return false;
      const hs = o.hireStatus === "done" ? "done" : "ongoing";
      if (hs !== hireFilter) return false;
    }
    if (q && !(custName(o.customerId).toLowerCase().includes(q.toLowerCase()) || (o.pokemonName || "").toLowerCase().includes(q.toLowerCase()) || (o.farmItems || "").toLowerCase().includes(q.toLowerCase()) || o.code.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    if (sortBy === "date_asc") return (a.createdAt || "").localeCompare(b.createdAt || "");
    if (sortBy === "amount_desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortBy === "amount_asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
    return (b.createdAt || "").localeCompare(a.createdAt || ""); // date_desc (default)
  });

  return (
    <div>
      <div className="pgs-row" style={{ marginBottom: 12 }}>
        <h2 className="pgs-display" style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>ออเดอร์</h2>
        <button className="pgs-btn pgs-btn-primary" onClick={openNew}><Plus size={15} /> เพิ่ม</button>
      </div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 12, top: 12 }} />
        <input className="pgs-input" style={{ paddingLeft: 32 }} placeholder="ค้นหาลูกค้า, Pokémon, รหัส..." value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <select className="pgs-select" style={{ marginBottom: 8, fontSize: 12 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
        <option value="date_desc">เรียง: ใหม่สุดก่อน</option>
        <option value="date_asc">เรียง: เก่าสุดก่อน</option>
        <option value="amount_desc">เรียง: ราคามาก-น้อย</option>
        <option value="amount_asc">เรียง: ราคาน้อย-มาก</option>
      </select>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8, paddingBottom: 2 }}>
        <button className={"pgs-chip" + (filter === "all" ? " active" : "")} onClick={() => changeTypeFilter("all")}>ทั้งหมด</button>
        <button className={"pgs-chip" + (filter === "sell_pokemon" ? " active" : "")} onClick={() => changeTypeFilter("sell_pokemon")}>{ORDER_TYPES.sell_pokemon?.emoji} เทรด</button>
        <button className={"pgs-chip" + (filter === "hire_boss" ? " active" : "")} onClick={() => changeTypeFilter("hire_boss")}>{ORDER_TYPES.hire_boss?.emoji} ตีบอส</button>
        <button className={"pgs-chip" + (filter === "hire_invite" ? " active" : "")} onClick={() => changeTypeFilter("hire_invite")}>{ORDER_TYPES.hire_invite?.emoji} เชิญตี</button>
        <button className={"pgs-chip" + (filter === "hire_farm" ? " active" : "")} onClick={() => changeTypeFilter("hire_farm")}>{ORDER_TYPES.hire_farm?.emoji} {ORDER_TYPES.hire_farm?.short}</button>
        <button className={"pgs-chip" + (showAdv ? " active" : "")} onClick={() => setShowAdv(s => !s)}><ListFilter size={12} style={{ verticalAlign: -2 }} /> ตัวกรอง</button>
      </div>
      {filter === "sell_pokemon" && (
        <div style={{ marginBottom: 8 }}>
          <div className="pgs-label" style={{ marginBottom: 4 }}>ระบบเทรด</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["waiting", "three_hearts", "traded"].filter(k => TRADE_STATUS[k]).map(k => (
              <button
                key={k}
                className={"pgs-chip" + (tradeFilter === k ? " active" : "")}
                style={{ flex: 1, textAlign: "center" }}
                onClick={() => setTradeFilter(f => f === k ? "all" : k)}
              >{TRADE_STATUS[k].label}</button>
            ))}
          </div>
        </div>
      )}
      {filter !== "sell_pokemon" && (
        <div style={{ marginBottom: 8 }}>
          <div className="pgs-label" style={{ marginBottom: 4 }}>ตีบอส/เชิญตี/ฟาม</div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.entries(HIRE_STATUS).map(([k, v]) => (
              <button
                key={k}
                className={"pgs-chip" + (hireFilter === k ? " active" : "")}
                style={{ flex: 1, textAlign: "center" }}
                onClick={() => setHireFilter(f => f === k ? "all" : k)}
              >{v.label}</button>
            ))}
          </div>
        </div>
      )}
      {showAdv && (
        <div className="pgs-card" style={{ marginBottom: 12 }}>
          <div className="pgs-field" style={{ marginBottom: 10 }}>
            <label className="pgs-label">สถานะชำระ</label>
            <select className="pgs-select" value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)}>
              <option value="all">ทั้งหมด</option>
              {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="pgs-field" style={{ marginBottom: 0 }}>
            <label className="pgs-label">สถานะออเดอร์</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={"pgs-chip" + (cancelFilter === "active" ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setCancelFilter("active")}>ปกติ</button>
              <button className={"pgs-chip" + (cancelFilter === "cancelled" ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setCancelFilter("cancelled")}>ยกเลิกแล้ว</button>
              <button className={"pgs-chip" + (cancelFilter === "all" ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setCancelFilter("all")}>ทั้งหมด</button>
            </div>
          </div>
        </div>
      )}
      {filtered.length === 0 ? <EmptyState text="ไม่พบออเดอร์" /> : filtered.map(o => {
        const balance = orderBalance(o);
        const isHire = o.type !== "sell_pokemon";
        const isRoundsHire = o.type === "hire_boss" || o.type === "hire_invite";
        const isFarm = o.type === "hire_farm";
        const hireTotal = clamp0(o.hireTotal);
        const hireUsed = clamp0(o.hireUsed);
        const hireFull = hireTotal > 0 && hireUsed >= hireTotal;
        const isCompleted = isHire ? o.hireStatus === "done" : o.paymentStatus === "paid";
        return (
          <div key={o.id} className="pgs-card" style={{ marginBottom: 8, opacity: o.cancelled ? 0.7 : 1 }} onClick={() => openEdit(o)}>
            <div className="pgs-row" style={{ alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{ORDER_TYPES[o.type].emoji}</span>
                <div>
                  <div className={"pgs-row" + (o.cancelled ? " pgs-strike" : "")} style={{ gap: 6, justifyContent: "flex-start" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{custName(o.customerId)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {o.type === "sell_pokemon"
                      ? `${o.pokemonName || ""}${(o.pokemonVariants || []).filter(v => v !== "normal").length ? " (" + o.pokemonVariants.filter(v => v !== "normal").map(v => variantLabel(data, v)).join(", ") + ")" : ""} x${o.quantity || 1}`
                      : isFarm
                        ? `${ORDER_TYPES[o.type].label}${o.farmDate ? " · นัดวันที่ " + fmtDate(o.farmDate) : ""}`
                        : `${ORDER_TYPES[o.type].label} · ${HIRE_MODES[o.hireMode]?.label || ""}`}
                    {o.sourceAccountId ? ` · ${accName(o.sourceAccountId)}` : ""}
                  </div>
                  {isFarm && o.farmItems && (
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{o.farmItems}</div>
                  )}
                  <div className="pgs-mono" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{o.code} · {fmtDate(o.createdAt)}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="pgs-mono" style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>฿{fmtMoney(o.price)}</div>
                <StatusDot payment={o.paymentStatus} trade={o.type === "sell_pokemon" ? o.tradeStatus : null} cancelled={o.cancelled} />
              </div>
            </div>
            {!o.cancelled && o.paymentStatus === "partial" && (
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>ค้างชำระ ฿{fmtMoney(balance)}</div>
            )}
            {!o.cancelled && isRoundsHire && (
              <div className="pgs-row" style={{ marginTop: 8, background: "var(--surface2)", borderRadius: 10, padding: "6px 8px" }}>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>ใช้ไปแล้ว <span className="pgs-mono" style={{ color: "var(--text)", fontWeight: 700 }}>{hireUsed}</span> / {hireTotal} ตัว</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* จาก HireTab เดิม: +/- จำนวนที่ใช้ไป — แสดงเฉพาะตอนงานยังไม่เสร็จสิ้น */}
                  {o.hireStatus !== "done" && (
                    <>
                      <button
                        className="pgs-iconbtn" style={{ padding: 5 }}
                        disabled={hireUsed <= 0}
                        onClick={(e) => { e.stopPropagation(); onQuickUse(o, -1); }}
                        title="ลดจำนวนที่ใช้ (แก้ไข)"
                      ><Minus size={12} /></button>
                      <button
                        className="pgs-iconbtn" style={{ padding: 5, borderColor: "rgba(255,203,5,0.4)" }}
                        disabled={hireTotal > 0 && hireUsed >= hireTotal}
                        onClick={(e) => { e.stopPropagation(); onQuickUse(o, 1); }}
                        title="ใช้ไปวันนี้ +1"
                      ><Plus size={12} /></button>
                    </>
                  )}
                  <span className="pgs-badge" style={{ background: HIRE_STATUS[o.hireStatus === "done" ? "done" : "ongoing"].color + "22", color: HIRE_STATUS[o.hireStatus === "done" ? "done" : "ongoing"].color }}>
                    {HIRE_STATUS[o.hireStatus === "done" ? "done" : "ongoing"].label}
                  </span>
                </div>
              </div>
            )}
            {!o.cancelled && isRoundsHire && o.hireStatus !== "done" && hireFull && (
              <button
                className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginTop: 8, fontSize: 12, padding: "6px 10px" }}
                onClick={(e) => { e.stopPropagation(); onQuickHireStatus(o.id, "done"); }}
              ><CheckCircle2 size={13} /> เสร็จสิ้น (ครบจำนวนแล้ว)</button>
            )}
            {/* "จ้างฟามทั่วไป" ไม่มีระบบนับรอบ — แค่บอกสถานะและปุ่มกด "เสร็จสิ้น" ตรงๆ */}
            {!o.cancelled && isFarm && (
              <div className="pgs-row" style={{ marginTop: 8, background: "var(--surface2)", borderRadius: 10, padding: "6px 8px" }}>
                <span className="pgs-badge" style={{ background: HIRE_STATUS[o.hireStatus === "done" ? "done" : "ongoing"].color + "22", color: HIRE_STATUS[o.hireStatus === "done" ? "done" : "ongoing"].color }}>
                  {HIRE_STATUS[o.hireStatus === "done" ? "done" : "ongoing"].label}
                </span>
                {o.hireStatus !== "done" && (
                  <button
                    className="pgs-btn pgs-btn-outline" style={{ padding: "6px 10px", fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); onQuickHireStatus(o.id, "done"); }}
                  ><CheckCircle2 size={12} /> เสร็จสิ้น</button>
                )}
              </div>
            )}
            {/* จาก TradeTab เดิม: อัปเดตสถานะเทรดแบบเร็ว — ไม่แสดงถ้าเทรดเสร็จแล้ว */}
            {!o.cancelled && !isHire && o.tradeStatus !== "traded" && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <button
                  className="pgs-btn pgs-btn-outline" style={{ padding: "6px 10px", fontSize: 11 }}
                  onClick={(e) => { e.stopPropagation(); onQuickTrade(o.id, "traded"); }}
                ><CheckCircle2 size={12} /> เทรดแล้ว</button>
                {o.tradeStatus === "three_hearts" && (
                  <button
                    className="pgs-btn pgs-btn-outline" style={{ padding: "6px 10px", fontSize: 11, borderColor: "rgba(255,203,5,0.4)" }}
                    onClick={(e) => { e.stopPropagation(); onQuickTrade(o.id, "waiting"); }}
                  ><Heart size={12} /> ทำ 3 ใจครบ</button>
                )}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 6 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {!o.cancelled && o.type === "sell_pokemon" && o.paymentStatus !== "paid" && (
                  <button
                    className="pgs-btn pgs-btn-outline" style={{ padding: "6px 10px", fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); onQuickComplete(o); }}
                  ><CheckCircle2 size={12} /> เสร็จสิ้น</button>
                )}
                {!o.cancelled && !isCompleted && (
                  <button
                    className="pgs-btn pgs-btn-danger" style={{ padding: "6px 10px", fontSize: 11 }}
                    onClick={(e) => { e.stopPropagation(); onQuickCancel(o.id); }}
                  ><Ban size={12} /> ยกเลิก</button>
                )}
              </div>
              <button className="pgs-iconbtn" onClick={(e) => { e.stopPropagation(); openReceipt(o); }} title="ใบเสร็จ"><Receipt size={13} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
