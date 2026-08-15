import { useState } from "react";
import { genId, existingAccountNames } from "../utils.js";
import Modal from "./Modal.jsx";

export default function AccountModal({ mode, item, data, onClose, onSave }) {
  const [form, setForm] = useState(item || { id: genId(), name: "", note: "", createdAt: new Date().toISOString() });
  return (
    <Modal title={mode === "add" ? "เพิ่มไอดีเกม" : "แก้ไขไอดีเกม"} onClose={onClose}>
      <div className="pgs-field">
        <label className="pgs-label">ชื่อไอดี</label>
        <input className="pgs-input" list="pgs-account-names" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น ID-Trainer01" />
        <datalist id="pgs-account-names">
          {existingAccountNames(data).map(n => <option key={n} value={n} />)}
        </datalist>
      </div>
      <div className="pgs-field">
        <label className="pgs-label">หมายเหตุ</label>
        <textarea className="pgs-textarea" rows={2} value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
      </div>
      <button className="pgs-btn pgs-btn-primary" style={{ width: "100%" }} disabled={!form.name} onClick={() => form.name && onSave(form)}>บันทึก</button>
    </Modal>
  );
}
