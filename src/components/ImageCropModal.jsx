import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Minus,
  Move,
} from "lucide-react";
import Modal from "./Modal.jsx";

export default function ImageCropModal({ src, aspect = 1, shape = "rect", outputW = 640, format = "png", quality = 0.92, title = "ปรับตำแหน่งรูปภาพ", onCancel, onConfirm }) {
  const frameW = Math.min(220, Math.round(280 * aspect));
  const frameH = Math.round(frameW / aspect);

  const [natural, setNatural] = useState(null); // { w, h }
  const [zoom, setZoom] = useState(1); // 1 = just covers the frame
  const [pos, setPos] = useState({ x: 0, y: 0 }); // top-left of image relative to frame, css px
  const dragState = useRef(null);

  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setPos({ x: 0, y: 0 }); // centered once we know size, via effect below
    };
    img.src = src;
    return () => { alive = false; };
  }, [src]);

  const minScale = natural ? Math.max(frameW / natural.w, frameH / natural.h) : 1;
  const scale = minScale * zoom;
  const dw = natural ? natural.w * scale : 0;
  const dh = natural ? natural.h * scale : 0;

  // center the image the first time we learn its size
  useEffect(() => {
    if (!natural) return;
    setPos({ x: (frameW - natural.w * minScale) / 2, y: (frameH - natural.h * minScale) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural]);

  function clampPos(x, y, curDw = dw, curDh = dh) {
    const minX = Math.min(0, frameW - curDw);
    const minY = Math.min(0, frameH - curDh);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  }

  function onZoomChange(e) {
    const nextZoom = Number(e.target.value);
    const nextScale = minScale * nextZoom;
    const nextDw = natural ? natural.w * nextScale : 0;
    const nextDh = natural ? natural.h * nextScale : 0;
    // keep the frame's current center point anchored while zooming
    const cx = pos.x - frameW / 2, cy = pos.y - frameH / 2;
    const ratio = nextScale / scale;
    setPos(clampPos(frameW / 2 + cx * ratio, frameH / 2 + cy * ratio, nextDw, nextDh));
    setZoom(nextZoom);
  }

  function onPointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }
  function onPointerMove(e) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setPos(clampPos(dragState.current.origX + dx, dragState.current.origY + dy));
  }
  function onPointerUp() { dragState.current = null; }

  function confirm() {
    if (!natural) return;
    // outputW == null -> "original" mode: export the crop at the actual native
    // pixel resolution the frame is currently showing, instead of resampling to
    // a fixed size — so nothing gets upscaled, and nothing gets downscaled
    // beyond what the user's own zoom/position already crops away.
    const outW = outputW != null ? outputW : Math.round(frameW / scale);
    const outH = outputW != null ? Math.round(outputW / aspect) : Math.round(frameH / scale);
    const outScale = outW / frameW;
    const canvas = document.createElement("canvas");
    canvas.width = outW; canvas.height = outH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    if (format === "jpeg") {
      // JPEG has no alpha channel — fill white first so a transparent PNG/HEIC
      // source doesn't turn black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    }
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, pos.x * outScale, pos.y * outScale, dw * outScale, dh * outScale);
      onConfirm(canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality));
    };
    img.src = src;
  }

  function stepZoom(delta) {
    const next = Math.min(3, Math.max(1, Math.round((zoom + delta) * 100) / 100));
    onZoomChange({ target: { value: String(next) } });
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: frameW, height: frameH, position: "relative", overflow: "hidden",
            borderRadius: shape === "circle" ? "50%" : 16,
            border: "2px solid var(--yellow)", background: "#0c0d15",
            touchAction: "none", cursor: dragState.current ? "grabbing" : "grab",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {natural && (
            <img
              src={src}
              alt=""
              draggable={false}
              style={{ position: "absolute", left: pos.x, top: pos.y, width: dw, height: dh, maxWidth: "none", userSelect: "none", pointerEvents: "none" }}
            />
          )}
          {natural && (
            <div
              style={{
                position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
                display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                background: "rgba(12,13,21,0.82)", color: "#fff", fontSize: 11, fontWeight: 600,
                padding: "6px 12px", borderRadius: 999, pointerEvents: "none",
                boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
              }}
            >
              <Move size={13} /> ลากรูปเพื่อปรับตำแหน่ง
            </div>
          )}
        </div>

        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="pgs-iconbtn" style={{ flexShrink: 0 }} onClick={() => stepZoom(-0.1)} disabled={zoom <= 1}>
            <Minus size={14} />
          </button>
          <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={onZoomChange} style={{ flex: 1 }} />
          <button type="button" className="pgs-iconbtn" style={{ flexShrink: 0 }} onClick={() => stepZoom(0.1)} disabled={zoom >= 3}>
            <Plus size={14} />
          </button>
        </div>

        <div
          style={{
            display: "flex", gap: 8, width: "100%",
            position: "sticky", bottom: 0, left: 0,
            background: "linear-gradient(180deg, #14151f 0%, var(--bg) 100%)",
            borderTop: "1px solid var(--border)",
            padding: "12px 0 calc(10px + env(safe-area-inset-bottom))", marginTop: 4,
            zIndex: 1,
          }}
        >
          <button type="button" className="pgs-btn pgs-btn-outline" style={{ flex: 1 }} onClick={onCancel}>ยกเลิก</button>
          <button type="button" className="pgs-btn pgs-btn-primary" style={{ flex: 1 }} disabled={!natural} onClick={confirm}>ใช้รูปนี้</button>
        </div>
      </div>
    </Modal>
  );
}
