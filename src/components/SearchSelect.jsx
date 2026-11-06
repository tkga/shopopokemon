import { useState, useRef } from "react";
import { ChevronDown, Search } from "lucide-react";

// ดรอปดาวน์แบบพิมพ์ค้นหาได้ ใช้แทน <select> เวลารายการยาว (ลูกค้า, ไอดีต้นทาง ฯลฯ)
// props:
//   value       ค่าที่เลือกอยู่ (string)
//   onChange    (value) => void
//   options     [{ value, label, sub? }]  sub = ข้อความรองด้านขวา (ไม่บังคับ)
//   emptyOption { value, label } ตัวเลือกพิเศษไว้บนสุด เช่น { value: "", label: "- ไม่ระบุ -" } (ไม่บังคับ)
//   placeholder ข้อความตอนยังไม่เลือก / ในช่องค้นหา
const norm = (s) => (s || "").toString().toLowerCase().replace(/\s+/g, "");

export default function SearchSelect({ value, onChange, options = [], emptyOption, placeholder = "ค้นหา...", autoFocus }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const all = emptyOption ? [emptyOption, ...options] : options;
  const selected = all.find((o) => o.value === value);
  const q = norm(query);
  const filtered = q ? all.filter((o) => norm(o.label).includes(q) || norm(o.sub).includes(q)) : all;

  function openList() {
    setQuery("");
    setOpen(true);
  }
  function pick(o) {
    onChange(o.value);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          className="pgs-input"
          autoFocus={autoFocus}
          value={open ? query : (selected?.label ?? "")}
          placeholder={open ? (selected?.label || placeholder) : placeholder}
          onFocus={openList}
          onClick={() => { if (!open) openList(); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) pick(filtered[0]);
            } else if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          style={{ paddingRight: 34, fontWeight: open ? 400 : 600 }}
          autoComplete="off"
        />
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", display: "flex" }}>
          {open ? <Search size={14} /> : <ChevronDown size={14} />}
        </span>
      </div>
      {open && (
        <div
          className="pgs-card"
          style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, zIndex: 30, maxHeight: 240, overflowY: "auto", padding: 6, WebkitOverflowScrolling: "touch" }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "10px", fontSize: 12, color: "var(--muted)", textAlign: "center" }}>ไม่พบรายการที่ตรงกับ "{query}"</div>
          ) : (
            filtered.map((o) => {
              const active = o.value === value;
              return (
                <div
                  key={o.value || "__empty"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(o)}
                  style={{
                    padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                    display: "flex", justifyContent: "space-between", gap: 8,
                    fontWeight: active ? 700 : 500,
                    color: active ? "var(--yellow)" : "var(--text)",
                    background: active ? "rgba(255,203,5,0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <span>{o.label}</span>
                  {o.sub ? <span className="pgs-mono" style={{ color: "var(--muted)", fontSize: 11 }}>{o.sub}</span> : null}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
