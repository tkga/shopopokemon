// ฟังก์ชันสร้าง/วาดใบเสร็จ (ทั้งข้อความสำหรับแชร์ และรูปภาพผ่าน canvas)

import { HIRE_MODES, ORDER_TYPES, PAYMENT_STATUS, POKEMON_VARIANTS, TRADE_STATUS } from "./constants.js";
import { clamp0, fmtDate, fmtMoney, orderBalance } from "./utils.js";

export function buildReceiptLines(order, data, custName, accName) {
  const lines = [];
  lines.push(`🧾 ${data.settings.shopName}`);
  lines.push(`เลขที่: ${order.code || "-"}`);
  lines.push(`วันที่: ${fmtDate(order.createdAt)}`);
  lines.push(`--------------------------------`);
  lines.push(`ลูกค้า: ${custName(order.customerId)}`);
  if (order.customerGameId) lines.push(`ไอดีเกม: ${order.customerGameId}`);
  lines.push(`บริการ: ${ORDER_TYPES[order.type]?.label || "-"}`);
  if (order.type === "sell_pokemon") {
    const variants = (order.pokemonVariants || []).filter(v => v !== "normal").map(v => POKEMON_VARIANTS[v]?.label).filter(Boolean).join(", ");
    lines.push(`Pokémon: ${order.pokemonName || "-"}${variants ? " (" + variants + ")" : ""} x${order.quantity || 1}`);
    if (order.sourceAccountId) lines.push(`ไอดีต้นทาง: ${accName(order.sourceAccountId)}`);
  } else {
    lines.push(`โหมด: ${HIRE_MODES[order.hireMode]?.label || "-"}`);
    lines.push(`จำนวนที่ซื้อทั้งหมด: ${order.hireTotal || 0} ตัว/รอบ (ใช้ไปแล้ว ${order.hireUsed || 0})`);
    (order.rounds || []).forEach((r, i) => {
      lines.push(`  รอบ ${i + 1}: ${r.date ? fmtDate(r.date) : "ไม่ระบุวัน"} x${r.count} ${r.done ? "(เสร็จแล้ว)" : ""}`);
    });
  }
  lines.push(`--------------------------------`);
  lines.push(`ราคารวม: ฿${fmtMoney(order.price)}`);
  if (order.paymentStatus === "partial") {
    lines.push(`ชำระแล้ว: ฿${fmtMoney(order.paidAmount)}`);
    lines.push(`คงเหลือ: ฿${fmtMoney(orderBalance(order))}`);
  }
  lines.push(`สถานะชำระ: ${PAYMENT_STATUS[order.paymentStatus]?.label || "-"}`);
  if (order.type === "sell_pokemon") lines.push(`สถานะเทรด: ${TRADE_STATUS[order.tradeStatus]?.label || "-"}`);
  if (order.note) lines.push(`หมายเหตุ: ${order.note}`);
  if (order.proofImageDataUrl) lines.push(`📷 แนบรูปภาพกิจกรรม (ดูในแอป)`);
  if (order.cancelled) lines.push(`⚠️ ออเดอร์นี้ถูกยกเลิก`);
  return lines;
}

export function buildReceiptData(order, data, custName, accName) {
  const orderNoForCustomer = data.orders
    .filter(o => o.customerId === order.customerId)
    .slice()
    .sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""))
    .findIndex(o => o.id === order.id) + 1;

  const items = [];
  if (order.type === "sell_pokemon") {
    const variants = (order.pokemonVariants || []).filter(v => v !== "normal").map(v => POKEMON_VARIANTS[v]?.label).filter(Boolean).join(", ");
    items.push({
      label: `${order.pokemonName || "Pokémon"}${variants ? " (" + variants + ")" : ""}`,
      sub: `x${order.quantity || 1}${order.sourceAccountId ? " · " + accName(order.sourceAccountId) : ""}`,
      price: order.price,
    });
  } else {
    items.push({
      label: ORDER_TYPES[order.type]?.label || "-",
      sub: `${HIRE_MODES[order.hireMode]?.label || ""} · ใช้ไป ${order.hireUsed || 0}/${order.hireTotal || 0}`,
      price: order.price,
    });
  }

  return {
    shopName: data.settings.shopName,
    logoDataUrl: data.settings.logoDataUrl || "",
    receiptBgDataUrl: data.settings.receiptBgDataUrl || "",
    code: order.code || "-",
    dateStr: fmtDate(order.createdAt),
    customerName: custName(order.customerId),
    customerGameId: order.customerGameId || "",
    orderNoForCustomer,
    serviceEmoji: ORDER_TYPES[order.type]?.emoji || "🧾",
    serviceLabel: ORDER_TYPES[order.type]?.label || "-",
    periodStr: order.type !== "sell_pokemon" && order.rounds && order.rounds.length
      ? `${fmtDate(order.rounds[0]?.date || order.createdAt)} — ${fmtDate(order.rounds[order.rounds.length - 1]?.date || order.createdAt)}`
      : (order.appointmentDate ? `นัด ${fmtDate(order.appointmentDate)}` : null),
    items,
    total: Number(order.price) || 0,
    paidAmount: order.paymentStatus === "paid" ? Number(order.price) || 0 : Number(order.paidAmount) || 0,
    balance: orderBalance(order),
    paymentStatus: PAYMENT_STATUS[order.paymentStatus]?.label || "-",
    paymentColor: PAYMENT_STATUS[order.paymentStatus]?.color || "#8b8da6",
    tradeStatus: order.type === "sell_pokemon" ? (TRADE_STATUS[order.tradeStatus]?.label || null) : null,
    note: order.note || "",
    proofImageDataUrl: order.proofImageDataUrl || "",
    cancelled: !!order.cancelled,
  };
}

export function loadImageAsync(src) {
  return new Promise((resolve) => {
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- ธีมสี "ใบเสนอราคา" ครีม-น้ำตาล (อ้างอิงแบบฟอร์มร้านกาแฟ) — ใช้กับกล่องรายการสีขาวด้านใน ----
const THEME = {
  bg: "#FBF7EC",        // พื้นครีม (fallback เดิม ไม่ได้ใช้แล้วเมื่อมีพื้นหลังภาพ/เดฟอลต์)
  card: "#FFFFFF",      // กล่องตารางรายการ
  border: "#E3D8C3",    // เส้นขอบ/เส้นแบ่งสีทราย
  maroon: "#8B3E3E",    // สีหัวเรื่อง/ตัวเลขรวม (น้ำตาลแดง) — ใช้เฉพาะข้อความที่อยู่บนกล่องขาว
  textDark: "#3B2E28",  // ตัวอักษรหลัก — ใช้เฉพาะข้อความที่อยู่บนกล่องขาว
  textMuted: "#948573",  // ตัวอักษรรอง — ใช้เฉพาะข้อความที่อยู่บนกล่องขาว
};

// ---- ธีมสำหรับข้อความที่วางทับพื้นหลังใบเสร็จ (ภาพอัปโหลด หรือเดฟอลต์) โดยตรง ----
// พื้นหลังมี dark overlay ทับอยู่เสมอ ข้อความส่วนนี้จึงต้องเป็นโทนสว่างเพื่อให้อ่านง่าย
export const HERO = {
  accent: "#FFD54A",              // สีเน้น (แทนที่ maroon เดิมตอนอยู่บนพื้นหลังเข้ม)
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.78)",
  divider: "rgba(255,255,255,0.28)",
  outerBorder: "rgba(255,255,255,0.14)",
  overlay: "rgba(8,10,20,0.72)",  // dark overlay 72% ให้ตรงกับ preview
};

// พื้นหลังเดฟอลต์แบบ "Pokémon GO" (โทนน้ำเงินค่ำคืนบนแผนที่) ใช้ตอนร้านยังไม่อัปโหลดพื้นหลังเอง
const DEFAULT_BG_STOPS = [
  { offset: 0, color: "#1e3c72" },
  { offset: 0.55, color: "#2a5298" },
  { offset: 1, color: "#131c2e" },
];

// วาดพื้นหลังใบเสร็จ: รูปที่อัปโหลด (cover-fit) หรือเดฟอลต์แบบไล่สี ต้องเรียกภายใน clip ของกรอบใบเสร็จ
function drawReceiptBackground(ctx, bgImg, width, height) {
  if (bgImg) {
    const boxRatio = width / height;
    const imgRatio = bgImg.width / bgImg.height;
    let dw, dh, dx, dy;
    if (imgRatio > boxRatio) {
      dh = height; dw = height * imgRatio;
      dx = (width - dw) / 2; dy = 0;
    } else {
      dw = width; dh = width / imgRatio;
      dx = 0; dy = (height - dh) / 2;
    }
    ctx.drawImage(bgImg, dx, dy, dw, dh);
  } else {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    DEFAULT_BG_STOPS.forEach(s => grad.addColorStop(s.offset, s.color));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }
  // dark overlay เพื่อให้ข้อความอ่านง่าย
  ctx.fillStyle = HERO.overlay;
  ctx.fillRect(0, 0, width, height);
}

// Poké Ball watermark แบบเส้นขอบบาง โปร่งใส วางกลางพื้นหลัง
function drawPokeballWatermark(ctx, cx, cy, radius, opacity = 0.1) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = "#FFFFFF";
  ctx.fillStyle = "#FFFFFF";
  ctx.lineWidth = Math.max(2, radius * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function downloadReceiptImage(order, data, custName, accName) {
  const r = buildReceiptData(order, data, custName, accName);
  const [logoImg, proofImg, bgImg] = await Promise.all([
    loadImageAsync(r.logoDataUrl),
    loadImageAsync(r.proofImageDataUrl),
    loadImageAsync(r.receiptBgDataUrl),
  ]);

  // Make sure the custom webfonts are actually loaded before we draw text with them —
  // otherwise the canvas silently falls back to a generic system font and the exported
  // image looks noticeably plainer than the in-app preview.
  try {
    if (document.fonts) {
      await Promise.all([
        document.fonts.load("700 30px 'Baloo 2'"),
        document.fonts.load("700 15px 'Inter'"),
        document.fonts.load("600 12px 'Inter'"),
        document.fonts.load("500 13px 'JetBrains Mono'"),
        document.fonts.load("700 20px 'JetBrains Mono'"),
      ]);
      await document.fonts.ready;
    }
  } catch { /* best-effort — fall through and draw anyway */ }

  const width = 640;
  const pad = 32;
  let y = 0; // running cursor, computed as we lay things out top-to-bottom

  // Slip/proof photo is shown in full (contain-fit, no cropping) instead of a fixed
  // cover-fit box — bank transfer slips are tall and cropping them cuts off the details
  // the shop owner actually needs to see. We cap the height so one huge photo can't blow
  // up the whole receipt, and letterbox with the card background if the aspect ratio
  // doesn't fill the width.
  const PROOF_MAX_H = 420;
  const proofBoxW = width - pad * 2;
  let proofDW = 0, proofDH = 0;
  if (proofImg) {
    proofDW = proofBoxW;
    proofDH = proofBoxW * proofImg.height / proofImg.width;
    if (proofDH > PROOF_MAX_H) {
      proofDH = PROOF_MAX_H;
      proofDW = PROOF_MAX_H * proofImg.width / proofImg.height;
    }
  }
  // "160" = the customer-info block (name/order-no row + service line + gaps + divider) that now
  // lives at the top of the white card, on top of the usual header row (44) + total row (44).
  const custBlockH = 148 + (r.periodStr ? 18 : 0);
  const itemsH = custBlockH + r.items.length * 40; // customer block + item rows + total row
  const noteH = r.note ? 40 : 0;
  const height = pad + 54 + 30 + 26 + itemsH + 16
    + (proofImg ? 30 + proofDH + 16 : 0) + 40 + noteH + (r.cancelled ? 40 : 0) + 60 + pad;

  // Export at a higher pixel density so the PNG stays crisp on modern phone screens
  // instead of looking soft/blurry next to the in-app preview.
  const EXPORT_SCALE = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * EXPORT_SCALE);
  canvas.height = Math.round(height * EXPORT_SCALE);
  const ctx = canvas.getContext("2d");
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // background — พื้นหลังจากรูปที่ร้านอัปโหลด (data.settings.receiptBgDataUrl) แบบ cover-fit,
  // หรือถ้ายังไม่มีก็ใช้ไล่สีเดฟอลต์ธีม Pokémon GO แทน จากนั้นทับด้วย dark overlay + ลายน้ำ Poké Ball
  // ให้ตรงกับที่แสดงใน Preview ทุกจุด
  roundRectPath(ctx, 0, 0, width, height, 24);
  ctx.save();
  ctx.clip();
  drawReceiptBackground(ctx, bgImg, width, height);
  drawPokeballWatermark(ctx, width / 2, height / 2, width * 0.42, 0.1);
  ctx.restore();
  ctx.strokeStyle = HERO.outerBorder;
  ctx.lineWidth = 1;
  roundRectPath(ctx, 0.5, 0.5, width - 1, height - 1, 24);
  ctx.stroke();

  y = pad;

  // logo top-left
  if (logoImg) {
    const s = 46;
    roundRectPath(ctx, pad, y, s, s, 12);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logoImg, pad, y, s, s);
    ctx.restore();
  }

  // big title top-right, e.g. "ใบเสร็จ"
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = HERO.accent;
  ctx.font = "700 30px 'Baloo 2', Inter, sans-serif";
  ctx.fillText(r.cancelled ? "ใบเสร็จ (ยกเลิกแล้ว)" : "ใบเสร็จ", width - pad, y + 32);
  ctx.textAlign = "left";

  y += 54;

  // shop name (left) + code/date (right), sitting above the divider — วางทับพื้นหลังโดยตรง จึงใช้โทนสว่าง
  ctx.font = "700 15px Inter, sans-serif";
  ctx.fillStyle = HERO.text;
  ctx.fillText(r.shopName, pad, y);

  ctx.textAlign = "right";
  ctx.font = "700 12px 'JetBrains Mono', monospace";
  ctx.fillStyle = HERO.text;
  ctx.fillText(`เลขที่ ${r.code}`, width - pad, y);
  ctx.font = "500 11px 'JetBrains Mono', monospace";
  ctx.fillStyle = HERO.textMuted;
  ctx.fillText(r.dateStr, width - pad, y + 16);
  ctx.textAlign = "left";

  y += 30;
  ctx.strokeStyle = HERO.divider;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(width - pad, y); ctx.stroke();
  y += 26;

  // items card — now also holds the customer name/order-no/service/period block up top,
  // on the same white background as the item list (matches the ReceiptModal preview)
  const cardTop = y;
  ctx.fillStyle = THEME.card;
  roundRectPath(ctx, pad, cardTop, width - pad * 2, itemsH, 16);
  ctx.fill();
  ctx.strokeStyle = THEME.border;
  roundRectPath(ctx, pad, cardTop, width - pad * 2, itemsH, 16);
  ctx.stroke();

  // customer name (left) + order-no badge (right)
  let iy = cardTop + 24;
  ctx.font = "700 15px Inter, sans-serif";
  ctx.fillStyle = THEME.textDark;
  ctx.fillText(`${r.customerName}`, pad + 18, iy);
  ctx.font = "600 11px Inter, sans-serif";
  ctx.fillStyle = THEME.maroon;
  ctx.textAlign = "right";
  ctx.fillText(`ครั้งที่ ${r.orderNoForCustomer}`, width - pad - 18, iy);
  ctx.textAlign = "left";

  iy += 20;
  ctx.font = "500 12px Inter, sans-serif";
  ctx.fillStyle = THEME.textMuted;
  ctx.fillText(`${r.serviceEmoji} ${r.serviceLabel}${r.customerGameId ? "  ·  ไอดี " + r.customerGameId : ""}`, pad + 18, iy);

  if (r.periodStr) {
    iy += 18;
    ctx.fillText(`🗓️ ${r.periodStr}`, pad + 18, iy);
  }

  iy += 18;
  ctx.strokeStyle = THEME.border;
  ctx.beginPath(); ctx.moveTo(pad + 18, iy); ctx.lineTo(width - pad - 18, iy); ctx.stroke();
  iy += 22;

  // column header row: รายละเอียด / รวม
  ctx.font = "700 11px Inter, sans-serif";
  ctx.fillStyle = THEME.maroon;
  ctx.fillText("รายละเอียด", pad + 18, iy);
  ctx.textAlign = "right";
  ctx.fillText("รวม", width - pad - 18, iy);
  ctx.textAlign = "left";
  iy += 12;
  ctx.strokeStyle = THEME.border;
  ctx.beginPath(); ctx.moveTo(pad + 18, iy); ctx.lineTo(width - pad - 18, iy); ctx.stroke();
  iy += 24;

  r.items.forEach(it => {
    ctx.font = "700 13px Inter, sans-serif";
    ctx.fillStyle = THEME.textDark;
    ctx.fillText(it.label, pad + 18, iy);
    ctx.textAlign = "right";
    ctx.font = "700 13px 'JetBrains Mono', monospace";
    ctx.fillStyle = THEME.textDark;
    ctx.fillText(`฿${fmtMoney(it.price)}`, width - pad - 18, iy);
    ctx.textAlign = "left";
    iy += 16;
    ctx.font = "500 11px Inter, sans-serif";
    ctx.fillStyle = THEME.textMuted;
    ctx.fillText(it.sub, pad + 18, iy);
    iy += 24;
  });
  ctx.strokeStyle = THEME.border;
  ctx.beginPath(); ctx.moveTo(pad + 18, iy - 4); ctx.lineTo(width - pad - 18, iy - 4); ctx.stroke();
  iy += 20;
  ctx.font = "700 13px Inter, sans-serif";
  ctx.fillStyle = THEME.maroon;
  ctx.fillText("รวมทั้งหมด", pad + 18, iy);
  ctx.textAlign = "right";
  ctx.font = "700 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = THEME.maroon;
  ctx.fillText(`฿${fmtMoney(r.total)}`, width - pad - 18, iy);
  ctx.textAlign = "left";

  y = cardTop + itemsH + 16;

  // activity / slip image — shown in full, never cropped
  if (proofImg) {
    ctx.font = "700 11px Inter, sans-serif";
    ctx.fillStyle = HERO.textMuted;
    ctx.fillText("รูปภาพกิจกรรม", pad, y);
    y += 16;
    // letterbox background across the full width so the box reads cleanly even when the
    // photo's aspect ratio is narrower than the receipt
    ctx.fillStyle = THEME.card;
    roundRectPath(ctx, pad, y, proofBoxW, proofDH, 12);
    ctx.fill();
    ctx.strokeStyle = THEME.border;
    roundRectPath(ctx, pad, y, proofBoxW, proofDH, 12);
    ctx.stroke();
    const dx = pad + (proofBoxW - proofDW) / 2;
    ctx.save();
    roundRectPath(ctx, pad, y, proofBoxW, proofDH, 12);
    ctx.clip();
    ctx.drawImage(proofImg, dx, y, proofDW, proofDH);
    ctx.restore();
    y += proofDH + 16;
  }

  // status badges
  ctx.font = "700 11px Inter, sans-serif";
  const badge = (text, color, x) => {
    const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = color + "40";
    roundRectPath(ctx, x, y, w, 24, 12);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 11, y + 12);
    ctx.textBaseline = "alphabetic";
    return x + w + 8;
  };
  let bx = pad;
  bx = badge(r.paymentStatus, r.paymentColor, bx);
  if (r.tradeStatus) badge(r.tradeStatus, HERO.accent, bx);
  y += 40;

  if (r.note) {
    ctx.font = "500 12px Inter, sans-serif";
    ctx.fillStyle = HERO.textMuted;
    ctx.fillText(`หมายเหตุ: ${r.note}`, pad, y);
    y += 26;
  }

  if (r.cancelled) {
    ctx.fillStyle = "rgba(179,56,56,0.32)";
    roundRectPath(ctx, pad, y - 18, width - pad * 2, 32, 10);
    ctx.fill();
    ctx.fillStyle = "#B33838";
    ctx.font = "700 12px Inter, sans-serif";
    ctx.fillText("⚠️ ออเดอร์นี้ถูกยกเลิกแล้ว", pad + 12, y + 3);
    y += 40;
  }

  // footer
  ctx.strokeStyle = HERO.divider;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(width - pad, y); ctx.stroke();
  y += 26;
  ctx.textAlign = "center";
  ctx.font = "600 12px Inter, sans-serif";
  ctx.fillStyle = HERO.textMuted;
  ctx.fillText(`ขอบคุณที่ใช้บริการ ${r.shopName} 🐾`, width / 2, y);
  ctx.textAlign = "left";

  return new Promise((resolve) => {
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `receipt-${order.code || "order"}.png`; a.click();
      URL.revokeObjectURL(url);
      resolve();
    });
  });
}

export function trashItemTitle(entry) {
  const p = entry.payload;
  if (entry.type === "order") return `ออเดอร์ ${p.code || ""} — ${ORDER_TYPES[p.type]?.label || p.type}`;
  return p.name || "(ไม่มีชื่อ)";
}

export function trashItemSub(entry) {
  const p = entry.payload;
  if (entry.type === "customer") return p.facebook ? `Facebook: ${p.facebook}` : "-";
  if (entry.type === "account") return `${(p.stock || []).length} รายการสต๊อกในไอดีนี้`;
  if (entry.type === "stock") return `จากไอดี: ${entry.meta?.accountName || "-"} · คงเหลือตอนลบ: ${clamp0(p.quantity)}`;
  if (entry.type === "order") return `฿${fmtMoney(p.price)}${p.cancelled ? " · (ยกเลิกอยู่แล้วตอนลบ)" : ""}`;
  return "";
}
