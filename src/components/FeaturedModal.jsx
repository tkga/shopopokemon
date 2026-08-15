import { useState, useRef, useEffect } from "react";
import { GripVertical, Star, X, Search } from "lucide-react";
import Modal from "./Modal.jsx";
import { featuredProductCodes, variantLabel } from "../utils.js";

// เมนู "สินค้าแนะนำ" — เลือก "สินค้า" (ผูกกับรหัสสินค้า เช่น A014 ไม่ใช่หน่วยสต๊อกในไอดีใดไอดีหนึ่ง)
// มาปักไว้ให้ขึ้นก่อนในหน้า catalog ของลูกค้า ของชนิดเดียวกันที่มีหลายไอดีถือครองอยู่จะโชว์ครั้งเดียว
// (จำนวนรวมทุกไอดี) ลากจัดลำดับได้ (ลากด้วยไอคอน ⠿) — ดู toggleFeatured/applyFeaturedOrder ใน utils.js

// รวมข้อมูลสต๊อกของ "รหัสสินค้า" นี้จากทุกไอดี — จำนวนรวม, รูปตัวแทน, รายชื่อไอดีที่ถือของอยู่
function aggregateByCode(data, code) {
  let qty = 0;
  let photoDataUrl = "";
  let variantKey = "";
  let name = "";
  const accountNames = [];
  (data.gameAccounts || []).forEach((a) => (a.stock || []).forEach((s) => {
    if (s.productCode !== code) return;
    qty += Number(s.quantity) || 0;
    if (!photoDataUrl && s.photoDataUrl) photoDataUrl = s.photoDataUrl;
    if (!variantKey) variantKey = s.variants?.[0] || "";
    if (!name) name = s.name || "";
    accountNames.push(a.name || "-");
  }));
  return { qty, photoDataUrl, variantKey, name, accountNames };
}

export default function FeaturedModal({ data, onClose, onToggleFeatured, onReorder }) {
  const featuredCodes = featuredProductCodes(data); // [{key,code,name,variant,featuredOrder}] เรียงแล้ว

  // ลำดับที่กำลังลากอยู่ในเครื่อง (sync จาก props ทุกครั้งที่ productCodes เปลี่ยนจากภายนอก เช่น toggle ปิดจาก modal นี้เอง)
  const [order, setOrder] = useState(featuredCodes.map((p) => p.code));
  useEffect(() => { setOrder(featuredCodes.map((p) => p.code)); }, [data.productCodes]);

  const orderedFeatured = order
    .map((code) => ({ code, agg: aggregateByCode(data, code) }))
    .filter((x) => x.agg.name); // กันรหัสกำพร้าที่ไม่มีสต๊อกเหลือในระบบแล้ว

  const rowRefs = useRef({});
  const dragCode = useRef(null);
  const [draggingCode, setDraggingCode] = useState(null);

  function onPointerDown(e, code) {
    dragCode.current = code;
    setDraggingCode(code);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragCode.current) return;
    const y = e.clientY;
    let bestCode = null;
    let bestDist = Infinity;
    Object.entries(rowRefs.current).forEach(([code, el]) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(mid - y);
      if (dist < bestDist) { bestDist = dist; bestCode = code; }
    });
    if (bestCode && bestCode !== dragCode.current) {
      setOrder((prev) => {
        const from = prev.indexOf(dragCode.current);
        const to = prev.indexOf(bestCode);
        if (from === -1 || to === -1) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, dragCode.current);
        return next;
      });
    }
  }
  function onPointerUp() {
    if (dragCode.current) onReorder(order);
    dragCode.current = null;
    setDraggingCode(null);
  }

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const featuredCodeSet = new Set(order);
  // สร้างรายชื่อ "รหัสสินค้า" ที่ยังไม่ได้แนะนำ ตรงๆ จาก registry data.productCodes (หนึ่งแถวต่อหนึ่งชนิดสินค้า
  // อยู่แล้ว) ไม่ไล่จาก gameAccounts.stock — กันไม่ให้ของชนิดเดียวกันที่มีหลายไอดีโผล่ซ้ำหลายแถว
  const candidates = (data.productCodes || [])
    .filter((p) => !featuredCodeSet.has(p.code))
    .map((p) => ({ code: p.code, agg: aggregateByCode(data, p.code) }))
    .filter((x) => x.agg.name) // ซ่อนรหัสที่ไม่มีสต๊อกเหลือในระบบแล้ว (ของถูกลบทิ้งหมดทุกไอดี)
    .filter((x) => {
      if (!q) return true;
      const hay = (x.agg.name + " " + x.code + " " + x.agg.accountNames.join(" ")).toLowerCase();
      return hay.includes(q);
    });
  candidates.sort((a, b) => a.agg.name.localeCompare(b.agg.name, "th"));
  const showCandidates = q ? candidates : candidates.slice(0, 20);

  return (
    <Modal title="สินค้าแนะนำ" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        สินค้าที่ปักไว้ด้านล่างจะถูกดันขึ้นแสดงก่อนในหน้าร้านของลูกค้า (เฉพาะชิ้นที่ยังมีของ) ตามลำดับที่จัดไว้ —
        ผูกกับรหัสสินค้า ไม่ใช่ไอดีใดไอดีหนึ่ง ถ้ามีของชนิดนี้หลายไอดีจะนับรวมกันเป็นรายการเดียว ลาก ⠿ เพื่อสลับลำดับ
      </div>

      {orderedFeatured.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 10px", fontSize: 12, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 10, marginBottom: 16 }}>
          ยังไม่มีสินค้าแนะนำ — ค้นหาด้านล่างเพื่อเพิ่ม
        </div>
      ) : (
        <div style={{ marginBottom: 18 }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {orderedFeatured.map(({ code, agg }, i) => (
            <div
              key={code}
              ref={(el) => { rowRefs.current[code] = el; }}
              className="pgs-card"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8,
                opacity: draggingCode === code ? 0.55 : 1,
                borderColor: draggingCode === code ? "var(--yellow-dim, var(--border))" : undefined,
              }}
            >
              <div
                onPointerDown={(e) => onPointerDown(e, code)}
                style={{ touchAction: "none", cursor: "grab", color: "var(--muted)", flexShrink: 0, display: "flex", padding: 4 }}
              >
                <GripVertical size={16} />
              </div>
              <div style={{ width: 22, textAlign: "center", fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</div>
              {agg.photoDataUrl ? (
                <img src={agg.photoDataUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface-2)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agg.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {variantLabel(data, agg.variantKey)} · {agg.accountNames.join(", ")} · {code}
                </div>
              </div>
              <button
                type="button"
                className="pgs-btn pgs-btn-outline"
                style={{ padding: 8, flexShrink: 0 }}
                onClick={() => onToggleFeatured(code)}
                title="เอาออกจากรายการแนะนำ"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pgs-field">
        <label className="pgs-label">เพิ่มสินค้าแนะนำ</label>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          <input
            className="pgs-input"
            style={{ paddingLeft: 30 }}
            placeholder="ค้นหาชื่อ Pokémon, ไอดี, หรือรหัสสินค้า"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {showCandidates.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted)", padding: "8px 2px" }}>
          {q ? "ไม่พบสินค้าที่ตรงกับคำค้นหา" : "ยังไม่มีสินค้าในสต๊อก"}
        </div>
      ) : (
        <div>
          {showCandidates.map(({ code, agg }) => (
            <div key={code} className="pgs-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8 }}>
              {agg.photoDataUrl ? (
                <img src={agg.photoDataUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-2)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{agg.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {variantLabel(data, agg.variantKey)} · {agg.accountNames.join(", ")} · {code}
                </div>
              </div>
              <button type="button" className="pgs-btn pgs-btn-primary" style={{ padding: "6px 10px", fontSize: 12, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }} onClick={() => onToggleFeatured(code)}>
                <Star size={12} /> เพิ่ม
              </button>
            </div>
          ))}
          {!q && candidates.length > showCandidates.length && (
            <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", padding: "4px 0" }}>
              แสดง {showCandidates.length} จากทั้งหมด {candidates.length} รายการ — พิมพ์ค้นหาเพื่อดูเพิ่ม
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
