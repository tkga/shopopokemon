import { useState, useRef } from "react";
import {
  Upload,
  Trash2,
} from "lucide-react";
import { fileToJpegDataUrl, fileToOriginalDataUrl } from "../utils.js";
import ImageCropModal from "./ImageCropModal.jsx";

// `sizeChoices` (optional) turns on a "ขนาดรูป" dropdown before upload — pass
// an array of { key, label, maxDim, quality } (maxDim/quality null = original,
// no resize/recompression at all). See utils.js STOCK_PHOTO_SIZE_CHOICES for
// the preset used by product photos.
// `useCropModal` (optional) opens the same drag-to-position/zoom cropper used
// for the receipt background (ImageCropModal) instead of just auto-cropping
// the file — lets the person pick exactly which part of the photo shows.
// When neither is passed, behavior is unchanged from before: every photo is
// resized via fileToJpegDataUrl(file, maxDim, quality) using the maxDim/quality
// props (defaulting to the original 900px/0.72 — fine for slip/proof photos
// that are just for record-keeping).
export default function ProofImagePicker({
  value,
  onChange,
  alt = "รูปภาพกิจกรรม",
  addLabel = "แนบรูปภาพ",
  maxDim = 900,
  quality = 0.72,
  sizeChoices = null,
  useCropModal = false,
}) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [sizeKey, setSizeKey] = useState(sizeChoices?.[0]?.key || null);
  const [cropSrc, setCropSrc] = useState(null);
  const activeChoice = sizeChoices ? (sizeChoices.find(c => c.key === sizeKey) || sizeChoices[0]) : null;

  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    if (useCropModal) {
      // read the raw file untouched — ImageCropModal itself does the
      // resize/recompress once the person confirms their crop, so this step
      // must not lose any quality up front.
      setBusy(true);
      try {
        setCropSrc(await fileToOriginalDataUrl(file));
      } catch {
        // ignore
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      const dataUrl = activeChoice
        ? (activeChoice.maxDim ? await fileToJpegDataUrl(file, activeChoice.maxDim, activeChoice.quality) : await fileToOriginalDataUrl(file))
        : await fileToJpegDataUrl(file, maxDim, quality);
      onChange(dataUrl);
    } catch {
      // ignore — leave value unchanged on failure
    } finally {
      setBusy(false);
    }
  }

  function handleCropConfirm(dataUrl) {
    setCropSrc(null);
    onChange(dataUrl);
  }

  const sizePicker = sizeChoices && (
    <select
      className="pgs-input"
      value={sizeKey || ""}
      onChange={e => setSizeKey(e.target.value)}
      style={{ marginBottom: 8 }}
    >
      {sizeChoices.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
    </select>
  );

  const cropModal = cropSrc && (
    <ImageCropModal
      src={cropSrc}
      aspect={1}
      shape="rect"
      outputW={activeChoice ? activeChoice.maxDim : 1200}
      format="jpeg"
      quality={activeChoice?.quality || 0.92}
      title="ปรับตำแหน่งรูปสินค้า"
      onCancel={() => setCropSrc(null)}
      onConfirm={handleCropConfirm}
    />
  );

  if (value) {
    return (
      <div>
        <img src={value} alt={alt} style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 8 }} />
        {sizePicker}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} disabled={busy} onClick={() => ref.current?.click()}><Upload size={14} /> {busy ? "กำลังอัปโหลด..." : "เปลี่ยนรูป"}</button>
          <button type="button" className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={() => onChange("")}><Trash2 size={14} /> ลบรูป</button>
        </div>
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        {cropModal}
      </div>
    );
  }
  return (
    <div>
      {sizePicker}
      <button type="button" className="pgs-btn pgs-btn-outline" style={{ width: "100%" }} disabled={busy} onClick={() => ref.current?.click()}>
        <Upload size={14} /> {busy ? "กำลังอัปโหลด..." : addLabel}
      </button>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {cropModal}
    </div>
  );
}
