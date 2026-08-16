# Pokémon GO Shop

แอปจัดการร้านขายไอดี/บัญชี Pokémon GO — สร้างด้วย React + Vite, เก็บข้อมูลใน IndexedDB (ผ่าน `idb.js`), ซิงค์ขึ้น Google Sheets + Drive ได้แบบ client-side ล้วน (ไม่มี backend), มีหน้าแคตตาล็อกแยกให้ลูกค้าดูสต๊อกแบบ read-only, และรันเป็น PWA ใช้งานออฟไลน์ได้

> ✅ **ไฟล์นี้เขียนขึ้นหลังตรวจสอบไฟล์ทั้งโปรเจกต์ครบ 100% แล้ว** — ทุกไฟล์ที่ระบุด้านล่างถูกอ่านเนื้อหาจริง ประกอบเป็น `src/` แล้วรันผ่าน TypeScript compiler (โหมด parse + resolve เต็มรูปแบบ) เพื่อยืนยันว่า import/export และ prop ระหว่างไฟล์ตรงกันทั้งหมด ไม่มีไฟล์ไหนขาดหรือ import ผิด

## โครงสร้างโปรเจกต์

```
SHOP-main/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions — build แล้ว deploy ขึ้น GitHub Pages อัตโนมัติเมื่อ push เข้า main
├── public/
│   ├── catalog.html            # หน้าแคตตาล็อกสาธารณะ อ่านสต๊อกจาก Google Sheet โดยตรง (gviz JSON, ไม่ต้องมี backend)
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── icon-512-maskable.png
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service worker (network-first + cache fallback)
├── src/
│   ├── App.jsx                 # component หลัก — เก็บ state, effects, เชื่อมทุกแท็บ/โมดัลเข้าด้วยกัน — default export
│   ├── constants.js             # ORDER_TYPES, PAYMENT_STATUS, TRADE_STATUS, HIRE_STATUS, INVEST_TYPES,
│   │                             # POKEMON_VARIANTS (ค่าเริ่มต้น), HIRE_MODES, STORAGE_KEY
│   ├── GlobalStyle.jsx          # CSS ทั้งหมดของแอป (inject เป็น <style> ครั้งเดียวตอน mount)
│   ├── googleSync.js            # เชื่อม Google OAuth + สร้าง/ซิงค์ Google Sheets (5 แท็บ) และรูปขึ้น Drive
│   ├── idb.js                   # เลเยอร์เก็บข้อมูลลง IndexedDB (แทน localStorage เดิม — โควตาสูงกว่ามาก)
│   ├── main.jsx                 # entry point — createRoot + <App />
│   ├── receipt.js               # สร้างใบเสร็จ (ข้อความ + วาดเป็นรูปผ่าน canvas), ข้อความรายการในถังขยะ
│   ├── utils.js                 # ฟังก์ชันช่วยเหลือทั่วไป (fmtMoney, fmtDate, genId, migrateData, adjustStock, ฯลฯ)
│   └── components/              # 35 ไฟล์ — ดูตารางด้านล่าง
├── index.html
├── package.json
└── vite.config.js
```

### `src/components/` (35 ไฟล์ — ครบตรวจแล้วทุกไฟล์)

| กลุ่ม | ไฟล์ |
|---|---|
| ใช้ร่วมกันทั่วแอป | `StatusDot`, `StatCard`, `Modal`, `EmptyState`, `ShopLogo`, `SubHeader` |
| เปิดล็อก/ครอปรูป | `LockScreen`, `ImageCropModal` |
| โครงหน้าหลัก | `Header`, `BottomNav`, `MoreSheet` |
| หน้าแรก | `Dashboard` |
| ออเดอร์ | `OrdersTab`, `VariantChips`, `RoundsEditor`, `OrderModal`, `ProofImagePicker`, `ReceiptModal` |
| ลูกค้า | `CustomersTab`, `CustomerModal`, `DueSoonModal`, `DebtModal`, `CustomerDetail` |
| ไอดีเกม/สต๊อก | `AccountsTab`, `AccountModal`, `AccountDetail`, `StockModal`, `StockMovementHistory` |
| การเงิน | `FinanceTab`, `TxModal`, `TrashModal` |
| รายงาน | `ReportsTab` |
| ตั้งค่า | `SettingsTab` |
| ⚠️ ไม่ได้ใช้แล้ว (ดูหมายเหตุ) | `TradeTab`, `HireTab` |

> **`TradeTab.jsx` และ `HireTab.jsx` เป็นไฟล์ที่เลิกใช้แล้วโดยตั้งใจ** — มีคอมเมนต์ยืนยันในตัว `OrdersTab.jsx` เองว่าฟังก์ชันของทั้งสองไฟล์ (ปุ่มอัปเดตสถานะเทรดแบบเร็ว, ปุ่ม +/- จำนวนที่ตีไปแล้ว) ถูกย้ายรวมเข้ามาอยู่ในการ์ดแต่ละใบของ `OrdersTab.jsx` แล้ว ตาม Bottom Navigation เวอร์ชันใหม่ที่ตัดแท็บ "เทรด" กับ "ตีบอส/เชิญตี" ออกไป ไฟล์ทั้งสองยังคอมไพล์ผ่านปกติ ไม่มี syntax ผิด แค่ไม่ถูก import ไปใช้ที่ไหนแล้ว — ลบทิ้งได้เลยถ้าไม่ได้ตั้งใจเก็บไว้เผื่ออ้างอิง

## บั๊กที่เจอระหว่างตรวจสอบ — แก้ไขแล้วทั้งหมด

ระหว่างตรวจไฟล์ทีละไฟล์และรัน TypeScript compiler ข้าม `src/` ทั้งหมด เจอบั๊ก 3 จุด (ทั้งหมดอยู่ในโค้ดที่หลงเหลือจากการ refactor ครั้งก่อน ไม่เกี่ยวกับการแตกไฟล์รอบนี้) และแก้ไขในซอร์สที่ส่งมอบให้แล้ว:

1. **`presetAccount` ไม่ถูกส่งต่อให้ `TxModal`** — กดปุ่ม "เติม Coin / ซื้อ Pokémon" จากหน้ารายละเอียดไอดีเกม เคยตกไปที่ไอดีแรกสุดในลิสต์เสมอแทนที่จะเป็นไอดีที่กำลังเปิดดูอยู่ (แก้ที่ `App.jsx`)
2. **ปุ่ม "รอเทรด"/"ทำ 3 ใจ" ใน Dashboard ยิงไปแท็บ `"trade"` ที่ถูกยุบรวมเข้า `OrdersTab` ไปแล้ว** — กดแล้วหน้าจอว่างเปล่า (แก้ที่ `App.jsx` และ `Dashboard.jsx` ให้ยิงไปแท็บออเดอร์พร้อม filter `sell_pokemon` แทน)
3. **`FinanceTab` รับ `onDeleteInvestment` มาแต่ไม่เคยใช้** — รายการ "เติม Coin/ซื้อ Pokémon" ในหน้าการเงินไม่มีปุ่มลบเลย ทั้งที่รายการ "อื่นๆ" ลบได้ปกติ (แก้ที่ `FinanceTab.jsx` ให้มีปุ่มลบแบบเดียวกัน)

## วิธีติดตั้งและรัน

```bash
npm install
npm run dev      # dev server
npm run build    # build สำหรับ deploy (output ที่ dist/)
npm run preview  # ดูผล build ก่อนขึ้นจริง
```

Deploy อัตโนมัติขึ้น GitHub Pages ทุกครั้งที่ push เข้า branch `main` ผ่าน `.github/workflows/deploy.yml` (build ด้วย Node 20 แล้วอัปโหลด `dist/` เป็น Pages artifact)

## Google Sheets / Drive Sync

ทำงานฝั่ง client ทั้งหมด ไม่มี backend และไม่เกี่ยวกับ Anthropic:

1. เจ้าของร้านสร้าง Google OAuth **Client ID** ฟรีใน [Google Cloud Console](https://console.cloud.google.com/) แล้วนำมาใส่ในหน้า Settings ของแอป
2. ล็อกอินด้วย Google account ของตัวเอง แอปจะสร้าง Spreadsheet ชื่อ `<ชื่อร้าน> - ข้อมูลร้าน` และโฟลเดอร์ Drive ชื่อ `<ชื่อร้าน> - สลิป` ให้อัตโนมัติในการซิงค์ครั้งแรก
3. ทุกครั้งที่ซิงค์: ข้อมูลตัวเลข/ข้อความ (ลูกค้า, ออเดอร์, บัญชี, สต๊อก, การเงิน) เขียนเป็นแถวใน Spreadsheet — รูปสลิป/รูปสินค้าอัปโหลดขึ้น Drive ครั้งเดียว (cache ไว้ ไม่อัปซ้ำ) แล้วอ้างอิงด้วยสูตร `=IMAGE(...)` ในชีต
4. Spreadsheet มี 5 แท็บ: `Orders`, `Customers`, `Accounts`, `Stock`, `Finance` — ถ้าเป็นสเปรดชีตเก่าที่แท็บ/หัวคอลัมน์ไม่ตรง แอปจะแก้ไขให้อัตโนมัติทุกครั้งที่ซิงค์ (self-healing)

## หน้าแคตตาล็อกสำหรับลูกค้า (`public/catalog.html`)

- เป็นหน้า static แยกจากตัวแอปหลัก อ่านข้อมูลจาก Google Sheet เดียวกันแบบ read-only (ต้องตั้งค่าแชร์ชีตเป็น "ทุกคนที่มีลิงก์ - ดูได้" ก่อน)
- ตั้งค่าครั้งแรกโดยวาง Spreadsheet ID หรือลิงก์ชีตในหน้าเว็บ แล้วจะได้ลิงก์รูปแบบ `catalog.html?sheet=<id>` ไว้ส่งให้ลูกค้า
- ดึงข้อมูลจากแท็บ `Stock` (สินค้า) และ `Orders` (ใช้คำนวณ "สินค้ามาแรง" จากยอดขาย `sell_pokemon` ที่ไม่ถูกยกเลิก)

## IndexedDB / การเก็บข้อมูลในเครื่อง (`src/idb.js`)

ข้อมูลร้านทั้งหมดเก็บใน IndexedDB ของเบราว์เซอร์ (แทน localStorage เดิมที่จำกัดแค่ ~5-10MB และจะเซฟไม่ผ่านเงียบๆ เมื่อร้านมีออเดอร์แนบรูปสลิปหลายร้อยรายการ) — มีระบบ migrate ข้อมูลเก่าจาก localStorage มา IndexedDB อัตโนมัติแบบ one-time ตอนเปิดแอปครั้งแรกหลังอัปเดต

## PWA / ออฟไลน์ (`public/manifest.json`, `public/sw.js`)

- `sw.js` ใช้กลยุทธ์ network-first สำหรับ same-origin request ทุกตัว, cache ทุกอย่างที่ fetch สำเร็จ, และ fallback ไป cache เมื่อออฟไลน์ (hashed build files ของ Vite จะถูก cache อัตโนมัติตั้งแต่ครั้งแรกที่ fetch โดยไม่ต้องลิสต์ไว้ล่วงหน้า)
- ข้อมูลแอปเองอยู่ใน IndexedDB อยู่แล้ว จึงใช้งานต่อได้แม้ไม่มีเน็ตหลังจากเข้าเว็บครั้งแรกสำเร็จ

## Backup / กู้คืนข้อมูล

- Export ข้อมูลทั้งร้านเป็นไฟล์ `.json` ได้จากหน้า Settings — แนะนำให้ทำเป็นประจำเพราะข้อมูลอยู่ในเครื่องนี้เครื่องเดียว (แอปจะเตือนอัตโนมัติถ้าไม่ได้ backup เกิน 7 วัน)
- ถ้าลืม PIN ล็อกแอป กู้คืนได้ 2 ทาง: ตอบคำถามกู้คืนที่ตั้งไว้ หรืออัปโหลดไฟล์ backup `.json` ที่เคยดาวน์โหลดไว้ (ดูใน `LockScreen.jsx`)
- Export เป็น Excel (`.xlsx`, ผ่านไลบรารี `xlsx`) และ PDF (ผ่าน browser print) ได้จากหน้า Settings เช่นกัน
