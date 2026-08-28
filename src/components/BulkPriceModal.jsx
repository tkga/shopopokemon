import { useState, useMemo } from "react";
import { Percent, Banknote, TrendingDown, TrendingUp, CheckSquare, Square, Search } from "lucide-react";
import { clamp0, fmtMoney, variantLabel } from "../utils.js";
import Modal from "./Modal.jsx";

// เมนู "ปรับราคาสินค้าทั้งหมด" — เลือกรายชิ้นจากสต๊อกทุกไอดี ปรับราคาแบบ % หรือจำนวนเงินคงที่
// (เพิ่ม/ลดก็ได้) แล้วดู preview ราคาใหม่ก่อนกดยืนยันจริง ไม่กระทบ quantity หรือ stock movement log
export default function BulkPriceModal({ data, onClose, onApply, showToast }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [adjustMode, setAdjustMode] = useState("percent"); // "percent" | "amount"
  const [direction, setDirection] = useState("decrease"); // "decrease" | "increase"
  const [value, setValue] = useState("");
  const [confirming, setConfirming] = useState(false);

  // รวมสต๊อกจากทุกไอดีเกมเป็นลิสต์เดียว (สต๊อกถูกเก็บซ้อนอยู่ใน gameAccounts[].stock)
  const allStock = useMemo(() => {
    const rows = [];
    (data.gameAccounts || []).forEach(acc => {
      (acc.stock || []).forEach(s => {
        rows.push({ ...s, accountId: acc.id, accountName: acc.name || "ไม่มีชื่อ" });
      });
    });
    return rows;
  }, [data.gameAccounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStock;
    return allStock.filter(s =>
      (s.name || "").toLowerCase().includes(q) ||
      (s.accountName || "").toLowerCase().includes(q) ||
      (s.productCode || "").toLowerCase().includes(q)
    );
  }, [allStock, query]);

  const allFilteredSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id));

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAllFiltered() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach(s => next.delete(s.id));
      } else {
        filtered.forEach(s => next.add(s.id));
      }
      return next;
    });
  }

  const numValue = Number(value) || 0;
  function computeNewPrice(price) {
    const p = Number(price) || 0;
    let result = p;
    if (adjustMode === "percent") {
      result = direction === "decrease" ? p * (1 - numValue / 100) : p * (1 + numValue / 100);
    } else {
      result = direction === "decrease" ? p - numValue : p + numValue;
    }
    return clamp0(Math.round(result));
  }

  const selectedItems = allStock.filter(s => selected.has(s.id));
  const canPreview = selectedItems.length > 0 && numValue > 0;
  const totalOld = selectedItems.reduce((s, it) => s + (Number(it.price) || 0), 0);
  const totalNew = selectedItems.reduce((s, it) => s + computeNewPrice(it.price), 0);

  function handleApply() {
    const updates = selectedItems.map(it => ({
      accountId: it.accountId,
      stockItemId: it.id,
      newPrice: computeNewPrice(it.price),
    }));
    onApply(updates);
    showToast?.(`ปรับราคาแล้ว ${updates.length} รายการ`);
    onClose();
  }

  return (
    <Modal title="ปรับราคาสินค้าทั้งหมด" onClose={onClose}>
      {!confirming ? (
        <>
          <div className="pgs-field">
            <label className="pgs-label">ค้นหาสินค้า (ชื่อ / ไอดี / รหัสสินค้า)</label>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
              <input className="pgs-input" style={{ paddingLeft: 30 }} value={query} onChange={e => setQuery(e.target.value)} placeholder="พิมพ์เพื่อกรองรายการ" />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{selected.size} รายการที่เลือก จากทั้งหมด {allStock.length}</span>
            <button type="button" className="pgs-btn pgs-btn-outline" style={{ padding: "5px 10px", fontSize: 12 }} onClick={toggleAllFiltered}>
              {allFilteredSelected ? <CheckSquare size={13} /> : <Square size={13} />} เลือกทั้งหมด{query ? " (ที่กรองอยู่)" : ""}
            </button>
          </div>

          <div className="pgs-card" style={{ maxHeight: 260, overflowY: "auto", padding: 6, marginBottom: 14 }}>
            {filtered.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: 10, textAlign: "center" }}>ไม่พบสินค้า</div>
            )}
            {filtered.map(s => (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} style={{ width: 16, height: 16, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name || "(ไม่มีชื่อ)"} <span style={{ color: "var(--muted)", fontSize: 11 }}>{variantLabel(data, s.variants?.[0])}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.accountName}{s.productCode ? ` · ${s.productCode}` : ""}</div>
                </div>
                <div className="pgs-mono" style={{ fontSize: 13, flexShrink: 0 }}>{fmtMoney(s.price || 0)}</div>
              </label>
            ))}
          </div>

          <div className="pgs-field">
            <label className="pgs-label">รูปแบบการปรับ</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={"pgs-btn " + (adjustMode === "percent" ? "pgs-btn-primary" : "pgs-btn-outline")} style={{ flex: 1 }} onClick={() => setAdjustMode("percent")}>
                <Percent size={14} /> เปอร์เซ็นต์
              </button>
              <button type="button" className={"pgs-btn " + (adjustMode === "amount" ? "pgs-btn-primary" : "pgs-btn-outline")} style={{ flex: 1 }} onClick={() => setAdjustMode("amount")}>
                <Banknote size={14} /> จำนวนเงิน (บาท)
              </button>
            </div>
          </div>

          <div className="pgs-field">
            <label className="pgs-label">ทิศทาง</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={"pgs-btn " + (direction === "decrease" ? "pgs-btn-primary" : "pgs-btn-outline")} style={{ flex: 1 }} onClick={() => setDirection("decrease")}>
                <TrendingDown size={14} /> ลดราคา
              </button>
              <button type="button" className={"pgs-btn " + (direction === "increase" ? "pgs-btn-primary" : "pgs-btn-outline")} style={{ flex: 1 }} onClick={() => setDirection("increase")}>
                <TrendingUp size={14} /> เพิ่มราคา
              </button>
            </div>
          </div>

          <div className="pgs-field">
            <label className="pgs-label">{adjustMode === "percent" ? "ลด/เพิ่มกี่เปอร์เซ็นต์" : "ลด/เพิ่มกี่บาท (ต่อชิ้น)"}</label>
            <input className="pgs-input pgs-mono" type="number" min="0" value={value} onChange={e => setValue(e.target.value)} placeholder={adjustMode === "percent" ? "เช่น 10" : "เช่น 50"} />
          </div>

          <button
            className="pgs-btn pgs-btn-primary" style={{ width: "100%" }}
            disabled={!canPreview}
            onClick={() => setConfirming(true)}
          >
            ดูตัวอย่างราคาใหม่ ({selected.size} รายการ)
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
            ตรวจสอบราคาใหม่ก่อนยืนยัน — เปลี่ยน {selectedItems.length} รายการ
          </div>
          <div className="pgs-card" style={{ maxHeight: 300, overflowY: "auto", padding: 6, marginBottom: 14 }}>
            {selectedItems.map(s => {
              const np = computeNewPrice(s.price);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {s.name} <span style={{ color: "var(--muted)", fontSize: 11 }}>{variantLabel(data, s.variants?.[0])}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.accountName}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="pgs-mono" style={{ fontSize: 11, color: "var(--muted)", textDecoration: "line-through" }}>{fmtMoney(s.price || 0)}</div>
                    <div className="pgs-mono" style={{ fontSize: 13, color: direction === "decrease" ? "var(--red, #FF5470)" : "var(--green, #33C481)", fontWeight: 700 }}>{fmtMoney(np)}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pgs-row" style={{ fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--muted)" }}>รวมราคาเดิม</span>
            <span className="pgs-mono">{fmtMoney(totalOld)}</span>
          </div>
          <div className="pgs-row" style={{ fontSize: 13, marginBottom: 16 }}>
            <span style={{ color: "var(--muted)" }}>รวมราคาใหม่</span>
            <span className="pgs-mono" style={{ fontWeight: 700 }}>{fmtMoney(totalNew)}</span>
          </div>
          <button className="pgs-btn pgs-btn-primary" style={{ width: "100%", marginBottom: 8 }} onClick={handleApply}>
            ยืนยันปรับราคา {selectedItems.length} รายการ
          </button>
          <button className="pgs-btn pgs-btn-outline" style={{ width: "100%" }} onClick={() => setConfirming(false)}>ย้อนกลับไปแก้ไข</button>
        </>
      )}
    </Modal>
  );
}
