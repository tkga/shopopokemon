import { useState } from "react";
import {
  Plus,
  X,
} from "lucide-react";
import { genId } from "../utils.js";
import Modal from "./Modal.jsx";

export default function CustomerModal({ mode, item, onClose, onSave }) {
  const [form, setForm] = useState(item || {
    id: genId(), name: "", facebook: "", note: "",
    gameIds: [{ id: genId(), value: "" }],
    createdAt: new Date().toISOString(), _isNew: true,
  });
  const [touched, setTouched] = useState(false);
  const updateGameId = (id, value) => setForm(f => ({ ...f, gameIds: f.gameIds.map(g => g.id === id ? { ...g, value } : g) }));
  const addGameId = () => setForm(f => ({ ...f, gameIds: [...f.gameIds, { id: genId(), value: "" }] }));
  const removeGameId = (id) => setForm(f => ({ ...f, gameIds: f.gameIds.length > 1 ? f.gameIds.filter(g => g.id !== id) : f.gameIds }));
  const hasGameId = form.gameIds.some(g => (g.value || "").trim());
  const nameOk = !!(form.name || "").trim();
  const fbOk = !!(form.facebook || "").trim();
  const canSave = nameOk && hasGameId && fbOk;
  const err = (bad) => (touched && bad ? { borderColor: "var(--red)" } : undefined);
  return (
    <Modal title={mode === "add" ? "เพิ่มลูกค้า" : "แก้ไขลูกค้า"} onClose={onClose}>
      <div className="pgs-field">
        <label className="pgs-label">ชื่อลูกค้า *</label>
        <input className="pgs-input" style={err(!nameOk)} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น Ash_Ketchum99" />
        {touched && !nameOk && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>กรุณากรอกชื่อลูกค้า</div>}
      </div>
      <div className="pgs-field">
        <label className="pgs-label">ไอดีในเกม (เพิ่มได้หลายไอดี) *</label>
        {form.gameIds.map((g, i) => (
          <div key={g.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input className="pgs-input" style={err(!hasGameId)} value={g.value} onChange={e => updateGameId(g.id, e.target.value)} placeholder={`ไอดี #${i + 1}`} />
            {form.gameIds.length > 1 && (
              <button type="button" className="pgs-iconbtn" onClick={() => removeGameId(g.id)}><X size={14} /></button>
            )}
          </div>
        ))}
        <button type="button" className="pgs-btn pgs-btn-outline" style={{ width: "100%" }} onClick={addGameId}><Plus size={14} /> เพิ่มไอดี</button>
        {touched && !hasGameId && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>กรุณากรอกไอดีในเกมอย่างน้อย 1 ไอดี</div>}
      </div>
      <div className="pgs-field">
        <label className="pgs-label">Facebook *</label>
        <input className="pgs-input" style={err(!fbOk)} value={form.facebook} onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))} placeholder="ชื่อ / ลิงก์โปรไฟล์" />
        {touched && !fbOk && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 4 }}>กรุณากรอกชื่อ Facebook</div>}
      </div>
      <div className="pgs-field">
        <label className="pgs-label">หมายเหตุ</label>
        <textarea className="pgs-textarea" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
      </div>
      <button
        className="pgs-btn pgs-btn-primary" style={{ width: "100%", opacity: canSave ? 1 : 0.6 }}
        onClick={() => { if (canSave) onSave(form); else setTouched(true); }}
      >บันทึก</button>
    </Modal>
  );
}
