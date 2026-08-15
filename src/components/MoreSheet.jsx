import {
  X,
  ChevronRight,
  Wallet,
  Settings as SettingsIcon,
  BarChart3,
  Trash2,
  Star,
} from "lucide-react";

export default function MoreSheet({ onClose, go }) {
  // ลูกค้า/ไอดีเกม ย้ายไปเป็นแท็บหลักใน BottomNav แล้ว เหลือแค่หน้าที่ใช้ไม่บ่อยเท่าไว้ที่นี่
  // "ถังขยะ" ไม่ใช่แท็บ แต่เป็น modal — go("trash") จะถูกจัดการเป็นกรณีพิเศษใน App.jsx
  const items = [
    { id: "finance", label: "การเงิน", icon: Wallet, desc: "รายรับ-รายจ่ายทั้งหมด" },
    { id: "reports", label: "รายงาน", icon: BarChart3, desc: "สรุปผลประกอบการ" },
    { id: "featured", label: "สินค้าแนะนำ", icon: Star, desc: "เลือก/จัดลำดับสินค้าที่จะโชว์ก่อนในหน้าร้าน" },
    { id: "settings", label: "ตั้งค่า", icon: SettingsIcon, desc: "ร้าน, Backup, Export" },
    { id: "trash", label: "ถังขยะ", icon: Trash2, desc: "กู้คืน / ลบถาวรรายการที่ลบไป" },
  ];
  return (
    <div className="pgs-overlay" onClick={onClose}>
      <div className="pgs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pgs-row" style={{ marginBottom: 14 }}>
          <h3 className="pgs-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>เมนูเพิ่มเติม</h3>
          <button className="pgs-btn pgs-btn-outline" style={{ padding: 8 }} onClick={onClose}><X size={16} /></button>
        </div>
        {items.map(it => (
          <button key={it.id} onClick={() => go(it.id)} className="pgs-card" style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", marginBottom: 10, cursor: "pointer", textAlign: "left" }}>
            <div style={{ background: "var(--surface2)", borderRadius: 12, padding: 10 }}><it.icon size={18} color="var(--yellow)" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{it.label}</div>
              <div style={{ fontSize: 11, color: "#9ca3af" }}>{it.desc}</div>
            </div>
            <ChevronRight size={16} color="var(--muted)" />
          </button>
        ))}
      </div>
    </div>
  );
}
