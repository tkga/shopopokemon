import {
  X,
} from "lucide-react";

export default function Modal({ title, onClose, children, footer }) {
  return (
    <div className="pgs-overlay" onClick={onClose}>
      <div className="pgs-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="pgs-row" style={{ marginBottom: 14 }}>
          <h3 className="pgs-display" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h3>
          <button className="pgs-btn pgs-btn-outline" style={{ padding: 8 }} onClick={onClose}><X size={16} /></button>
        </div>
        {children}
        {footer && <div style={{ marginTop: 16 }}>{footer}</div>}
      </div>
    </div>
  );
}
