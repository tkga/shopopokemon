import {
  Home,
  Package,
  Users,
  Gamepad2,
  MoreHorizontal,
} from "lucide-react";

export default function BottomNav({ tab, setTab, onMore }) {
  const items = [
    { id: "dashboard", label: "หน้าแรก", icon: Home },
    { id: "orders", label: "ออเดอร์", icon: Package },
    { id: "customers", label: "ลูกค้า", icon: Users },
    { id: "accounts", label: "ไอดีเกม", icon: Gamepad2 },
  ];
  return (
    <div className="pgs-bottomnav">
      {items.map(it => (
        <button key={it.id} className={"pgs-navitem" + (tab === it.id ? " active" : "")} onClick={() => setTab(it.id)}>
          <it.icon size={19} />
          {it.label}
        </button>
      ))}
      {/* "เพิ่มเติม" ครอบคลุมหน้าที่ย้ายไปอยู่ใน MoreSheet: การเงิน, รายงาน, ตั้งค่า (ถังขยะ เป็น modal ไม่ใช่แท็บ) */}
      <button className={"pgs-navitem" + (["finance", "reports", "settings"].includes(tab) ? " active" : "")} onClick={onMore}>
        <MoreHorizontal size={19} />
        เพิ่มเติม
      </button>
    </div>
  );
}
