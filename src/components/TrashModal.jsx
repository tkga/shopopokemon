import { useState } from "react";
import {
  Trash2,
  RotateCcw,
} from "lucide-react";
import { fmtDate } from "../utils.js";
import { trashItemTitle, trashItemSub } from "../receipt.js";
import Modal from "./Modal.jsx";
import EmptyState from "./EmptyState.jsx";

const TRASH_TYPE_LABEL = { customer: "ลูกค้า", account: "ไอดีเกม", stock: "สต๊อก", order: "ออเดอร์" };

export default function TrashModal({ data, onClose, onRestore, onPurge }) {
  const [confirmPurgeId, setConfirmPurgeId] = useState(null);
  const trash = data.trash || [];
  const accountExists = (id) => data.gameAccounts.some(a => a.id === id);
  return (
    <Modal title="ถังขยะ" onClose={onClose}>
      {trash.length === 0 ? (
        <EmptyState text="ถังขยะว่างเปล่า" />
      ) : (
        <>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
            รายการที่ลบจะพักไว้ที่นี่และถูกลบถาวรอัตโนมัติหลังจาก 30 วัน — กู้คืนได้ตลอดในช่วงนี้
          </div>
          {trash.map(entry => {
            const canRestore = entry.type !== "stock" || accountExists(entry.meta?.accountId);
            return (
              <div key={entry.id} className="pgs-card" style={{ marginBottom: 8 }}>
                <div className="pgs-row" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--yellow)", fontWeight: 700, textTransform: "uppercase" }}>{TRASH_TYPE_LABEL[entry.type] || entry.type}</span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>ลบเมื่อ {fmtDate(entry.deletedAt)}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{trashItemTitle(entry)}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{trashItemSub(entry)}</div>
                {!canRestore && (
                  <div style={{ fontSize: 10, color: "var(--red)", marginBottom: 8 }}>กู้คืนไม่ได้ตอนนี้ — ไอดีเกมต้นทางถูกลบไปแล้ว (กู้คืนไอดีนั้นก่อน)</div>
                )}
                <div className="pgs-row" style={{ gap: 8 }}>
                  <button className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} disabled={!canRestore} onClick={() => onRestore(entry.id)}>
                    <RotateCcw size={14} /> กู้คืน
                  </button>
                  {confirmPurgeId === entry.id ? (
                    <button className="pgs-btn pgs-btn-danger" style={{ flex: 1 }} onClick={() => { onPurge(entry.id); setConfirmPurgeId(null); }}>ยืนยันลบถาวร?</button>
                  ) : (
                    <button className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={() => setConfirmPurgeId(entry.id)}>
                      <Trash2 size={14} /> ลบถาวร
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </Modal>
  );
}
