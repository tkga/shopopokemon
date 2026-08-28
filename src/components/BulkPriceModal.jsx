import { useState, useMemo } from "react";
import { Percent, Banknote, TrendingDown, TrendingUp, CheckSquare, Square, Search } from "lucide-react";
import { clamp0, fmtMoney, variantLabel } from "../utils.js";
import Modal from "./Modal.jsx";

// เมนู "ปรับราคาสินค้าทั้งหมด" — จัดกลุ่มสต๊อกทุกไอดีตาม "รหัสสินค้า" (ชื่อ+ประเภทเดียวกัน
// จากคนละไอดีจะมีรหัสเดียวกันเสมอ ดู ensureProductCode ใน utils.js) เพื่อให้ติ๊กเลือกครั้งเดียว
// ก็ปรับราคาของ Pokémon ชนิดนั้นในทุกไอดีที่ถืออยู่พร้อมกันได้ — แต่ละหน่วยยังคงราคาตัวเองอยู่
// (ปรับเป็น % หรือจำนวนเงินก็คิดจากราคาของหน่วยนั้นๆ ไม่ได้เซ็ตให้เท่ากันหมด)
export default function BulkPriceModal({ data, onClose, onApply, showToast }) {
  const [query, setQuery] = useState("");
  const [variantFilter, setVariantFilter] = useState(() => new Set()); // เลือกได้หลายประเภท — ว่าง = ทุกประเภท
  const [selected, setSelected] = useState(() => new Set()); // Set ของ group key (รหัสสินค้า หรือ ชื่อ+ประเภท ถ้าไม่มีรหัส)
  const [adjustMode, setAdjustMode] = useState("percent"); // "percent" | "amount"
  const [direction, setDirection] = useState("decrease"); // "decrease" | "increase"
  const [value, setValue] = useState("");
  const [confirming, setConfirming] = useState(false);

  // รวมสต๊อกจากทุกไอดีเกมเป็นลิสต์เดียวก่อน (สต๊อกถูกเก็บซ้อนอยู่ใน gameAccounts[].stock)
  const allStock = useMemo(() => {
    const rows = [];
    (data.gameAccounts || []).forEach(acc => {
      (acc.stock || []).forEach(s => {
        rows.push({ ...s, accountId: acc.id, accountName: acc.name || "ไม่มีชื่อ" });
      });
    });
    return rows;
  }, [data.gameAccounts]);

  // แล้วจัดกลุ่มตามรหัสสินค้า — 1 กลุ่ม = 1 ชนิด Pokémon (ชื่อ+ประเภท) อาจกระจายอยู่หลายไอดี
  const groups = useMemo(() => {
    const map = new Map();
    allStock.forEach(s => {
      const key = s.productCode || `noCode:${(s.name || "").trim().toLowerCase()}|${s.variants?.[0] || ""}`;
      if (!map.has(key)) map.set(key, { key, productCode: s.productCode || "", name: s.name, variantKey: s.variants?.[0], items: [] });
      map.get(key).items.push(s);
    });
    return Array.from(map.values());
  }, [allStock]);

  // นับจำนวนชนิดสินค้าต่อประเภท (ปกติ/Shiny/Shadow ฯลฯ) ไว้โชว์เป็นชิปตัวกรอง — เรียงตามลำดับที่ตั้งค่าไว้ใน data.pokemonVariants
  const variantChips = useMemo(() => {
    const counts = new Map();
    groups.forEach(g => {
      const k = g.variantKey || "";
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    const ordered = (data.pokemonVariants || [])
      .filter(v => counts.has(v.key))
      .map(v => ({ key: v.key, label: v.label, emoji: v.emoji, count: counts.get(v.key) }));
    if (counts.has("")) ordered.push({ key: "", label: "ไม่ระบุประเภท", emoji: "", count: counts.get("") });
    return ordered;
  }, [groups, data.pokemonVariants]);

  function toggleVariantFilter(key) {
    setVariantFilter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter(g => {
      if (variantFilter.size > 0 && !variantFilter.has(g.variantKey || "")) return false;
      if (!q) return true;
      return (
        (g.name || "").toLowerCase().includes(q) ||
        (g.productCode || "").toLowerCase().includes(q) ||
        g.items.some(it => (it.accountName || "").toLowerCase().includes(q))
      );
    });
  }, [groups, query, variantFilter]);

  const allFilteredSelected = filteredGroups.length > 0 && filteredGroups.every(g => selected.has(g.key));

  function toggleOne(key) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function toggleAllFiltered() {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredGroups.forEach(g => next.delete(g.key));
      } else {
        filteredGroups.forEach(g => next.add(g.key));
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

  function priceRangeLabel(items) {
    const prices = items.map(it => Number(it.price) || 0);
    const min = Math.min(...prices), max = Math.max(...prices);
    return min === max ? fmtMoney(min) : `${fmtMoney(min)}–${fmtMoney(max)}`;
  }

  const selectedGroups = groups.filter(g => selected.has(g.key));
  const selectedItems = selectedGroups.flatMap(g => g.items);
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

          {variantChips.length > 0 && (
            <div className="pgs-field">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label className="pgs-label" style={{ marginBottom: 0 }}>กรองตามประเภท</label>
                {variantFilter.size > 0 && (
                  <button type="button" style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "var(--yellow)", cursor: "pointer" }} onClick={() => setVariantFilter(new Set())}>ล้างตัวกรอง</button>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {variantChips.map(v => {
                  const active = variantFilter.has(v.key);
                  return (
                    <button
                      key={v.key || "none"}
                      type="button"
                      className={"pgs-btn " + (active ? "pgs-btn-primary" : "pgs-btn-outline")}
                      style={{ padding: "5px 10px", fontSize: 12 }}
                      onClick={() => toggleVariantFilter(v.key)}
                    >
                      {v.emoji ? `${v.emoji} ` : ""}{v.label} ({v.count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {selected.size} ชนิดที่เลือก จากทั้งหมด {groups.length} ชนิด ({allStock.length} รายการสต๊อก)
              {filteredGroups.length !== groups.length ? ` — กำลังกรองเหลือ ${filteredGroups.length} ชนิด` : ""}
            </span>
            <button type="button" className="pgs-btn pgs-btn-outline" style={{ padding: "5px 10px", fontSize: 12 }} onClick={toggleAllFiltered}>
              {allFilteredSelected ? <CheckSquare size={13} /> : <Square size={13} />} เลือกทั้งหมด{(query || variantFilter.size > 0) ? " (ที่กรองอยู่)" : ""}
            </button>
          </div>

          <div className="pgs-card" style={{ maxHeight: 260, overflowY: "auto", padding: 6, marginBottom: 14 }}>
            {filteredGroups.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)", padding: 10, textAlign: "center" }}>ไม่พบสินค้า</div>
            )}
            {filteredGroups.map(g => (
              <label key={g.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
                <input type="checkbox" checked={selected.has(g.key)} onChange={() => toggleOne(g.key)} style={{ width: 16, height: 16, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {g.name || "(ไม่มีชื่อ)"} <span style={{ color: "var(--muted)", fontSize: 11 }}>{variantLabel(data, g.variantKey)}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    {g.productCode || "ไม่มีรหัส"} · อยู่ใน {g.items.length} ไอดี{g.items.length > 1 ? ` (${g.items.map(it => it.accountName).join(", ")})` : ""}
                  </div>
                </div>
                <div className="pgs-mono" style={{ fontSize: 13, flexShrink: 0 }}>{priceRangeLabel(g.items)}</div>
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
            ดูตัวอย่างราคาใหม่ ({selected.size} ชนิด · {selectedItems.length} รายการสต๊อก)
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
