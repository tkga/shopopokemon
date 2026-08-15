import {
  MoreHorizontal,
} from "lucide-react";
import ShopLogo from "./ShopLogo.jsx";

export default function Header({ data, onMore }) {
  return (
    <div className="pgs-header">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <ShopLogo logoDataUrl={data.settings.logoDataUrl} />
        <div>
          <div className="pgs-display" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.1 }}>{data.settings.shopName}</div>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>ระบบจัดการร้าน</div>
        </div>
      </div>
      <button className="pgs-btn pgs-btn-outline" style={{ padding: 8 }} onClick={onMore}><MoreHorizontal size={16} /></button>
    </div>
  );
}
