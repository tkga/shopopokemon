import { useState, useRef } from "react";
import {
  Download,
  Upload,
  Trash2,
  FileDown,
  Printer,
  AlertTriangle,
  Plus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { spreadsheetUrl } from "../googleSync.js";
import { fmtDate, daysBetween, isVariantInUse, genVariantKey } from "../utils.js";
import ImageCropModal from "./ImageCropModal.jsx";
import ShopLogo from "./ShopLogo.jsx";
import SubHeader from "./SubHeader.jsx";

export default function SettingsTab({ data, setData, onBackup, onRestore, onExportExcel, onExportPDF, showToast, back, googleSyncing, googleStatus, onConnectGoogle, onSyncNow, onDisconnectGoogle, openTrash }) {
  const fileRef = useRef(null);
  const logoRef = useRef(null);
  const bgRef = useRef(null);
  const [cropSrc, setCropSrc] = useState(null); // data URL of the image currently open in the cropper
  const [cropTarget, setCropTarget] = useState(null); // "logo" | "receiptBg"
  const [pinForm, setPinForm] = useState({ current: "", next: "", confirm: "", question: data.settings.pinQuestion || "", answer: "" });
  const hasPin = !!data.settings.pin;

  function savePin() {
    if (hasPin && pinForm.current !== data.settings.pin) { showToast?.("รหัส PIN ปัจจุบันไม่ถูกต้อง"); return; }
    if (!/^\d{4,8}$/.test(pinForm.next)) { showToast?.("PIN ต้องเป็นตัวเลข 4-8 หลัก"); return; }
    if (pinForm.next !== pinForm.confirm) { showToast?.("ยืนยัน PIN ไม่ตรงกัน"); return; }
    const question = pinForm.question.trim();
    const typedAnswer = pinForm.answer.trim();
    if (question && !typedAnswer && question !== data.settings.pinQuestion) { showToast?.("กรุณาระบุคำตอบของคำถามกู้คืนด้วย"); return; }
    // keep the old answer if the question is unchanged and no new answer was typed; otherwise use what was typed (or clear if question was cleared)
    const answer = !question ? "" : (typedAnswer || (question === data.settings.pinQuestion ? data.settings.pinAnswer : ""));
    setData(d => ({ ...d, settings: { ...d.settings, pin: pinForm.next, pinQuestion: question, pinAnswer: answer } }));
    setPinForm({ current: "", next: "", confirm: "", question, answer: "" });
    showToast?.(hasPin ? "เปลี่ยน PIN แล้ว" : "ตั้งรหัส PIN แล้ว");
  }
  function removePin() {
    if (pinForm.current !== data.settings.pin) { showToast?.("รหัส PIN ปัจจุบันไม่ถูกต้อง"); return; }
    setData(d => ({ ...d, settings: { ...d.settings, pin: "", pinQuestion: "", pinAnswer: "" } }));
    setPinForm({ current: "", next: "", confirm: "", question: "", answer: "" });
    showToast?.("ปิดการล็อกด้วย PIN แล้ว");
  }

  const daysSinceBackup = data.settings.lastBackupAt ? daysBetween(data.settings.lastBackupAt, new Date().toISOString()) : null;
  const g = data.settings.google;
  const [clientIdInput, setClientIdInput] = useState(g.clientId || "");
  const connected = !!g.spreadsheetId;

  // ---- ประเภท Pokémon (เพิ่ม/แก้ไข/ลบ) ----
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [newVariantEmoji, setNewVariantEmoji] = useState("");
  const [editingVariantKey, setEditingVariantKey] = useState(null);
  const [editVariantLabel, setEditVariantLabel] = useState("");
  const [editVariantEmoji, setEditVariantEmoji] = useState("");

  function addVariant() {
    const label = newVariantLabel.trim();
    if (!label) { showToast?.("กรุณากรอกชื่อประเภทก่อน"); return; }
    const key = genVariantKey(label, (data.pokemonVariants || []).map(v => v.key));
    setData(d => ({ ...d, pokemonVariants: [...(d.pokemonVariants || []), { key, label, emoji: newVariantEmoji.trim() || "⭐" }] }));
    setNewVariantLabel(""); setNewVariantEmoji("");
    showToast?.("เพิ่มประเภท Pokémon แล้ว");
  }
  function startEditVariant(v) {
    setEditingVariantKey(v.key);
    setEditVariantLabel(v.label);
    setEditVariantEmoji(v.emoji);
  }
  function saveEditVariant() {
    const label = editVariantLabel.trim();
    if (!label) { showToast?.("กรุณากรอกชื่อประเภทก่อน"); return; }
    setData(d => ({ ...d, pokemonVariants: (d.pokemonVariants || []).map(v => v.key === editingVariantKey ? { ...v, label, emoji: editVariantEmoji.trim() || v.emoji } : v) }));
    setEditingVariantKey(null);
    showToast?.("แก้ไขประเภทแล้ว");
  }
  function removeVariant(v) {
    if (v.key === "normal") { showToast?.('ลบประเภท "ปกติ" ไม่ได้ เพราะเป็นค่าเริ่มต้นของระบบ'); return; }
    if (isVariantInUse(data, v.key)) { showToast?.("ลบไม่ได้ — ยังมี Pokémon ที่ใช้ประเภทนี้อยู่ในออเดอร์หรือสต๊อก"); return; }
    setData(d => ({ ...d, pokemonVariants: (d.pokemonVariants || []).filter(x => x.key !== v.key) }));
    showToast?.("ลบประเภทแล้ว");
  }

  function pickFile(e, target) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast?.("กรุณาเลือกไฟล์รูปภาพ"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result);
      setCropTarget(target);
    };
    reader.onerror = () => showToast?.("อ่านไฟล์รูปภาพไม่สำเร็จ");
    reader.readAsDataURL(file);
  }
  function handleCropConfirm(dataUrl) {
    if (cropTarget === "logo") {
      setData(d => ({ ...d, settings: { ...d.settings, logoDataUrl: dataUrl } }));
      showToast?.("เปลี่ยนโลโก้ร้านแล้ว");
    } else if (cropTarget === "receiptBg") {
      setData(d => ({ ...d, settings: { ...d.settings, receiptBgDataUrl: dataUrl } }));
      showToast?.("เปลี่ยนพื้นหลังใบเสร็จแล้ว");
    }
    setCropSrc(null); setCropTarget(null);
  }
  function handleCropCancel() {
    setCropSrc(null); setCropTarget(null);
  }
  function removeLogo() {
    setData(d => ({ ...d, settings: { ...d.settings, logoDataUrl: "" } }));
    showToast?.("ลบโลโก้แล้ว");
  }
  function removeReceiptBg() {
    setData(d => ({ ...d, settings: { ...d.settings, receiptBgDataUrl: "" } }));
    showToast?.("ลบพื้นหลังใบเสร็จแล้ว");
  }

  return (
    <div>
      <SubHeader title="ตั้งค่า" back={back} />
      <div className="pgs-field">
        <label className="pgs-label">ชื่อร้าน</label>
        <input className="pgs-input" value={data.settings.shopName} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, shopName: e.target.value } }))} />
      </div>

      <div className="pgs-sectiontitle">โลโก้ร้าน</div>
      <div className="pgs-card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <ShopLogo logoDataUrl={data.settings.logoDataUrl} size={56} />
        <div style={{ flex: 1, fontSize: 11, color: "var(--muted)" }}>ใช้เป็นโลโก้ที่แสดงในหน้าแรกของแอป และเป็นไอคอนตอนเปิดแอป/เพิ่มลงหน้าจอโฮม อัปโหลดแล้วสามารถลากปรับตำแหน่ง/ซูมเองได้</div>
      </div>
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={() => logoRef.current?.click()}>
        <Upload size={15} /> {data.settings.logoDataUrl ? "เปลี่ยนโลโก้ร้าน" : "อัปโหลดโลโก้ร้าน"}
      </button>
      {data.settings.logoDataUrl && (
        <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={removeLogo}>
          <Trash2 size={15} /> ลบโลโก้ (ใช้ไอคอนเริ่มต้น)
        </button>
      )}
      <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => pickFile(e, "logo")} />

      <div className="pgs-sectiontitle">พื้นหลังใบเสร็จ</div>
      <div className="pgs-card" style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        {data.settings.receiptBgDataUrl ? (
          <img src={data.settings.receiptBgDataUrl} alt="พื้นหลังใบเสร็จ" style={{ width: 56, height: 74, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
        ) : (
          <div style={{ width: 56, height: 74, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px dashed var(--border)", flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, fontSize: 11, color: "var(--muted)" }}>รูปพื้นหลังโปร่งใสของใบเสร็จ (การ์ดจะโปร่งแสงให้เห็นภาพนี้) เปลี่ยนได้ทุกเมื่อ</div>
      </div>
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={() => bgRef.current?.click()}>
        <Upload size={15} /> {data.settings.receiptBgDataUrl ? "เปลี่ยนพื้นหลังใบเสร็จ" : "อัปโหลดพื้นหลังใบเสร็จ"}
      </button>
      {data.settings.receiptBgDataUrl && (
        <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={removeReceiptBg}>
          <Trash2 size={15} /> ลบพื้นหลัง (ใช้ดีไซน์เริ่มต้น)
        </button>
      )}
      <input ref={bgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => pickFile(e, "receiptBg")} />

      {cropSrc && cropTarget === "logo" && (
        <ImageCropModal src={cropSrc} aspect={1} shape="circle" outputW={512} title="ปรับโลโก้ร้าน" onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
      {cropSrc && cropTarget === "receiptBg" && (
        <ImageCropModal src={cropSrc} aspect={0.75} shape="rect" outputW={720} title="ปรับพื้นหลังใบเสร็จ" onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}

      <div className="pgs-sectiontitle">ล็อกแอปด้วย PIN</div>
      <div className="pgs-card" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
          {hasPin ? "แอปนี้ล็อกด้วย PIN อยู่ ต้องใส่รหัสทุกครั้งที่เปิดแอป" : "ยังไม่ได้ตั้ง PIN — ใครก็เปิดแอปนี้ดูข้อมูลร้านได้ทันที"}
          {hasPin && (data.settings.pinQuestion
            ? <> ตั้งคำถามกู้คืนไว้แล้ว: "<b>{data.settings.pinQuestion}</b>"</>
            : <> ยังไม่ได้ตั้งคำถามกู้คืน — ถ้าลืม PIN จะต้องกู้คืนด้วยไฟล์ Backup แทน</>)}
        </div>
        {hasPin && (
          <div className="pgs-field" style={{ marginBottom: 8 }}>
            <label className="pgs-label">PIN ปัจจุบัน</label>
            <input className="pgs-input pgs-mono" type="password" inputMode="numeric" value={pinForm.current} onChange={e => setPinForm(f => ({ ...f, current: e.target.value }))} />
          </div>
        )}
        <div className="pgs-field" style={{ marginBottom: 8 }}>
          <label className="pgs-label">{hasPin ? "PIN ใหม่" : "ตั้ง PIN (ตัวเลข 4-8 หลัก)"}</label>
          <input className="pgs-input pgs-mono" type="password" inputMode="numeric" value={pinForm.next} onChange={e => setPinForm(f => ({ ...f, next: e.target.value }))} />
        </div>
        <div className="pgs-field" style={{ marginBottom: 10 }}>
          <label className="pgs-label">ยืนยัน PIN</label>
          <input className="pgs-input pgs-mono" type="password" inputMode="numeric" value={pinForm.confirm} onChange={e => setPinForm(f => ({ ...f, confirm: e.target.value }))} />
        </div>
        <div className="pgs-field" style={{ marginBottom: 8 }}>
          <label className="pgs-label">คำถามกู้คืน (ถ้าลืม PIN) — ไม่บังคับ</label>
          <input className="pgs-input" placeholder="เช่น ชื่อเล่นตอนเด็ก" value={pinForm.question} onChange={e => setPinForm(f => ({ ...f, question: e.target.value }))} />
        </div>
        <div className="pgs-field" style={{ marginBottom: 10 }}>
          <label className="pgs-label">คำตอบ{data.settings.pinAnswer && pinForm.question === data.settings.pinQuestion ? " (เว้นว่าง = ใช้คำตอบเดิม)" : ""}</label>
          <input className="pgs-input" type="password" value={pinForm.answer} onChange={e => setPinForm(f => ({ ...f, answer: e.target.value }))} />
        </div>
        <button className="pgs-btn pgs-btn-primary" style={{ width: "100%", marginBottom: hasPin ? 8 : 0 }} onClick={savePin}>{hasPin ? "เปลี่ยน PIN" : "ตั้ง PIN"}</button>
        {hasPin && <button className="pgs-btn pgs-btn-danger" style={{ width: "100%" }} onClick={removePin}>ปิดการล็อก PIN</button>}
      </div>

      <div className="pgs-sectiontitle">สำรองข้อมูลอัตโนมัติ (Google Sheets + Drive)</div>
      <div className="pgs-card" style={{ marginBottom: 8 }}>
        {!connected ? (
          <>
            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
              ข้อมูลลูกค้า/ออเดอร์จะถูกเขียนลง Google Sheets และรูปสลิป/รูปงานจะอัปโหลดขึ้น Google Drive ของร้านเองอัตโนมัติทุกครั้งที่มีการแก้ไข ต้องใส่ "Google Client ID" ของตัวเองก่อน (สร้างฟรีครั้งเดียว — ดูขั้นตอนใน README.md หัวข้อ "ตั้งค่า Google Sync")
            </div>
            <div className="pgs-field" style={{ marginBottom: 10 }}>
              <label className="pgs-label">Google Client ID</label>
              <input className="pgs-input pgs-mono" style={{ fontSize: 11 }} placeholder="xxxxxxxx.apps.googleusercontent.com" value={clientIdInput} onChange={e => setClientIdInput(e.target.value.trim())} />
            </div>
            <button className="pgs-btn pgs-btn-primary" style={{ width: "100%" }} disabled={!clientIdInput || googleSyncing} onClick={() => onConnectGoogle(clientIdInput)}>
              {googleSyncing ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อ Google"}
            </button>
          </>
        ) : (
          <>
            <div className="pgs-row" style={{ marginBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>บัญชี</span>
              <span style={{ fontSize: 12 }}>{g.email || "-"}</span>
            </div>
            <div className="pgs-row" style={{ marginBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>ซิงค์อัตโนมัติ</span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <input type="checkbox" checked={g.autoSync} onChange={e => setData(d => ({ ...d, settings: { ...d.settings, google: { ...d.settings.google, autoSync: e.target.checked } } }))} />
                เปิดใช้งาน
              </label>
            </div>
            <div className="pgs-row" style={{ marginBottom: 10 }}>
              <span style={{ color: "var(--muted)" }}>ซิงค์ล่าสุด</span>
              <span className="pgs-mono" style={{ fontSize: 12 }}>{g.lastSyncAt ? fmtDate(g.lastSyncAt) : "ยังไม่เคย"}</span>
            </div>
            {googleStatus && <div style={{ fontSize: 11, color: "var(--blue)", marginBottom: 10 }}>{googleStatus}</div>}
            <a className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start", textDecoration: "none" }} href={spreadsheetUrl(g.spreadsheetId)} target="_blank" rel="noreferrer">
              <FileDown size={15} /> เปิด Google Sheet
            </a>
            <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} disabled={googleSyncing} onClick={onSyncNow}>
              <Upload size={15} /> {googleSyncing ? "กำลังซิงค์..." : "ซิงค์เดี๋ยวนี้"}
            </button>
            <button className="pgs-btn pgs-btn-danger" style={{ width: "100%" }} onClick={onDisconnectGoogle}>ยกเลิกการเชื่อมต่อ</button>
          </>
        )}
      </div>

      <div className="pgs-sectiontitle">ข้อมูล & สำรองข้อมูล</div>
      {(daysSinceBackup === null || daysSinceBackup >= 7) && (
        <div className="pgs-cancelbanner" style={{ background: "rgba(255,203,5,0.12)", color: "var(--yellow)", borderColor: "rgba(255,203,5,0.35)" }}>
          <AlertTriangle size={14} />
          {daysSinceBackup === null ? "ยังไม่เคย Backup ข้อมูลเลย แนะนำให้ Backup ไว้กันข้อมูลหาย" : `ไม่ได้ Backup มา ${daysSinceBackup} วันแล้ว ข้อมูลอยู่ในเครื่องนี้เครื่องเดียว แนะนำให้ Backup`}
        </div>
      )}
      {daysSinceBackup !== null && daysSinceBackup < 7 && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>Backup ล่าสุด: {fmtDate(data.settings.lastBackupAt)}</div>
      )}
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={onBackup}><Download size={15} /> Backup ข้อมูล (.json)</button>
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={() => fileRef.current?.click()}><Upload size={15} /> Restore ข้อมูลจากไฟล์</button>
      <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={onRestore} />
      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>ข้อมูลทั้งหมดเก็บอยู่ในเบราว์เซอร์นี้เท่านั้น (ไม่ sync ข้ามเครื่อง/เบราว์เซอร์) หากล้าง cache หรือเปลี่ยนเครื่องโดยไม่ได้ Backup ไว้ ข้อมูลจะหายถาวร</div>

      <div className="pgs-sectiontitle">ถังขยะ</div>
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={openTrash}>
        <Trash2 size={15} /> ถังขยะ {data.trash?.length ? `(${data.trash.length})` : ""}
      </button>
      <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8 }}>ลูกค้า/ไอดี/สต๊อก/ออเดอร์ที่ลบ จะพักไว้ที่นี่ 30 วันก่อนลบถาวรอัตโนมัติ กู้คืนได้ตลอดในช่วงนี้</div>

      <div className="pgs-sectiontitle">ส่งออกรายงาน</div>
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={onExportExcel}><FileDown size={15} /> Export Excel (.xlsx)</button>
      <button className="pgs-btn pgs-btn-outline" style={{ width: "100%", marginBottom: 8, justifyContent: "flex-start" }} onClick={onExportPDF}><Printer size={15} /> Export PDF (พิมพ์ / บันทึกเป็น PDF)</button>

      <div className="pgs-sectiontitle">ประเภท Pokémon</div>
      <div className="pgs-card" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 10 }}>
          ใช้ตอนเลือกชนิด Pokémon ในออเดอร์และสต๊อก (ปกติ, Shiny, Shadow ฯลฯ) — ลบไม่ได้ถ้ายังมี Pokémon ที่ใช้ประเภทนั้นอยู่
        </div>
        {(data.pokemonVariants || []).map(v => (
          <div key={v.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            {editingVariantKey === v.key ? (
              <>
                <input className="pgs-input" style={{ width: 48, textAlign: "center", padding: "8px 4px" }} value={editVariantEmoji} onChange={e => setEditVariantEmoji(e.target.value)} />
                <input className="pgs-input" style={{ flex: 1 }} value={editVariantLabel} onChange={e => setEditVariantLabel(e.target.value)} />
                <button className="pgs-iconbtn" onClick={saveEditVariant}><Check size={14} /></button>
                <button className="pgs-iconbtn" onClick={() => setEditingVariantKey(null)}><X size={14} /></button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontSize: 13 }}>
                  {v.emoji} {v.label}
                  {v.key === "normal" && <span style={{ color: "var(--muted)", fontSize: 10 }}> (ค่าเริ่มต้น)</span>}
                </span>
                <button className="pgs-iconbtn" onClick={() => startEditVariant(v)}><Pencil size={13} /></button>
                <button className="pgs-iconbtn" onClick={() => removeVariant(v)}><Trash2 size={13} /></button>
              </>
            )}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <input className="pgs-input" style={{ width: 48, textAlign: "center", padding: "8px 4px" }} placeholder="🐾" value={newVariantEmoji} onChange={e => setNewVariantEmoji(e.target.value)} />
          <input className="pgs-input" style={{ flex: 1 }} placeholder="เพิ่มประเภทใหม่ เช่น Costume" value={newVariantLabel} onChange={e => setNewVariantLabel(e.target.value)} />
          <button className="pgs-btn pgs-btn-primary" style={{ padding: "8px 12px" }} onClick={addVariant}><Plus size={14} /></button>
        </div>
      </div>

      <div className="pgs-sectiontitle">สรุปฐานข้อมูล</div>
      <div className="pgs-card" style={{ fontSize: 12 }}>
        <div className="pgs-row" style={{ marginBottom: 6 }}><span style={{ color: "var(--muted)" }}>ลูกค้า</span><span className="pgs-mono">{data.customers.length}</span></div>
        <div className="pgs-row" style={{ marginBottom: 6 }}><span style={{ color: "var(--muted)" }}>ออเดอร์</span><span className="pgs-mono">{data.orders.length}</span></div>
        <div className="pgs-row" style={{ marginBottom: 6 }}><span style={{ color: "var(--muted)" }}>ไอดีเกม</span><span className="pgs-mono">{data.gameAccounts.length}</span></div>
        <div className="pgs-row" style={{ marginBottom: 6 }}><span style={{ color: "var(--muted)" }}>รายการสต๊อก Pokémon</span><span className="pgs-mono">{data.gameAccounts.reduce((s, a) => s + (a.stock || []).length, 0)}</span></div>
        <div className="pgs-row" style={{ marginBottom: 6 }}><span style={{ color: "var(--muted)" }}>ออเดอร์ที่ยกเลิก</span><span className="pgs-mono">{data.orders.filter(o => o.cancelled).length}</span></div>
        <div className="pgs-row"><span style={{ color: "var(--muted)" }}>ประวัติการลงทุน</span><span className="pgs-mono">{data.investmentHistory.length}</span></div>
      </div>
      <div style={{ fontSize: 10, color: "var(--muted)", textAlign: "center", marginTop: 20 }}>ข้อมูลถูกบันทึกอัตโนมัติในเครื่องนี้ทุกครั้งที่มีการแก้ไข</div>
    </div>
  );
}
