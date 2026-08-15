import { useState } from "react";
import { INVEST_TYPES } from "../constants.js";
import { genId, todayStr } from "../utils.js";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";

export default function TxModal({ data, onClose, onSaveInvestment, onSaveManual, presetAccount }) {
  const [mode, setMode] = useState("investment");
  const [invForm, setInvForm] = useState({ id: genId(), accountId: presetAccount || data.gameAccounts[0]?.id || "", type: "topup", amount: "", date: todayStr(), note: "" });
  const [manForm, setManForm] = useState({ id: genId(), type: "expense", category: "อื่นๆ", amount: "", date: todayStr(), note: "", accountId: presetAccount || "" });

  return (
    <Modal title="เพิ่มรายการการเงิน" onClose={onClose}>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button className={"pgs-chip" + (mode === "investment" ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setMode("investment")}>เติม Coin / ซื้อ Pokémon</button>
        <button className={"pgs-chip" + (mode === "manual" ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setMode("manual")}>รายการอื่นๆ</button>
      </div>

      {mode === "investment" ? (
        <>
          {data.gameAccounts.length === 0 ? <EmptyState text="กรุณาเพิ่มไอดีเกมก่อน" /> : (
            <>
              <div className="pgs-field">
                <label className="pgs-label">ไอดีเกม</label>
                <select className="pgs-select" value={invForm.accountId} onChange={e => setInvForm(f => ({ ...f, accountId: e.target.value }))}>
                  {data.gameAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="pgs-field">
                <label className="pgs-label">ประเภท</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(INVEST_TYPES).map(([k, v]) => (
                    <button key={k} className={"pgs-chip" + (invForm.type === k ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setInvForm(f => ({ ...f, type: k }))}>{v.label}</button>
                  ))}
                </div>
              </div>
              <div className="pgs-field">
                <label className="pgs-label">จำนวนเงิน (บาท)</label>
                <input className="pgs-input pgs-mono" type="number" value={invForm.amount} onChange={e => setInvForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="pgs-field">
                <label className="pgs-label">วันที่</label>
                <input className="pgs-input" type="date" value={invForm.date} onChange={e => setInvForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="pgs-field">
                <label className="pgs-label">หมายเหตุ</label>
                <input className="pgs-input" value={invForm.note} onChange={e => setInvForm(f => ({ ...f, note: e.target.value }))} />
              </div>
              <button className="pgs-btn pgs-btn-primary" style={{ width: "100%" }} disabled={!invForm.amount || !invForm.accountId} onClick={() => onSaveInvestment({ ...invForm, amount: Number(invForm.amount) })}>บันทึก</button>
            </>
          )}
        </>
      ) : (
        <>
          <div className="pgs-field">
            <label className="pgs-label">ประเภท</label>
            <div style={{ display: "flex", gap: 6 }}>
              <button className={"pgs-chip" + (manForm.type === "income" ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setManForm(f => ({ ...f, type: "income" }))}>รายรับ</button>
              <button className={"pgs-chip" + (manForm.type === "expense" ? " active" : "")} style={{ flex: 1, textAlign: "center" }} onClick={() => setManForm(f => ({ ...f, type: "expense" }))}>รายจ่าย</button>
            </div>
          </div>
          <div className="pgs-field">
            <label className="pgs-label">รายการ</label>
            <input className="pgs-input" value={manForm.category} onChange={e => setManForm(f => ({ ...f, category: e.target.value }))} placeholder="เช่น ค่าธรรมเนียมโอน" />
          </div>
          <div className="pgs-field">
            <label className="pgs-label">จำนวนเงิน (บาท)</label>
            <input className="pgs-input pgs-mono" type="number" value={manForm.amount} onChange={e => setManForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div className="pgs-field">
            <label className="pgs-label">วันที่</label>
            <input className="pgs-input" type="date" value={manForm.date} onChange={e => setManForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="pgs-field">
            <label className="pgs-label">เกี่ยวข้องกับไอดีเกม (ถ้ามี)</label>
            <select className="pgs-select" value={manForm.accountId} onChange={e => setManForm(f => ({ ...f, accountId: e.target.value }))}>
              <option value="">ไม่เกี่ยวกับไอดีใด</option>
              {data.gameAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <button className="pgs-btn pgs-btn-primary" style={{ width: "100%" }} disabled={!manForm.amount} onClick={() => onSaveManual({ ...manForm, amount: Number(manForm.amount) })}>บันทึก</button>
        </>
      )}
    </Modal>
  );
}
