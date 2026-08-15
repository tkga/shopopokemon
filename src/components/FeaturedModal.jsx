import { useState, useRef, useEffect } from "react";
import { GripVertical, Star, X, Search } from "lucide-react";
import Modal from "./Modal.jsx";
import { featuredStockList, variantLabel } from "../utils.js";

// เมนู "สินค้าแนะนำ" — เลือกสินค้าจากทุกไอดีมาปักไว้ให้ขึ้นก่อนในหน้า catalog ของลูกค้า
// ลากจัดลำดับได้ (ลากด้วยไอคอน ⠿ ด้านซ้ายของแต่ละแถว) ลำดับจะถูกเขียนกลับเป็น featuredOrder
// (0,1,2,...) ใน gameAccounts ทันทีที่ปล่อยนิ้ว/เมาส์ — ดู applyFeaturedOrder/toggleFeatured ใน utils.js
export default function FeaturedModal({ data, onClose, onToggleFeatured, onReorder }) {
  const featured = featuredStockList(data); // [{account,item}] เรียงตาม featuredOrder แล้ว

  // ลำดับที่กำลังลากอยู่ในเครื่อง (sync จาก props ทุกครั้งที่ data เปลี่ยนจากภายนอก เช่น toggle ปิดจาก modal นี้เอง)
  const [order, setOrder] = useState(featured.map((f) => f.item.id));
  useEffect(() => { setOrder(featured.map((f) => f.item.id)); }, [data.gameAccounts]);

  const byId = {};
  (data.gameAccounts || []).forEach((a) => (a.stock || []).forEach((s) => { byId[s.id] = { account: a, item: s }; }));
  const orderedFeatured = order.map((id) => byId[id]).filter(Boolean);

  const rowRefs = useRef({});
  const dragId = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  function onPointerDown(e, id) {
    dragId.current = id;
    setDraggingId(id);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragId.current) return;
    const y = e.clientY;
    let bestId = null;
    let bestDist = Infinity;
    Object.entries(rowRefs.current).forEach(([id, el]) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(mid - y);
      if (dist < bestDist) { bestDist = dist; bestId = id; }
    });
    if (bestId && bestId !== dragId.current) {
      setOrder((prev) => {
        const from = prev.indexOf(dragId.current);
        const to = prev.indexOf(bestId);
        if (from === -1 || to === -1) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, dragId.current);
        return next;
      });
    }
  }
  function onPointerUp() {
    if (dragId.current) onReorder(order);
    dragId.current = null;
    setDraggingId(null);
  }

  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const featuredIdSet = new Set(order);
  const candidates = [];
  (data.gameAccounts || []).forEach((a) => (a.stock || []).forEach((s) => {
    if (featuredIdSet.has(s.id)) return;
    if (q && !((s.name || "").toLowerCase().includes(q) || (a.name || "").toLowerCase().includes(q) || (s.productCode || "").toLowerCase().includes(q))) return;
    candidates.push({ account: a, item: s });
  }));
  candidates.sort((x, y) => (x.item.name || "").localeCompare(y.item.name || "", "th"));
  const showCandidates = q ? candidates : candidates.slice(0, 20);

  return (
    <Modal title="สินค้าแนะนำ" onClose={onClose}>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        สินค้าที่ปักไว้ด้านล่างจะถูกดันขึ้นแสดงก่อนในหน้าร้านของลูกค้า (เฉพาะชิ้นที่ยังมีของ) ตามลำดับที่จัดไว้ — ลาก ⠿ เพื่อสลับลำดับ
      </div>

      {orderedFeatured.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 10px", fontSize: 12, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 10, marginBottom: 16 }}>
          ยังไม่มีสินค้าแนะนำ — ค้นหาด้านล่างเพื่อเพิ่ม
        </div>
      ) : (
        <div style={{ marginBottom: 18 }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {orderedFeatured.map(({ account, item }, i) => (
            <div
              key={item.id}
              ref={(el) => { rowRefs.current[item.id] = el; }}
              className="pgs-card"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8,
                opacity: draggingId === item.id ? 0.55 : 1,
                borderColor: draggingId === item.id ? "var(--yellow-dim, var(--border))" : undefined,
              }}
            >
              <div
                onPointerDown={(e) => onPointerDown(e, item.id)}
                style={{ touchAction: "none", cursor: "grab", color: "var(--muted)", flexShrink: 0, display: "flex", padding: 4 }}
              >
                <GripVertical size={16} />
              </div>
              <div style={{ width: 22, textAlign: "center", fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{i + 1}</div>
              {item.photoDataUrl ? (
                <img src={item.photoDataUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--surface-2)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {variantLabel(data, item.variants?.[0])} · {account.name}
                </div>
              </div>
              <button
                type="button"
                className="pgs-btn pgs-btn-outline"
                style={{ padding: 8, flexShrink: 0 }}
                onClick={() => onToggleFeatured(item.id)}
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
          {showCandidates.map(({ account, item }) => (
            <div key={item.id} className="pgs-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 8 }}>
              {item.photoDataUrl ? (
                <img src={item.photoDataUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--surface-2)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {variantLabel(data, item.variants?.[0])} · {account.name}{item.productCode ? ` · ${item.productCode}` : ""}
                </div>
              </div>
              <button type="button" className="pgs-btn pgs-btn-primary" style={{ padding: "6px 10px", fontSize: 12, flexShrink: 0, display: "flex", alignItems: "center", gap: 4 }} onClick={() => onToggleFeatured(item.id)}>
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
