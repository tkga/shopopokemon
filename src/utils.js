// ฟังก์ชันช่วยเหลือทั่วไป (format, generate id, จัดการ data/stock/trash ฯลฯ)

import { POKEMON_VARIANTS } from "./constants.js";

// รายการเริ่มต้นของ "ประเภท Pokémon" — ใช้ตอนสร้างร้านใหม่เท่านั้น หลังจากนี้ผู้ใช้
// แก้ไข/เพิ่ม/ลบเองได้ผ่าน data.pokemonVariants (ดู SettingsTab.jsx)
function defaultPokemonVariants() {
  return Object.entries(POKEMON_VARIANTS).map(([key, v]) => ({ key, label: v.label, emoji: v.emoji }));
}

export function emptyData() {
  return {
    settings: {
      shopName: "Pokémon GO Shop", createdAt: Date.now(), lastBackupAt: null, pin: "", pinQuestion: "", pinAnswer: "", logoDataUrl: "", receiptBgDataUrl: "",
      google: { clientId: "", email: "", spreadsheetId: "", folderId: "", autoSync: true, lastSyncAt: null },
    },
    customers: [],
    gameAccounts: [],
    orders: [],
    investmentHistory: [],
    manualTx: [],
    counters: { order: 0, product: 0 },
    // ถังขยะ: ลูกค้า/ไอดี/สต๊อก/ออเดอร์ที่ "ลบ" จะมาพักที่นี่ก่อน (กู้คืนได้) แทนที่จะหายถาวรทันที
    trash: [],
    // ประวัติการเปลี่ยนแปลงจำนวนสต๊อกทุกครั้ง (ขาย/ยกเลิก/กู้คืน/แก้มือ) เรียงใหม่สุดก่อน
    stockMovements: [],
    // ประเภท Pokémon (ปกติ/Shiny/Shadow ฯลฯ) — แก้ไข/เพิ่ม/ลบเองได้จากหน้าตั้งค่า
    pokemonVariants: defaultPokemonVariants(),
    // ทะเบียนรหัสสินค้า (เช่น A014) — รหัสผูกกับ "ชนิดสินค้า" (ชื่อ+ประเภท) ไม่ใช่ไอดีใดไอดีหนึ่ง
    // สินค้าชื่อ+ประเภทเดียวกันจากคนละไอดีจะได้รหัสเดียวกันเสมอ ดู ensureProductCode()/findStockByProductCode()
    productCodes: [],
  };
}

export function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function orderCodeFromCounter(n) {
  const letterIndex = Math.floor((n - 1) / 9999);
  const num = ((n - 1) % 9999) + 1;
  const letter = String.fromCharCode(97 + (letterIndex % 26)); // a-z, then wraps (practically never reached)
  return `${letter}${String(num).padStart(4, "0")}`;
}

// key มาตรฐานของ "ชนิดสินค้า" — ใช้ตัวพิมพ์เล็ก+ตัดช่องว่าง กันชื่อเดียวกันสะกดต่างเคสแล้วนับเป็นคนละชนิด
function normalizeProductKey(name, variantKey) {
  return `${(name || "").trim().toLowerCase()}|${variantKey || "normal"}`;
}

// รูปแบบรหัสสินค้า: ตัวอักษรพิมพ์ใหญ่ A-Z + เลข 3 หลัก (A001, A002, ... A999, B001, ...) แยกรูปแบบจากเลขออเดอร์
// (a0001 ตัวเล็ก) ชัดเจน กันสับสนเวลาลูกค้าส่งรหัสมาว่าคือรหัสสินค้าหรือเลขออเดอร์
export function productCodeFromCounter(n) {
  const letterIndex = Math.floor((n - 1) / 999);
  const num = ((n - 1) % 999) + 1;
  const letter = String.fromCharCode(65 + (letterIndex % 26));
  return `${letter}${String(num).padStart(3, "0")}`;
}

// ดูรหัสสินค้าที่ "มีอยู่แล้ว" ของชนิดสินค้านี้ (ชื่อ+ประเภท) แบบไม่สร้างใหม่ — ใช้พรีวิวในฟอร์มก่อนบันทึก
export function lookupProductCode(data, name, variantKey) {
  const key = normalizeProductKey(name, variantKey);
  const found = (data.productCodes || []).find(p => p.key === key);
  return found ? found.code : null;
}

// คืนรหัสสินค้าของ "ชนิดสินค้า" นี้ (ชื่อ+ประเภท) — รหัสเดียวกันไม่ว่าจะอยู่ไอดีไหน (ตามที่ตกลงกัน: รหัส
// ผูกกับ "ชนิดสินค้า" ไม่ใช่หน่วยสต๊อกในไอดีใดไอดีหนึ่ง) ถ้ายังไม่เคยมีรหัสมาก่อนจะสร้างรหัสใหม่ให้จาก counters.product
// ฟังก์ชันนี้ไม่แก้ data เดิม (immutable เหมือนฟังก์ชันอื่นในไฟล์นี้) — ผู้เรียกต้องเอา productCodes/counters
// ที่คืนมาไปใส่กลับใน setData เอง (ดูตัวอย่างการใช้งานใน App.jsx: saveStock)
export function ensureProductCode(data, name, variantKey) {
  const key = normalizeProductKey(name, variantKey);
  const productCodes = data.productCodes || [];
  const existing = productCodes.find(p => p.key === key);
  if (existing) return { code: existing.code, productCodes, counters: data.counters };
  const nextN = (data.counters?.product || 0) + 1;
  const code = productCodeFromCounter(nextN);
  const entry = { key, code, name: (name || "").trim(), variant: variantKey || "normal" };
  return {
    code,
    productCodes: [...productCodes, entry],
    counters: { ...data.counters, product: nextN },
  };
}

// หาสต๊อกทุกไอดีที่ตรงกับรหัสสินค้าที่พิมพ์มา — ใช้กับช่องค้นหา "รหัสสินค้า" ในหน้าไอดีเกม
// เทียบแบบไม่สนตัวพิมพ์เล็ก/ใหญ่และตัดช่องว่างหัวท้ายออกก่อน คืนมาเป็นรายการ { account, item } อาจมีมากกว่า 1
// รายการถ้าสินค้าชนิดนี้มีอยู่หลายไอดี (ตามหลักการ: รหัสเดียวกันข้ามไอดีได้ ดู ensureProductCode ด้านบน)
export function findStockByProductCode(data, codeInput) {
  const target = (codeInput || "").trim().toUpperCase();
  if (!target) return [];
  const results = [];
  (data.gameAccounts || []).forEach(acc => {
    (acc.stock || []).forEach(item => {
      if ((item.productCode || "").toUpperCase() === target) results.push({ account: acc, item });
    });
  });
  return results;
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function fmtMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  } catch { return d; }
}

export function daysBetween(a, b) {
  const A = new Date(a); const B = new Date(b);
  return Math.round((B - A) / 86400000);
}

export function clamp0(n) { return Math.max(0, Number(n) || 0); }

export function uniquePokemonNames(data) {
  const seen = new Map(); // lowercase -> first-seen original casing
  (data.gameAccounts || []).forEach(a => (a.stock || []).forEach(s => {
    const n = (s.name || "").trim();
    if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
  }));
  (data.orders || []).forEach(o => {
    const n = (o.pokemonName || "").trim();
    if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
  });
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "th"));
}

export function existingAccountNames(data) {
  const seen = new Map();
  (data.gameAccounts || []).forEach(a => {
    const n = (a.name || "").trim();
    if (n && !seen.has(n.toLowerCase())) seen.set(n.toLowerCase(), n);
  });
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b, "th"));
}

export function fileToLogoDataUrl(file, maxDim = 512, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function fileToJpegDataUrl(file, maxDim = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("image decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        // JPEG has no alpha channel — fill white first so transparent PNG/HEIC
        // screenshots don't turn black.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Read a file's bytes as-is into a data URL — no canvas, no resize, no
// re-encoding. Used when the user explicitly picks "ต้นฉบับ" (original) in
// the photo size choice so the exact original file gets uploaded, at the
// cost of a bigger data URL / slower sync for very large phone photos.
export function fileToOriginalDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

// Preset size/quality choices offered when picking a product photo (see
// ProofImagePicker.jsx's `sizeChoices` prop). "original" skips resizing
// entirely via fileToOriginalDataUrl; every other choice resizes + re-encodes
// as JPEG via fileToJpegDataUrl at a much higher quality than the 0.72 used
// for slip/proof photos (those are just for record-keeping, not customer-facing).
export const STOCK_PHOTO_SIZE_CHOICES = [
  { key: "large", label: "คมชัดสูง (1600px)", maxDim: 1600, quality: 0.92 },
  { key: "medium", label: "มาตรฐาน (1200px)", maxDim: 1200, quality: 0.9 },
  { key: "small", label: "ไฟล์เล็ก (800px)", maxDim: 800, quality: 0.85 },
  { key: "original", label: "ต้นฉบับ (ไม่บีบ/ไม่ย่อ)", maxDim: null, quality: null },
];

// Find an existing stock item (on any ไอดี/account) with the exact same
// Pokémon name + ประเภท that already has a photo — used to offer reusing
// that photo (and price) instead of making the person crop/upload the same
// picture again for every ไอดี that happens to stock the same Pokémon.
// `excludeId` skips the item currently being edited (so editing an item
// doesn't "match" against itself).
export function findMatchingStock(data, name, variantKey, excludeId) {
  const n = (name || "").trim().toLowerCase();
  if (!n || !variantKey) return null;
  for (const a of (data.gameAccounts || [])) {
    for (const s of (a.stock || [])) {
      if (s.id === excludeId) continue;
      if ((s.name || "").trim().toLowerCase() === n && (s.variants || []).includes(variantKey) && s.photoDataUrl) {
        return s;
      }
    }
  }
  return null;
}

export function applyAppIcon(logoDataUrl, shopName) {
  try {
    const setLink = (rel, href, extra = {}) => {
      let link = document.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
      Object.entries(extra).forEach(([k, v]) => link.setAttribute(k, v));
    };
    if (logoDataUrl) {
      setLink("icon", logoDataUrl);
      setLink("apple-touch-icon", logoDataUrl);
      const manifest = {
        name: shopName || "Pokémon GO Shop",
        short_name: (shopName || "PGS Shop").slice(0, 12),
        start_url: "./",
        display: "standalone",
        background_color: "#12131c",
        theme_color: "#12131c",
        icons: [
          { src: logoDataUrl, sizes: "192x192", type: "image/png" },
          { src: logoDataUrl, sizes: "512x512", type: "image/png" },
        ],
      };
      const blob = new Blob([JSON.stringify(manifest)], { type: "application/json" });
      setLink("manifest", URL.createObjectURL(blob));
    } else {
      setLink("manifest", "./manifest.json");
    }
  } catch (e) {
    console.error("applyAppIcon failed", e);
  }
}

export function orderBalance(o) {
  const price = Number(o.price) || 0;
  if (o.paymentStatus === "paid") return 0;
  if (o.paymentStatus === "partial") return clamp0(price - (Number(o.paidAmount) || 0));
  return price;
}

export function migrateData(parsed) {
  const d = { ...emptyData(), ...parsed };
  d.settings = { ...emptyData().settings, logoDataUrl: "", receiptBgDataUrl: "", ...(parsed.settings || {}) };
  d.settings.google = { ...emptyData().settings.google, ...(parsed.settings?.google || {}) };
  // ข้อมูลเก่าอาจไม่มี counters.product (เพิ่มมาทีหลังพร้อมระบบรหัสสินค้า) — merge แยกคีย์กันเผื่อ
  // parsed.counters มีแค่ { order } ตัวเดิม จะได้ไม่ทับ product ที่ emptyData() ให้ค่าเริ่มต้นไว้จนหาย
  d.counters = { ...emptyData().counters, ...(parsed.counters || {}) };
  if (!Array.isArray(d.customers)) d.customers = [];
  d.customers = (d.customers || []).map(c => ({
    ...c,
    gameIds: c.gameIds && c.gameIds.length ? c.gameIds : [{ id: genId(), value: c.name || "" }],
  }));
  d.gameAccounts = (d.gameAccounts || []).map(a => ({
    ...a,
    // productCode: "" สำหรับสต๊อกเก่าที่เพิ่มไว้ก่อนมีระบบรหัสสินค้า — เติมรหัสจริงให้ทันทีด้านล่าง
    stock: (a.stock || []).map(s => ({ lowStockThreshold: 2, variants: ["normal"], photoDataUrl: "", price: 0, productCode: "", featured: false, ...s })),
  }));
  // เติมรหัสสินค้าให้สต๊อกเก่าที่ยังไม่มีรหัส (ของก่อนมีระบบรหัสสินค้า) ทันทีตอนโหลดข้อมูล — ไม่ต้องรอ
  // ให้ผู้ใช้แก้ไข/บันทึกทีละชิ้นก่อนถึงจะค้นหาด้วยรหัสเจอ (สินค้าชื่อ+ประเภทเดียวกันได้รหัสเดียวกันเสมอ)
  d.gameAccounts = d.gameAccounts.map(a => ({
    ...a,
    stock: a.stock.map(s => {
      if (s.productCode) return s;
      const { code, productCodes, counters } = ensureProductCode(d, s.name, (s.variants || ["normal"])[0]);
      d.productCodes = productCodes;
      d.counters = counters;
      return { ...s, productCode: code };
    }),
  }));
  d.manualTx = (d.manualTx || []).map(t => ({
    ...t,
    accountId: t.accountId || "",
  }));
  d.orders = (d.orders || []).map(o => {
    const price = Number(o.price) || 0;
    return {
      ...o,
      paymentStatus: o.paymentStatus === "partial" || o.paymentStatus === "paid" ? o.paymentStatus : "pending",
      paidAmount: o.paymentStatus === "paid" ? price : clamp0(o.paidAmount),
      cancelled: !!o.cancelled,
      cancelledAt: o.cancelledAt || null,
      pokemonVariants: o.pokemonVariants || (o.type === "sell_pokemon" ? ["normal"] : []),
      stockItemId: o.stockItemId || null,
      // ราคาต่อตัวของสินค้าที่ขาย (แยกจาก "ราคารวม" ของทั้งออเดอร์) — ใช้อัปเดตราคาสินค้าในสต๊อก
      // เพื่อไปแสดงในหน้า catalog ของลูกค้า บันทึกไว้ในออเดอร์ด้วยเผื่อย้อนดูภายหลัง
      unitPrice: o.unitPrice != null ? clamp0(o.unitPrice) : 0,
      customerGameId: o.customerGameId || "",
      proofImageDataUrl: o.proofImageDataUrl || "",
      driveFileId: o.driveFileId || null,
      hireMode: o.hireMode || "anytime",
      rounds: o.rounds || [],
      hireTotal: o.hireTotal != null ? clamp0(o.hireTotal) : (o.type !== "sell_pokemon" ? (clamp0(o.quantity) || 1) : 0),
      hireUsed: clamp0(o.hireUsed) || 0,
      hireStatus: o.hireStatus === "done" ? "done" : "ongoing",
      cancelHistory: Array.isArray(o.cancelHistory) ? o.cancelHistory : [],
      // สำหรับออเดอร์ "จ้างฟามทั่วไป" — รายการที่ต้องฟาม และวันที่นัดฟาม (ไม่มีระบบนับจำนวน/รอบเหมือนตีบอส/เชิญตี)
      farmItems: o.farmItems || "",
      farmDate: o.farmDate || "",
    };
  });
  if (!Array.isArray(d.trash)) d.trash = [];
  if (!Array.isArray(d.stockMovements)) d.stockMovements = [];
  if (!Array.isArray(d.pokemonVariants) || d.pokemonVariants.length === 0) d.pokemonVariants = defaultPokemonVariants();
  if (!Array.isArray(d.productCodes)) d.productCodes = [];
  return d;
}

// คืน "รายการ key ของประเภท Pokémon" ที่มีอยู่จริงในสต๊อกสำหรับชื่อนี้ (เทียบชื่อแบบไม่สนตัวพิมพ์เล็ก-ใหญ่/เว้นวรรค)
// ใช้กรองตัวเลือก "ประเภท Pokémon" ในฟอร์มออเดอร์ ไม่ให้เลือกประเภทที่ไม่มีของจริงในสต๊อก
// ถ้าไม่พบชื่อนี้ในสต๊อกเลย (เช่น ชื่อใหม่ที่ยังไม่เคยลงสต๊อก) จะคืน [] — ผู้เรียกควรจัดการโดยโชว์ทุกประเภทแทน
export function variantKeysForPokemonName(data, name) {
  const n = (name || "").trim().toLowerCase();
  if (!n) return [];
  const keys = new Set();
  (data.gameAccounts || []).forEach(a => (a.stock || []).forEach(s => {
    if ((s.name || "").trim().toLowerCase() === n) {
      (s.variants && s.variants.length ? s.variants : ["normal"]).forEach(v => keys.add(v));
    }
  }));
  return Array.from(keys);
}

// หา label ของประเภท Pokémon จาก key (เผื่อกรณีหาไม่เจอ เช่นถูกลบไปแล้ว จะโชว์ key แทน)
export function variantLabel(data, key) {
  const v = (data.pokemonVariants || []).find(x => x.key === key);
  return v ? v.label : key;
}

export function variantEmoji(data, key) {
  const v = (data.pokemonVariants || []).find(x => x.key === key);
  return v ? v.emoji : "";
}

// เช็คว่าประเภทนี้ถูกใช้อยู่ในออเดอร์ (ที่ไม่ถูกยกเลิก) หรือรายการสต๊อกอยู่หรือไม่ — ใช้กันการลบประเภทที่ยังมีของอยู่
export function isVariantInUse(data, key) {
  const inOrders = (data.orders || []).some(o => !o.cancelled && (o.pokemonVariants || []).includes(key));
  if (inOrders) return true;
  const inStock = (data.gameAccounts || []).some(a => (a.stock || []).some(s => (s.variants || []).includes(key)));
  return inStock;
}

// สร้าง key ใหม่จากชื่อที่กรอก (ตัวพิมพ์เล็ก, แทนที่อักขระพิเศษ, กันชนกับของเดิม)
export function genVariantKey(label, existingKeys) {
  const base = (label || "").trim().toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, "_").replace(/^_+|_+$/g, "") || "variant";
  let key = base;
  let i = 2;
  while ((existingKeys || []).includes(key)) key = `${base}_${i++}`;
  return key;
}

export function adjustStock(gameAccounts, accountId, stockItemId, delta) {
  if (!accountId || !stockItemId || !delta) return gameAccounts;
  return gameAccounts.map(a => {
    if (a.id !== accountId) return a;
    return {
      ...a,
      stock: (a.stock || []).map(s => s.id === stockItemId ? { ...s, quantity: clamp0((Number(s.quantity) || 0) + delta) } : s),
    };
  });
}

// อัปเดตราคาต่อตัวของ stock item ชิ้นหนึ่ง (เรียกตอนบันทึกออเดอร์ขายที่ล็อกสต๊อกไว้ + กรอกราคาต่อตัวมา)
// เพื่อให้หน้า catalog ของลูกค้า (อ่านจากชีต Stock) เห็นราคาล่าสุดที่เพิ่งขายจริง
export function updateStockPrice(gameAccounts, accountId, stockItemId, price) {
  if (!accountId || !stockItemId) return gameAccounts;
  return gameAccounts.map(a => {
    if (a.id !== accountId) return a;
    return {
      ...a,
      stock: (a.stock || []).map(s => s.id === stockItemId ? { ...s, price: clamp0(price) } : s),
    };
  });
}

// สลับสถานะ "แนะนำสินค้า" ของ stock item ชิ้นหนึ่ง — สินค้าที่ติดดาวแนะนำจะถูกดันขึ้นอันดับแรก ๆ
// ในหน้า catalog.html ที่ลูกค้าเห็น (ดู googleSync.js: stockRows() ที่ sync ค่านี้ขึ้นชีต Stock)
export function toggleFeaturedStock(gameAccounts, accountId, stockItemId) {
  if (!accountId || !stockItemId) return gameAccounts;
  return gameAccounts.map(a => {
    if (a.id !== accountId) return a;
    return {
      ...a,
      stock: (a.stock || []).map(s => s.id === stockItemId ? { ...s, featured: !s.featured } : s),
    };
  });
}

export function pushTrash(trash, type, payload, meta = {}) {
  const entry = { id: genId(), type, deletedAt: new Date().toISOString(), payload, meta };
  return [entry, ...(trash || [])].slice(0, 500); // cap so it can't grow forever
}

export function pushStockMovement(stockMovements, entry) {
  const row = { id: genId(), date: new Date().toISOString(), ...entry };
  return [row, ...(stockMovements || [])].slice(0, 3000); // cap so it can't grow forever
}
