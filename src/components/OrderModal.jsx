import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Ban,
  RotateCcw,
  Receipt,
  Minus,
} from "lucide-react";
import { ORDER_TYPES, PAYMENT_STATUS, TRADE_STATUS, HIRE_MODES, HIRE_STATUS } from "../constants.js";
import { genId, fmtMoney, fmtDate, clamp0, variantLabel } from "../utils.js";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";
import VariantChips from "./VariantChips.jsx";
import RoundsEditor from "./RoundsEditor.jsx";
import ProofImagePicker from "./ProofImagePicker.jsx";

// รวมยอด "จำนวนที่ต้องซื้อทั้งหมด" ให้อัตโนมัติ แทนที่จะให้กรอกยอดรวมเอง:
// - โหมด "ไม่ระบุรอบ" (anytime): จำนวนที่ซื้อต่อรอบ × จำนวนรอบที่ต้องตี
// - โหมด "ตั้งรอบ" (scheduled): รวมจำนวนที่ตั้งไว้ในแต่ละรอบ
function computeHireTotal(form) {
  if (form.hireMode === "scheduled") {
    const sum = (form.rounds || []).reduce((s, r) => s + (clamp0(r.count) || 0), 0);
    return sum || 1;
  }
  const perRound = clamp0(form.hireTotal) || 1;
  const roundsNeeded = clamp0(form.rounds?.[0]?.count) || 1;
  return perRound * roundsNeeded;
}

export default function OrderModal({ data, mode, item, onClose, onSave, onCancel, onRestore, onDelete, onReceipt }) {
  const [form, setForm] = useState(item || {
    id: genId(), customerId: data.customers[0]?.id || "", customerGameId: data.customers[0]?.gameIds?.[0]?.value || "",
    type: "sell_pokemon", pokemonName: "", pokemonVariants: ["normal"], quantity: 1, stockItemId: null,
    price: "", unitPrice: "", sourceAccountId: data.gameAccounts[0]?.id || "",
    paymentStatus: "pending", paidAmount: 0, tradeStatus: "waiting",
    hireMode: "anytime", rounds: [], hireTotal: 1, hireUsed: 0, hireStatus: "ongoing",
    farmItems: "", farmDate: "",
    appointmentDate: "", note: "", proofImageDataUrl: "",
    createdAt: new Date().toISOString(), paidDate: "", cancelled: false, cancelledAt: null, cancelHistory: [],
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [stockNameSel, setStockNameSel] = useState(""); // ชื่อ Pokémon ที่เลือกในขั้นที่ 1 ของ "เลือกจากสต๊อก" (ก่อนเลือก variant)
  const [comboOpen, setComboOpen] = useState(false); // ดรอปดาวน์แนะนำชื่อ Pokémon จากสต๊อก (ช่อง "ชื่อ Pokémon" รวม)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  // เก็บค่า "ตัวตนของสินค้า" (ชื่อ/สต๊อกที่ล็อกไว้/ประเภท) ตอนเปิดฟอร์มไว้ครั้งเดียว เพื่อรู้ว่าผู้ใช้ได้เปลี่ยน
  // การเลือก Pokémon จริงหรือไม่ — ใช้แก้บั๊ก: ออเดอร์เก่า (เช่นจากการกู้คืน backup) ที่ชื่อ Pokémon ไม่ตรงกับ
  // สต๊อกปัจจุบันของไอดีนั้นแล้ว (สต๊อกถูกลบ/เปลี่ยนชื่อไปตามเวลา) จะกดบันทึกไม่ได้เลยแม้แก้ไขแค่สถานะชำระ/เทรด
  // ทั้งที่ไม่ได้ไปแก้ตัว Pokémon เลย — ถ้าตัวตนยังเหมือนตอนเปิดฟอร์มมา ก็ไม่ต้องบังคับให้ตรงกับสต๊อกสดอีก
  const originalIdentityRef = useRef(item ? { pokemonName: item.pokemonName, stockItemId: item.stockItemId ?? null, pokemonVariants: item.pokemonVariants || [] } : null);
  const isSell = form.type === "sell_pokemon";
  const isFarm = form.type === "hire_farm";
  const isRoundsHire = form.type === "hire_boss" || form.type === "hire_invite";

  const selectedCustomer = data.customers.find(c => c.id === form.customerId);
  const selectedAccount = data.gameAccounts.find(a => a.id === form.sourceAccountId);
  const stockOptions = selectedAccount?.stock || [];

  // เช็คว่า Pokémon ชื่อนี้ (ที่พิมพ์/เลือกไว้) มีของในสต๊อก "ของไอดีต้นทางที่เลือกไว้" จริงกี่ประเภท
  // (แก้บั๊กเดิม: ห้ามอ้างอิงสต๊อกของไอดีอื่น — ต้องเป็นของ selectedAccount เท่านั้น) เพื่อจำกัดตัวเลือก
  // "ประเภท Pokémon" ให้เหลือแค่ประเภทที่มีของจริงในไอดีนี้ — ถ้าไม่เจอชื่อนี้ในสต๊อกของไอดีนี้เลย
  // จะไม่มีตัวเลือกให้เลือกเลย (ต้องเพิ่มสต๊อกของไอดีนี้ก่อน)
  const trimmedName = (form.pokemonName || "").trim();
  const matchedVariantKeys = Array.from(new Set(
    stockOptions
      .filter(s => (s.name || "").trim().toLowerCase() === trimmedName.toLowerCase())
      .flatMap(s => (s.variants && s.variants.length ? s.variants : ["normal"]))
  ));
  const variantOptionsForForm = matchedVariantKeys.length
    ? data.pokemonVariants.filter(v => matchedVariantKeys.includes(v.key))
    : [];

  // จัดกลุ่มรายการสต๊อกตามชื่อ (ตัวพิมพ์เล็ก-ใหญ่ไม่นับต่างกัน) เพื่อไม่ให้ชื่อซ้ำโผล่หลายแถวในดรอปดาวน์
  // — แต่ละกลุ่มอาจมีหลาย stock row ที่เป็นคนละ variant/สี ของ Pokémon ตัวเดียวกัน
  const stockGroups = {};
  stockOptions.forEach(s => {
    const key = (s.name || "").trim().toLowerCase();
    if (!key) return;
    if (!stockGroups[key]) stockGroups[key] = { name: s.name, items: [] };
    stockGroups[key].items.push(s);
  });
  const stockGroupList = Object.entries(stockGroups).sort((a, b) => a[1].name.localeCompare(b[1].name, "th"));

  // ตัวเลือกที่โชว์ในดรอปดาวน์ของช่อง "ชื่อ Pokémon" รวม — กรองตามที่พิมพ์ (ว่างไว้ = โชว์ทั้งหมด)
  const comboFiltered = trimmedName
    ? stockGroupList.filter(([, g]) => g.name.toLowerCase().includes(trimmedName.toLowerCase()))
    : stockGroupList;

  // ถ้าเปลี่ยนชื่อ Pokémon แล้วประเภทที่เลือกไว้เดิมไม่มีอยู่ในตัวเลือกปัจจุบัน ให้สลับไปประเภทแรกที่มีให้อัตโนมัติ
  // ถ้าไม่มีตัวเลือกเลย (ชื่อไม่มีในสต๊อก) ให้ล้างประเภทที่เลือกไว้ทิ้ง เพื่อไม่ให้ค้างค่าเก่าที่ไม่มีของจริง
  // (ไม่ทำตอนล็อกจากสต๊อก เพราะตอนนั้นประเภทถูกกำหนดมาจาก pickStock() อยู่แล้ว)
  // ข้ามการล้างนี้ตอนเปิดฟอร์มครั้งแรก (mount) เสมอ — ให้ทำงานแค่ตอนผู้ใช้พิมพ์เปลี่ยนชื่อเองหลังจากนั้นเท่านั้น
  // แก้บั๊ก: ออเดอร์เก่าที่กรอกชื่อเองไม่ได้ล็อกสต๊อก แล้วสต๊อกไอดีนั้นถูกลบ/เปลี่ยนชื่อไปตามเวลา จะโดนล้าง
  // ประเภท Pokémon ทิ้งทันทีที่เปิดฟอร์มมาดู ทั้งที่ผู้ใช้ยังไม่ได้แก้อะไรเลย
  const skipVariantResetRef = useRef(true);
  useEffect(() => {
    if (skipVariantResetRef.current) { skipVariantResetRef.current = false; return; }
    if (!isSell || form.stockItemId) return;
    const allowedKeys = variantOptionsForForm.map(v => v.key);
    if (allowedKeys.length === 0) {
      if ((form.pokemonVariants || []).length > 0) set("pokemonVariants", []);
    } else if (!(form.pokemonVariants || []).every(v => allowedKeys.includes(v))) {
      set("pokemonVariants", [allowedKeys[0]]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pokemonName]);

  // คำนวณ "ราคารวม" ให้อัตโนมัติจาก จำนวน × ราคาต่อตัว เสมอสำหรับออเดอร์ขาย Pokémon — แก้บั๊กเดิมที่ราคารวม
  // เป็นช่องกรอกแยกอิสระ ไม่ผูกกับจำนวน/ราคาต่อตัวเลย ทำให้ใส่จำนวน 2-3 ตัวแล้วราคารวมไม่อัปเดตให้
  // ข้ามการคำนวณตอนเปิดฟอร์มครั้งแรก (mount) — กันบั๊ก: ออเดอร์เก่าที่บันทึกไว้ตั้งแต่ก่อนมีช่อง "ราคาต่อตัว"
  // (unitPrice = 0) จะโดนคำนวณราคารวมทับเป็น 0 ทันทีที่เปิดดู ทั้งที่ราคาเดิมถูกต้องอยู่แล้ว — ให้คำนวณ
  // ใหม่เฉพาะตอนผู้ใช้แก้ไขจำนวน/ราคาต่อตัวเองหลังจากนั้นเท่านั้น
  const skipPriceCalcRef = useRef(true);
  useEffect(() => {
    if (skipPriceCalcRef.current) { skipPriceCalcRef.current = false; return; }
    if (!isSell) return;
    const computed = (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0);
    setForm(f => ({ ...f, price: String(computed) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSell, form.quantity, form.unitPrice]);

  function pickCustomer(id) {
    const c = data.customers.find(x => x.id === id);
    setForm(f => ({ ...f, customerId: id, customerGameId: c?.gameIds?.[0]?.value || "" }));
  }
  function pickStock(stockId) {
    if (!stockId) { set("stockItemId", null); return; }
    const s = stockOptions.find(x => x.id === stockId);
    if (!s) return;
    // ดึงราคาล่าสุดที่เคยบันทึกไว้กับสินค้าชิ้นนี้มาใส่ให้อัตโนมัติ (แก้ไขต่อได้ แต่ยังบังคับต้องมีค่าอยู่ดี)
    setForm(f => ({
      ...f, stockItemId: stockId, pokemonName: s.name,
      pokemonVariants: s.variants && s.variants.length ? s.variants : ["normal"],
      unitPrice: s.price ? String(s.price) : f.unitPrice,
    }));
  }
  // ตอนเปิดฟอร์มแก้ไขออเดอร์ที่เคยล็อกสต๊อกไว้อยู่แล้ว ให้ sync ว่าตอนนี้อยู่กลุ่มชื่อไหน
  // เพื่อให้ UI แสดง chip เลือก variant ของกลุ่มนั้นไว้ถูกต้องตั้งแต่เปิดมา
  useEffect(() => {
    if (form.stockItemId) {
      const s = stockOptions.find(x => x.id === form.stockItemId);
      if (s) {
        setStockNameSel((s.name || "").trim().toLowerCase());
        if (!form.unitPrice && s.price) setForm(f => ({ ...f, unitPrice: String(s.price) }));
        return;
      }
    }
    setStockNameSel("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sourceAccountId]);

  function submit() {
    if (!canSubmit) return;
    const price = Number(form.price) || 0;
    let paidAmount = 0;
    if (form.paymentStatus === "paid") paidAmount = price;
    else if (form.paymentStatus === "partial") paidAmount = clamp0(Math.min(Number(form.paidAmount) || 0, price));
    const payload = { ...form, price, paidAmount, quantity: Number(form.quantity) || 1, pokemonName: trimmedName };
    if (isSell) payload.unitPrice = Number(form.unitPrice) || 0;
    if ((form.paymentStatus === "paid" || form.paymentStatus === "partial") && !payload.paidDate) payload.paidDate = new Date().toISOString();
    if (isRoundsHire) {
      payload.rounds = form.rounds;
      payload.appointmentDate = "";
      payload.hireTotal = computeHireTotal(form);
      payload.hireUsed = Math.min(clamp0(form.hireUsed), payload.hireTotal);
    } else if (isFarm) {
      payload.appointmentDate = "";
      payload.farmItems = (form.farmItems || "").trim();
      payload.farmDate = form.farmDate || "";
      payload.hireStatus = form.hireStatus === "done" ? "done" : "ongoing";
      payload.rounds = [];
      payload.hireTotal = 0;
      payload.hireUsed = 0;
    }
    onSave(payload);
  }

  // ถ้ากำลังแก้ไขออเดอร์เดิม และผู้ใช้ยังไม่ได้ไปแก้ตัวเลือก Pokémon/สต๊อก/ประเภทเลย (ตัวตนยังเหมือนตอนเปิดฟอร์มมา)
  // ก็ไม่ต้องบังคับให้ชื่อนั้นตรงกับสต๊อกสดของไอดีอีก — กันบั๊ก: ออเดอร์เก่า/กู้คืนจาก backup ที่สต๊อกถูกลบ/
  // เปลี่ยนชื่อไปตามเวลาแล้ว จะบันทึกไม่ได้เลยแม้แค่แก้สถานะชำระ/เทรด ทั้งที่ไม่ได้แตะตัว Pokémon เลย
  const identityUnchangedFromOriginal = !!originalIdentityRef.current
    && form.pokemonName === originalIdentityRef.current.pokemonName
    && (form.stockItemId ?? null) === originalIdentityRef.current.stockItemId
    && JSON.stringify(form.pokemonVariants || []) === JSON.stringify(originalIdentityRef.current.pokemonVariants);

  // กันบันทึกออเดอร์ที่ข้อมูลไม่ครบ: ต้องมีลูกค้า, ถ้าเป็นออเดอร์ "ขาย" ชื่อ Pokémon ต้องมีของในสต๊อกจริง
  // (ยกเว้นกรณีข้างต้น), ถ้าเป็น "จ้างฟามทั่วไป" ต้องกรอกรายการฟามมาก่อน (ไม่งั้นจะไม่รู้ว่าจ้างฟามอะไร)
  const canSubmit = !!form.customerId
    && (!isSell || identityUnchangedFromOriginal || (matchedVariantKeys.length > 0 && Number(form.unitPrice) > 0))
    && (!isFarm || (form.farmItems || "").trim().length > 0);

  if (data.customers.length === 0) {
    return (
      <Modal title="เพิ่มออเดอร์" onClose={onClose}>
        <EmptyState text="กรุณาเพิ่มลูกค้าก่อนสร้างออเดอร์" />
      </Modal>
    );
  }

  return (
    <Modal title={mode === "add" ? "เพิ่มออเดอร์" : `แก้ไขออเดอร์ ${form.code || ""}`} onClose={onClose}>
      {form.cancelled && (
        <div className="pgs-cancelbanner"><Ban size={13} /> ออเดอร์นี้ถูกยกเลิกแล้ว {form.cancelledAt ? `(${fmtDate(form.cancelledAt)})` : ""}</div>
      )}
      {(form.cancelHistory || []).length > 0 && (
        <div className="pgs-card" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>ประวัติการยกเลิก</div>
          {form.cancelHistory.map(h => (
            <div key={h.id || h.date} style={{ fontSize: 11, marginBottom: 4 }}>
              <span className="pgs-mono" style={{ color: "var(--muted)" }}>{fmtDate(h.date)}</span> — {h.reason}
            </div>
          ))}
        </div>
      )}
      <div className="pgs-field">
        <label className="pgs-label">ประเภทบริการ</label>
        <div style={{ display: "flex", gap: 6 }}>
          {Object.entries(ORDER_TYPES).map(([k, v]) => (
            <button key={k} className={"pgs-chip" + (form.type === k ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => set("type", k)}>{v.emoji} {v.short}</button>
          ))}
        </div>
      </div>
      <div className="pgs-field">
        <label className="pgs-label">ลูกค้า</label>
        <select className="pgs-select" value={form.customerId} onChange={e => pickCustomer(e.target.value)}>
          {data.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {selectedCustomer && (selectedCustomer.gameIds || []).length > 0 && (
        <div className="pgs-field">
          <label className="pgs-label">ไอดีของลูกค้าที่ใช้ในออเดอร์นี้</label>
          <select className="pgs-select" value={form.customerGameId} onChange={e => set("customerGameId", e.target.value)}>
            {selectedCustomer.gameIds.map(g => <option key={g.id} value={g.value}>{g.value || "(ไม่มีชื่อ)"}</option>)}
            <option value="">- ไม่ระบุ -</option>
          </select>
        </div>
      )}
      {isSell && (
        <>
          <div className="pgs-field">
            <label className="pgs-label">ไอดีต้นทาง</label>
            <select className="pgs-select" value={form.sourceAccountId} onChange={e => { set("sourceAccountId", e.target.value); set("stockItemId", null); }}>
              <option value="">- ไม่ระบุ -</option>
              {data.gameAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div className="pgs-field" style={{ flex: 2, position: "relative" }}>
              <label className="pgs-label">ชื่อ Pokémon{stockOptions.length > 0 ? " (พิมพ์ค้นหาสต๊อก หรือเลือกจากรายการ)" : ""}</label>
              <input
                className="pgs-input"
                value={form.pokemonName}
                onChange={e => {
                  set("pokemonName", e.target.value);
                  set("stockItemId", null);
                  setStockNameSel("");
                  setComboOpen(true);
                }}
                onFocus={() => setComboOpen(true)}
                onBlur={() => setTimeout(() => setComboOpen(false), 150)}
                placeholder="เช่น Rayquaza"
              />
              {comboOpen && stockOptions.length > 0 && comboFiltered.length > 0 && (
                <div className="pgs-card" style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 20, maxHeight: 220, overflowY: "auto", padding: 6 }}>
                  {comboFiltered.map(([key, g]) => {
                    const totalQty = g.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
                    return (
                      <div
                        key={key}
                        onMouseDown={() => {
                          setStockNameSel(key);
                          set("pokemonName", g.name);
                          if (g.items.length === 1) pickStock(g.items[0].id);
                          else set("stockItemId", null); // มีหลายประเภท — รอเลือก variant ด้านล่างก่อน
                          setComboOpen(false);
                        }}
                        style={{ padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, display: "flex", justifyContent: "space-between", gap: 8 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>{g.name}</span>
                        <span className="pgs-mono" style={{ color: "var(--muted)" }}>เหลือ {totalQty}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {form.stockItemId ? (
                <div style={{ fontSize: 11, color: "var(--green)", marginTop: 6 }}>✓ เลือกจากสต๊อกแล้ว — ตัดสต๊อกอัตโนมัติ</div>
              ) : stockOptions.length === 0 ? (
                <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>
                  ไอดีนี้ยังไม่มีสินค้าในสต๊อกเลย — ต้องเพิ่มสต๊อกให้ไอดีนี้ก่อน ถึงจะสร้างออเดอร์ขายได้
                </div>
              ) : null}
              {!form.stockItemId && stockNameSel && stockGroups[stockNameSel]?.items.length > 1 && (
                <div style={{ marginTop: 8 }}>
                  <div className="pgs-label" style={{ marginBottom: 4 }}>เลือกประเภท/สี</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {stockGroups[stockNameSel].items.map(it => (
                      <button
                        key={it.id} type="button"
                        className={"pgs-chip" + (form.stockItemId === it.id ? " active" : "")}
                        onClick={() => pickStock(it.id)}
                      >
                        {(it.variants && it.variants.length ? it.variants : ["normal"]).map(vk => variantLabel(data, vk)).join(", ")} · เหลือ {it.quantity}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="pgs-field" style={{ flex: 1 }}>
              <label className="pgs-label">จำนวน</label>
              <input className="pgs-input" type="number" min="1" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
            </div>
          </div>
          <div className="pgs-field">
            <label className="pgs-label">ประเภท Pokémon</label>
            <VariantChips value={form.pokemonVariants} onChange={(v) => set("pokemonVariants", v)} variants={variantOptionsForForm} disabled={!!form.stockItemId || matchedVariantKeys.length === 0} />
            {form.stockItemId ? (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                ล็อกตามรายการสต๊อกที่เลือก — ถ้าต้องการชนิดอื่น ให้เปลี่ยนตัวเลือก "เลือกจากสต๊อก" ด้านบน หรือเลือก "กรอกเอง (ไม่ตัดสต๊อก)" ก่อน
              </div>
            ) : matchedVariantKeys.length > 0 ? (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                {trimmedName} มีในสต๊อกของไอดีนี้ {matchedVariantKeys.length} ประเภท จึงเลือกได้เฉพาะประเภทเหล่านี้
              </div>
            ) : trimmedName ? (
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>
                ไม่พบ "{trimmedName}" ในสต๊อกของไอดีนี้ — ต้องเพิ่มสต๊อกของ Pokémon นี้ให้ไอดีนี้ก่อน ถึงจะเลือกประเภทและสร้างออเดอร์ได้
              </div>
            ) : (
              <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>
                กรุณากรอกชื่อ Pokémon ก่อน ถึงจะเลือกประเภทและบันทึกออเดอร์ได้
              </div>
            )}
          </div>
          <div className="pgs-field">
            <label className="pgs-label">ราคาต่อตัว (บาท) *</label>
            <input
              className="pgs-input pgs-mono" type="number" min="0"
              value={form.unitPrice}
              onChange={e => set("unitPrice", e.target.value)}
              placeholder="0"
            />
            <div style={{ fontSize: 11, color: !form.unitPrice ? "var(--red)" : "var(--muted)", marginTop: 6 }}>
              {!form.unitPrice
                ? "บังคับกรอก — ราคานี้จะถูกบันทึกไว้ที่สินค้าชิ้นนี้ เพื่อไปแสดงในหน้าสินค้าของลูกค้าด้วย"
                : "ราคานี้จะถูกอัปเดตเป็นราคาล่าสุดของสินค้าชิ้นนี้ในหน้าสินค้าของลูกค้า"}
            </div>
          </div>
        </>
      )}
      {isRoundsHire && (
        <>
          <div className="pgs-field">
            <label className="pgs-label">โหมดนัดตี</label>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(HIRE_MODES).map(([k, v]) => (
                <button key={k} className={"pgs-chip" + (form.hireMode === k ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => set("hireMode", k)}>{v.label}</button>
              ))}
            </div>
          </div>
          <RoundsEditor mode={form.hireMode} rounds={form.rounds} onChange={(r) => set("rounds", r)} />
          <div style={{ display: "flex", gap: 10 }}>
            {form.hireMode === "anytime" && (
              <div className="pgs-field" style={{ flex: 1 }}>
                <label className="pgs-label">จำนวนที่ซื้อต่อรอบ (ตัว)</label>
                <input className="pgs-input pgs-mono" type="number" min="1" value={form.hireTotal} onChange={e => set("hireTotal", e.target.value)} />
              </div>
            )}
            <div className="pgs-field" style={{ flex: 1 }}>
              <label className="pgs-label">ใช้ไปแล้ว</label>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button type="button" className="pgs-iconbtn" onClick={() => set("hireUsed", clamp0((Number(form.hireUsed) || 0) - 1))}><Minus size={13} /></button>
                <input className="pgs-input pgs-mono" style={{ textAlign: "center" }} type="number" min="0" value={form.hireUsed} onChange={e => set("hireUsed", e.target.value)} />
                <button type="button" className="pgs-iconbtn" onClick={() => set("hireUsed", clamp0(Math.min((Number(form.hireUsed) || 0) + 1, computeHireTotal(form))))}><Plus size={13} /></button>
              </div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: -6, marginBottom: 14 }}>
            รวมทั้งหมด <b className="pgs-mono" style={{ color: "var(--text)" }}>{computeHireTotal(form)}</b> ตัว/รอบ — เหลืออีก {clamp0(computeHireTotal(form) - (Number(form.hireUsed) || 0))} ตัว
            {form.hireMode === "anytime"
              ? " (คำนวณอัตโนมัติจาก จำนวนที่ซื้อต่อรอบ × จำนวนรอบที่ต้องตี)"
              : " (รวมจากจำนวนที่ตั้งไว้ในแต่ละรอบด้านบน)"}
          </div>
        </>
      )}
      {isFarm && (
        <>
          <div className="pgs-field">
            <label className="pgs-label">รายการฟาม</label>
            <textarea
              className="pgs-textarea" rows={3}
              value={form.farmItems}
              onChange={e => set("farmItems", e.target.value)}
              placeholder="เช่น ฟาม Stardust, ฟามไข่ 10 ฟอง, เก็บของจาก PokéStop ฯลฯ"
            />
          </div>
          <div className="pgs-field">
            <label className="pgs-label">วันที่ฟาม</label>
            <input className="pgs-input" type="date" value={form.farmDate} onChange={e => set("farmDate", e.target.value)} />
          </div>
          <div className="pgs-field">
            <label className="pgs-label">สถานะงานฟาม</label>
            <select className="pgs-select" value={form.hireStatus} onChange={e => set("hireStatus", e.target.value)}>
              {Object.entries(HIRE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </>
      )}
      <div className="pgs-field">
        <label className="pgs-label">ราคารวม (บาท)</label>
        <input
          className="pgs-input pgs-mono"
          type="number"
          value={form.price}
          onChange={e => set("price", e.target.value)}
          placeholder="0"
          readOnly={isSell}
          disabled={isSell}
          style={isSell ? { opacity: 0.7, cursor: "not-allowed" } : undefined}
        />
        {isSell && (
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
            คำนวณอัตโนมัติจาก จำนวน × ราคาต่อตัว — ถ้าต้องการแก้ ให้แก้ที่ "ราคาต่อตัว" หรือ "จำนวน" ด้านบนแทน
          </div>
        )}
      </div>
      <div className="pgs-field">
        <label className="pgs-label">สถานะชำระ</label>
        <select className="pgs-select" value={form.paymentStatus} onChange={e => set("paymentStatus", e.target.value)}>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {form.paymentStatus === "partial" && (
        <div className="pgs-field">
          <label className="pgs-label">จำนวนที่ชำระแล้ว (บาท)</label>
          <input className="pgs-input pgs-mono" type="number" value={form.paidAmount} onChange={e => set("paidAmount", e.target.value)} />
          <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>คงค้าง ฿{fmtMoney(clamp0((Number(form.price) || 0) - (Number(form.paidAmount) || 0)))}</div>
        </div>
      )}
      {isSell && (
        <div className="pgs-field">
          <label className="pgs-label">สถานะเทรด</label>
          <select
            className="pgs-select" value={form.tradeStatus}
            onChange={e => {
              const v = e.target.value;
              set("tradeStatus", v);
              if (v === "three_hearts") {
                const d = new Date();
                d.setDate(d.getDate() + 30);
                set("appointmentDate", d.toISOString().slice(0, 10));
              }
            }}
          >
            {Object.entries(TRADE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      )}
      {isSell && (
        <div className="pgs-field">
          <label className="pgs-label">วันนัด (สำหรับนัดเทรด)</label>
          <input className="pgs-input" type="date" value={form.appointmentDate} onChange={e => set("appointmentDate", e.target.value)} />
        </div>
      )}
      <div className="pgs-field">
        <label className="pgs-label">รูปภาพกิจกรรม / หลักฐาน (ถ้ามี — จะแสดงในใบเสร็จ)</label>
        <ProofImagePicker value={form.proofImageDataUrl} onChange={(v) => setForm(f => ({ ...f, proofImageDataUrl: v, driveFileId: null }))} />
      </div>
      <div className="pgs-field">
        <label className="pgs-label">หมายเหตุ</label>
        <textarea className="pgs-textarea" rows={2} value={form.note} onChange={e => set("note", e.target.value)} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button className="pgs-btn pgs-btn-primary" style={{ flex: 1 }} disabled={!canSubmit} onClick={submit}>บันทึก</button>
        {mode === "edit" && (
          <button className="pgs-btn pgs-btn-outline" onClick={() => onReceipt(form)}><Receipt size={14} /></button>
        )}
      </div>
      {mode === "edit" && (
        <div>
          {!form.cancelled && showCancelReason && (
            <div className="pgs-field">
              <label className="pgs-label">ยกเลิกเพราะอะไร?</label>
              <textarea
                className="pgs-textarea" rows={2} autoFocus
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="ระบุเหตุผลที่ยกเลิกออเดอร์นี้..."
              />
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            {form.cancelled ? (
              <button className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={() => onRestore(form.id)}><RotateCcw size={14} /> กู้คืนออเดอร์</button>
            ) : !showCancelReason ? (
              <button className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={() => setShowCancelReason(true)}><Ban size={14} /> ยกเลิกออเดอร์</button>
            ) : (
              <button
                className="pgs-btn pgs-btn-danger" style={{ flex: 1 }}
                disabled={!cancelReason.trim()}
                onClick={() => onCancel(form.id, cancelReason)}
              >ยืนยันยกเลิก (ระบุเหตุผลก่อน)</button>
            )}
            {!confirmDelete ? (
              <button className="pgs-btn pgs-btn-danger" style={{ flex: 1 }} onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> ลบถาวร</button>
            ) : (
              <button className="pgs-btn pgs-btn-danger" style={{ flex: 1 }} onClick={() => onDelete(form.id)}>ยืนยันลบถาวร?</button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
