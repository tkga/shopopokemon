import { useState, useMemo } from "react";
import {
  Trash2,
  Star,
} from "lucide-react";
import { genId, clamp0, uniquePokemonNames, variantLabel, findMatchingStock, lookupProductCode, STOCK_PHOTO_SIZE_CHOICES } from "../utils.js";
import Modal from "./Modal.jsx";
import VariantChips from "./VariantChips.jsx";
import ProofImagePicker from "./ProofImagePicker.jsx";
import StockMovementHistory from "./StockMovementHistory.jsx";

export default function StockModal({ mode, item, data, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(item || { id: genId(), name: "", variants: ["normal"], quantity: 1, lowStockThreshold: 2, photoDataUrl: "", price: 0, featured: false });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dismissedKey, setDismissedKey] = useState(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const pokemonNames = uniquePokemonNames(data);

  // รหัสสินค้า (เช่น A014) — ผูกกับ "ชื่อ+ประเภท" ไม่ใช่ไอดีนี้โดยเฉพาะ ถ้าแก้ไขของเดิมอยู่แล้วก็ใช้รหัสเดิม
  // ที่ติดมากับ item, ถ้าเป็นการเพิ่มใหม่จะพรีวิวว่าชื่อ+ประเภทนี้เคยมีรหัสจากไอดีอื่นหรือยัง (ยังไม่สร้างจริง
  // จนกว่าจะกดบันทึก — รหัสจริงถูกสร้าง/ผูกใน saveStock() ที่ App.jsx)
  const previewVariantKey = form.variants?.[0];
  const productCodePreview = item?.productCode || lookupProductCode(data, form.name, previewVariantKey);

  // ชื่อ+ประเภทเดียวกันแต่คนละไอดี มักใช้รูปสินค้าเดียวกัน — เจอของเดิมที่มีรูปอยู่แล้ว
  // ก็เสนอให้กดใช้รูปนั้นซ้ำได้เลย ไม่ต้องอัป/ครอปใหม่ทุกครั้ง
  const variantKey = form.variants?.[0];
  const matchKey = `${(form.name || "").trim().toLowerCase()}|${variantKey || ""}`;
  const match = useMemo(
    () => findMatchingStock(data, form.name, variantKey, form.id),
    [data, form.name, variantKey, form.id]
  );
  const showSuggestion = match && !form.photoDataUrl && dismissedKey !== matchKey;

  function useExistingPhoto() {
    setForm(f => ({
      ...f,
      photoDataUrl: match.photoDataUrl,
      photoDriveFileId: match.photoDriveFileId || null,
      price: f.price ? f.price : (match.price || f.price),
    }));
    setDismissedKey(matchKey);
  }

  return (
    <Modal title={mode === "add" ? "เพิ่มสต๊อก Pokémon" : "แก้ไขสต๊อก"} onClose={onClose}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 12, color: "var(--muted)" }}>
        <span>รหัสสินค้า:</span>
        {productCodePreview ? (
          <span className="pgs-badge pgs-mono" style={{ background: "rgba(255,203,5,0.15)", color: "var(--yellow)", fontSize: 12, fontWeight: 700 }}>{productCodePreview}</span>
        ) : (
          <span>จะสร้างให้อัตโนมัติหลังบันทึก</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => set("featured", !form.featured)}
        className={"pgs-chip" + (form.featured ? " active" : "")}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14 }}
      >
        <Star size={13} fill={form.featured ? "#14151f" : "none"} />
        {form.featured ? "แนะนำสินค้านี้อยู่ (ขึ้นอันดับแรกในหน้าร้าน)" : "แนะนำสินค้านี้"}
      </button>
      <div className="pgs-field">
        <label className="pgs-label">รูปสินค้า (ไม่บังคับ — ไว้ให้ลูกค้าดูสินค้าในอนาคต)</label>
        {showSuggestion && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", marginBottom: 8 }}>
            <img src={match.photoDataUrl} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border)" }} />
            <div style={{ flex: 1, fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
              เคยอัปรูป {form.name} ({variantLabel(data, variantKey)}) ไว้ในไอดีอื่นแล้ว — ใช้รูปเดิมได้เลย ไม่ต้องอัปใหม่
            </div>
            <button type="button" className="pgs-btn pgs-btn-primary" style={{ flexShrink: 0, padding: "6px 10px", fontSize: 12 }} onClick={useExistingPhoto}>ใช้รูปเดิม</button>
          </div>
        )}
        <ProofImagePicker
          value={form.photoDataUrl}
          onChange={(v) => setForm(f => ({ ...f, photoDataUrl: v, photoDriveFileId: null }))}
          alt={form.name || "รูปสินค้า"}
          addLabel="แนบรูปสินค้า"
          sizeChoices={STOCK_PHOTO_SIZE_CHOICES}
          useCropModal
        />
      </div>
      <div className="pgs-field">
        <label className="pgs-label">ชื่อ Pokémon</label>
        <input className="pgs-input" list="pgs-pokemon-names" value={form.name} onChange={e => set("name", e.target.value)} placeholder="เช่น Rayquaza" />
        <datalist id="pgs-pokemon-names">
          {pokemonNames.map(n => <option key={n} value={n} />)}
        </datalist>
      </div>
      <div className="pgs-field">
        <label className="pgs-label">ประเภท (เลือกได้ 1 ชนิดต่อรายการ)</label>
        <VariantChips value={form.variants} onChange={(v) => set("variants", v)} variants={data.pokemonVariants} multi={false} />
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          Pokémon ตัวเดียวกันแต่คนละชนิด (เช่น ปกติ กับ Shiny) จำนวนคงเหลือมักไม่เท่ากัน — ให้เพิ่มเป็นรายการสต๊อกแยกกันสำหรับแต่ละชนิด
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div className="pgs-field" style={{ flex: 1 }}>
          <label className="pgs-label">จำนวนคงเหลือ</label>
          <input className="pgs-input pgs-mono" type="number" min="0" value={form.quantity} onChange={e => set("quantity", e.target.value)} />
        </div>
        <div className="pgs-field" style={{ flex: 1 }}>
          <label className="pgs-label">แจ้งเตือนเมื่อเหลือ ≤</label>
          <input className="pgs-input pgs-mono" type="number" min="0" value={form.lowStockThreshold} onChange={e => set("lowStockThreshold", e.target.value)} />
        </div>
      </div>
      <div className="pgs-field">
        <label className="pgs-label">ราคาต่อตัว (บาท) — ไม่บังคับ, ใช้แสดงในหน้าสินค้าของลูกค้า</label>
        <input className="pgs-input pgs-mono" type="number" min="0" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0" />
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          ราคานี้จะถูกอัปเดตอัตโนมัติทุกครั้งที่ขายสินค้าชิ้นนี้ผ่านหน้าเพิ่มออเดอร์ด้วย
        </div>
      </div>
      <button
        className="pgs-btn pgs-btn-primary" style={{ width: "100%", marginBottom: onDelete ? 8 : 0 }}
        disabled={!form.name}
        onClick={() => form.name && onSave({ ...form, quantity: clamp0(form.quantity), lowStockThreshold: clamp0(form.lowStockThreshold), price: clamp0(form.price) })}
      >บันทึก</button>
      {onDelete && (
        !confirmDelete ? (
          <button className="pgs-btn pgs-btn-danger" style={{ width: "100%" }} onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> ลบสต๊อกนี้</button>
        ) : (
          <button className="pgs-btn pgs-btn-danger" style={{ width: "100%" }} onClick={onDelete}>ยืนยันลบ?</button>
        )
      )}
      {mode === "edit" && item?.id && <StockMovementHistory data={data} stockItemId={item.id} />}
    </Modal>
  );
}
