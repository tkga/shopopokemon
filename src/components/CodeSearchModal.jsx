import { useState } from "react";
import {
  Search,
  Image as ImageIcon,
} from "lucide-react";
import { findStockByProductCode, fmtMoney, clamp0 } from "../utils.js";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";

// ค้นหาสต๊อกด้วย "รหัสสินค้า" (เช่น A014) ข้ามทุกไอดีเกม — แก้ปัญหาต้องไล่เปิดทีละไอดีเวลาลูกค้า
// ส่งรูปสินค้าที่เลือกจากหน้า catalog กลับมา รหัสเดียวกันอาจเจอได้หลายไอดี (ของชนิดเดียวกันคนละไอดี)
// แตะรายการไหนจะเปิดฟอร์มแก้ไขสต๊อกชิ้นนั้นไปเลย พร้อมตัดสต๊อก/แก้ไขได้ทันที
export default function CodeSearchModal({ data, onClose, onOpenStock }) {
  const [q, setQ] = useState("");
  const results = q.trim() ? findStockByProductCode(data, q) : [];
  return (
    <Modal title="ค้นหาด้วยรหัสสินค้า" onClose={onClose}>
      <div className="pgs-field">
        <label className="pgs-label">รหัสสินค้าที่ลูกค้าส่งมา (เช่น A014)</label>
        <div style={{ position: "relative" }}>
          <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 12, top: 12 }} />
          <input
            className="pgs-input pgs-mono" style={{ paddingLeft: 32, textTransform: "uppercase" }}
            autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="A014"
          />
        </div>
      </div>
      {!q.trim() ? (
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
          พิมพ์รหัสสินค้าที่แสดงอยู่บนการ์ดสินค้าในหน้า catalog เพื่อดูว่าสินค้าชิ้นนี้อยู่ไอดีไหนบ้าง — สินค้าชนิดเดียวกัน
          จากคนละไอดีจะมีรหัสเดียวกันเสมอ ถ้าเจอมากกว่า 1 รายการ แปลว่ามีของอยู่หลายไอดี
        </div>
      ) : results.length === 0 ? (
        <EmptyState text="ไม่พบสินค้าที่ตรงกับรหัสนี้" />
      ) : (
        results.map(({ account, item }) => (
          <div
            key={account.id + "_" + item.id} className="pgs-row"
            style={{ padding: "10px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
            onClick={() => onOpenStock(account, item)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              {item.photoDataUrl ? (
                <img src={item.photoDataUrl} alt={item.name} style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--surface2)", border: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={15} color="var(--muted)" />
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>ไอดี {account.name} · เหลือ {clamp0(item.quantity)}</div>
              </div>
            </div>
            {item.price > 0 && <span className="pgs-mono" style={{ fontWeight: 700, fontSize: 13, flexShrink: 0 }}>฿{fmtMoney(item.price)}</span>}
          </div>
        ))
      )}
    </Modal>
  );
}
