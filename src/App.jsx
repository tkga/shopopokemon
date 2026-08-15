import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Download,
  AlertTriangle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { idbStorage, migrateFromLocalStorage } from "./idb.js";

// IndexedDB-backed storage — same { get(key)/set(key,value) } shape the app
// always used, but with a much higher quota than localStorage so a year's
// worth of orders with attached slip photos doesn't silently stop saving.
// See src/idb.js for why this replaced the old localStorage wrapper.
const storage = idbStorage;
import { requestAccessToken, disconnectGoogle, fetchGoogleProfile, ensureSpreadsheet, ensureDriveFolder, syncAll } from "./googleSync.js";
import { STORAGE_KEY, ORDER_TYPES, PAYMENT_STATUS, TRADE_STATUS, HIRE_STATUS, INVEST_TYPES, POKEMON_VARIANTS, HIRE_MODES } from "./constants.js";
import { emptyData, genId, orderCodeFromCounter, todayStr, daysBetween, clamp0, applyAppIcon, orderBalance, migrateData, adjustStock, updateStockPrice, pushTrash, pushStockMovement, ensureProductCode, toggleFeatured, applyFeaturedOrder } from "./utils.js";
import GlobalStyle from "./GlobalStyle.jsx";
import Modal from "./components/Modal.jsx";
import LockScreen from "./components/LockScreen.jsx";
import Header from "./components/Header.jsx";
import BottomNav from "./components/BottomNav.jsx";
import MoreSheet from "./components/MoreSheet.jsx";
import Dashboard from "./components/Dashboard.jsx";
import OrdersTab from "./components/OrdersTab.jsx";
import OrderModal from "./components/OrderModal.jsx";
import ReceiptModal from "./components/ReceiptModal.jsx";
import CustomersTab from "./components/CustomersTab.jsx";
import CustomerModal from "./components/CustomerModal.jsx";
import DueSoonModal from "./components/DueSoonModal.jsx";
import DebtModal from "./components/DebtModal.jsx";
import CustomerDetail from "./components/CustomerDetail.jsx";
import AccountsTab from "./components/AccountsTab.jsx";
import AccountModal from "./components/AccountModal.jsx";
import AccountDetail from "./components/AccountDetail.jsx";
import StockModal from "./components/StockModal.jsx";
import CodeSearchModal from "./components/CodeSearchModal.jsx";
import FeaturedModal from "./components/FeaturedModal.jsx";
import FinanceTab from "./components/FinanceTab.jsx";
import TxModal from "./components/TxModal.jsx";
import TrashModal from "./components/TrashModal.jsx";
import ReportsTab from "./components/ReportsTab.jsx";
import SettingsTab from "./components/SettingsTab.jsx";

export default function App() {
  const [data, setData] = useState(emptyData());
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [moreOpen, setMoreOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [detail, setDetail] = useState(null);
  const [ordersInitialFilter, setOrdersInitialFilter] = useState("all");
  // ไปหน้าแท็บทั่วไป — ถ้าปลายทางคือ "orders" ให้รีเซ็ต filter เป็น "ทั้งหมด" เสมอ
  // (ยกเว้นตอนมาจาก DueSoonModal ที่ตั้งใจส่ง filter เฉพาะเจาะจงมาเอง จะไม่ผ่านฟังก์ชันนี้)
  const navigateTab = (t) => {
    if (t === "orders") setOrdersInitialFilter("all");
    setTab(t);
  };
  const [unlocked, setUnlocked] = useState(false);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleStatus, setGoogleStatus] = useState("");
  const saveTimer = useRef(null);
  const backupPromptedRef = useRef(false);
  const notifAskedRef = useRef(false);
  const autoSyncTimer = useRef(null);

  // ---- load ----
  useEffect(() => {
    (async () => {
      try {
        await migrateFromLocalStorage(STORAGE_KEY); // one-time: old localStorage data -> IndexedDB
        const res = await storage.get(STORAGE_KEY);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setData(migrateData(parsed));
        }
      } catch (e) {
        // no existing data yet
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ---- save (debounced) ----
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await storage.set(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.error("save failed", e);
      }
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [data, loaded]);

  // ---- auto-sync to Google Sheets/Drive (debounced) — this is the "automatic cloud backup" ----
  // Fires a while after the user stops editing so a burst of changes (e.g. filling
  // out one order) becomes a single sync instead of one per keystroke.
  useEffect(() => {
    if (!loaded) return;
    if (data.settings.pin && !unlocked) return;
    const g = data.settings.google;
    if (!g.spreadsheetId || !g.folderId || !g.autoSync) return;
    if (autoSyncTimer.current) clearTimeout(autoSyncTimer.current);
    autoSyncTimer.current = setTimeout(() => {
      if (!googleSyncing) runSync();
    }, 45000);
    return () => clearTimeout(autoSyncTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loaded, unlocked]);

  // ---- keep favicon / home-screen icon in sync with the uploaded shop logo ----
  useEffect(() => {
    if (!loaded) return;
    applyAppIcon(data.settings.logoDataUrl, data.settings.shopName);
  }, [loaded, data.settings.logoDataUrl, data.settings.shopName]);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }, []);

  // ---------- derived ----------
  const stats = useMemo(() => {
    const orders = data.orders.filter(o => !o.cancelled);
    const today = todayStr();
    const month = today.slice(0, 7);
    const year = today.slice(0, 4);

    const incomeEntries = [
      ...orders.filter(o => o.paymentStatus === "paid").map(o => ({ date: (o.paidDate || o.createdAt).slice(0, 10), amount: Number(o.price) || 0 })),
      ...orders.filter(o => o.paymentStatus === "partial").map(o => ({ date: (o.paidDate || o.createdAt).slice(0, 10), amount: Number(o.paidAmount) || 0 })),
      ...data.manualTx.filter(t => t.type === "income").map(t => ({ date: t.date, amount: Number(t.amount) || 0 })),
    ];
    const expenseEntries = [
      ...data.investmentHistory.map(h => ({ date: h.date, amount: Number(h.amount) || 0 })),
      ...data.manualTx.filter(t => t.type === "expense").map(t => ({ date: t.date, amount: Number(t.amount) || 0 })),
    ];
    const sumBy = (arr, prefix) => arr.filter(e => e.date && e.date.startsWith(prefix)).reduce((s, e) => s + e.amount, 0);

    const incomeToday = sumBy(incomeEntries, today);
    const incomeMonth = sumBy(incomeEntries, month);
    const incomeYear = sumBy(incomeEntries, year);
    const expenseToday = sumBy(expenseEntries, today);
    const expenseMonth = sumBy(expenseEntries, month);
    const expenseYear = sumBy(expenseEntries, year);

    const totalInvestment = data.investmentHistory.reduce((s, h) => s + (Number(h.amount) || 0), 0)
      + data.manualTx.filter(t => t.type === "expense" && t.accountId).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const investByAccount = {};
    data.investmentHistory.forEach(h => { investByAccount[h.accountId] = (investByAccount[h.accountId] || 0) + (Number(h.amount) || 0); });
    // รายการ "อื่นๆ" ที่เป็นรายจ่ายและผูกกับไอดีเกม ก็ถือเป็นเงินลงทุนของไอดีนั้นด้วย (เช่น ค่าธรรมเนียม/ค่าใช้จ่ายอื่นที่จ่ายเพื่อไอดีนี้)
    data.manualTx.filter(t => t.type === "expense" && t.accountId).forEach(t => { investByAccount[t.accountId] = (investByAccount[t.accountId] || 0) + (Number(t.amount) || 0); });

    const pendingPayment = orders.filter(o => o.paymentStatus === "pending" || o.paymentStatus === "partial").length;
    const totalDue = orders.reduce((s, o) => s + orderBalance(o), 0);
    const pendingTrade = orders.filter(o => o.type === "sell_pokemon" && o.tradeStatus === "waiting").length;
    const threeHearts = orders.filter(o => o.type === "sell_pokemon" && o.tradeStatus === "three_hearts").length;
    const cancelledCount = data.orders.filter(o => o.cancelled).length;

    let lowStockCount = 0;
    const lowStockItems = [];
    data.gameAccounts.forEach(a => {
      (a.stock || []).forEach(s => {
        const th = s.lowStockThreshold ?? 2;
        if (clamp0(s.quantity) <= th) { lowStockCount++; lowStockItems.push({ accountId: a.id, accountName: a.name, ...s }); }
      });
    });

    // appointments / hit-rounds coming due (or overdue) within the next 7 days
    const dueSoonItems = [];
    orders.forEach(o => {
      if (o.appointmentDate && o.tradeStatus !== "traded") {
        const remain = daysBetween(today, o.appointmentDate);
        if (remain <= 7) dueSoonItems.push({ orderId: o.id, customerId: o.customerId, date: o.appointmentDate, remain, kind: "appointment" });
      }
      if (o.farmDate && o.hireStatus !== "done") {
        const remain = daysBetween(today, o.farmDate);
        if (remain <= 7) dueSoonItems.push({ orderId: o.id, customerId: o.customerId, date: o.farmDate, remain, kind: "farm" });
      }
      if (o.hireStatus !== "done") {
        (o.rounds || []).forEach(r => {
          if (!r.done && r.date) {
            const remain = daysBetween(today, r.date);
            if (remain <= 7) dueSoonItems.push({ orderId: o.id, customerId: o.customerId, date: r.date, remain, kind: "round" });
          }
        });
      }
    });
    dueSoonItems.sort((a, b) => a.remain - b.remain);

    return {
      incomeToday, incomeMonth, incomeYear, expenseToday, expenseMonth, expenseYear,
      profitToday: incomeToday - expenseToday, profitMonth: incomeMonth - expenseMonth, profitYear: incomeYear - expenseYear,
      totalInvestment, investByAccount, pendingPayment, totalDue, pendingTrade, threeHearts, cancelledCount,
      totalOrders: orders.length, incomeEntries, expenseEntries, lowStockCount, lowStockItems,
      dueSoonCount: dueSoonItems.length, dueSoonItems,
    };
  }, [data]);

  const custName = (id) => data.customers.find(c => c.id === id)?.name || "-";
  const accName = (id) => data.gameAccounts.find(a => a.id === id)?.name || "-";

  // ---- prominent backup reminder: pop up right when the app opens (not just a quiet dashboard card) ----
  useEffect(() => {
    if (!loaded) return;
    if (data.settings.pin && !unlocked) return; // wait until the user is actually in the app
    if (backupPromptedRef.current) return;
    backupPromptedRef.current = true;
    const days = data.settings.lastBackupAt ? daysBetween(data.settings.lastBackupAt, new Date().toISOString()) : null;
    const needs = days === null ? (data.orders.length + data.customers.length > 0) : days >= 1;
    if (needs) setShowBackupPrompt(true);
  }, [loaded, unlocked, data.settings.pin]);

  // ---- ask for notification permission once the user is in the app ----
  useEffect(() => {
    if (!loaded) return;
    if (data.settings.pin && !unlocked) return;
    if (notifAskedRef.current) return;
    if (typeof Notification === "undefined") return;
    notifAskedRef.current = true;
    if (Notification.permission === "default") Notification.requestPermission();
  }, [loaded, unlocked, data.settings.pin]);

  // ---- notify 1 day (or same-day) before a boss/invite round, appointment, or 3-hearts trade comes due ----
  useEffect(() => {
    if (!loaded) return;
    if (data.settings.pin && !unlocked) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const dueNow = stats.dueSoonItems.filter(it => it.remain <= 1 && it.remain >= 0);
    if (dueNow.length === 0) return;
    const notifiedKey = "pgs-notified-" + todayStr();
    let notifiedIds = [];
    try { notifiedIds = JSON.parse(window.localStorage.getItem(notifiedKey) || "[]"); } catch { notifiedIds = []; }
    const toNotify = dueNow.filter(it => !notifiedIds.includes(`${it.orderId}-${it.kind}-${it.date}`));
    if (toNotify.length === 0) return;
    toNotify.forEach(it => {
      const label = it.kind === "round" ? "รอบตี" : "นัดหมาย/ทำ 3 ใจ";
      const name = custName(it.customerId);
      const body = it.remain === 0 ? `${label} ของ ${name} ถึงกำหนดวันนี้` : `${label} ของ ${name} ถึงกำหนดพรุ่งนี้`;
      try { new Notification(data.settings.shopName || "Pokémon GO Shop", { body, tag: `${it.orderId}-${it.kind}` }); } catch { /* ignore */ }
    });
    try { window.localStorage.setItem(notifiedKey, JSON.stringify([...notifiedIds, ...toNotify.map(it => `${it.orderId}-${it.kind}-${it.date}`)])); } catch { /* ignore */ }
  }, [loaded, unlocked, data.settings.pin, stats.dueSoonItems]);

  // ---- register the service worker so the app keeps working offline ----
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => { /* ignore — offline support just won't be available */ });
    }
  }, []);

  // ---- auto-purge trash items older than 30 days (runs once per load) ----
  useEffect(() => {
    if (!loaded) return;
    setData(d => {
      if (!d.trash || !d.trash.length) return d;
      const cutoff = Date.now() - 30 * 86400000;
      const kept = d.trash.filter(t => new Date(t.deletedAt).getTime() > cutoff);
      if (kept.length === d.trash.length) return d;
      return { ...d, trash: kept };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  // ---------- CRUD ----------
  function saveCustomer(item) {
    setData(d => {
      const exists = d.customers.some(c => c.id === item.id);
      return { ...d, customers: exists ? d.customers.map(c => c.id === item.id ? item : c) : [...d.customers, item] };
    });
    showToast(item._isNew ? "เพิ่มลูกค้าแล้ว" : "บันทึกแล้ว");
  }
  // deletes are soft: the record moves to `trash` (restorable) instead of being dropped immediately.
  // Trash items older than 30 days are auto-purged for real — see the effect near the top of this component.
  function deleteCustomer(id) {
    setData(d => {
      const item = d.customers.find(c => c.id === id);
      if (!item) return d;
      return { ...d, customers: d.customers.filter(c => c.id !== id), trash: pushTrash(d.trash, "customer", item) };
    });
    showToast("ย้ายลูกค้าไปถังขยะแล้ว (กู้คืนได้ในตั้งค่า)");
  }
  function saveAccount(item) {
    setData(d => {
      const exists = d.gameAccounts.some(a => a.id === item.id);
      return { ...d, gameAccounts: exists ? d.gameAccounts.map(a => a.id === item.id ? item : a) : [...d.gameAccounts, item] };
    });
    showToast("บันทึกไอดีแล้ว");
  }
  function deleteAccount(id) {
    setData(d => {
      const item = d.gameAccounts.find(a => a.id === id);
      if (!item) return d;
      return { ...d, gameAccounts: d.gameAccounts.filter(a => a.id !== id), trash: pushTrash(d.trash, "account", item) };
    });
    showToast("ย้ายไอดีไปถังขยะแล้ว (กู้คืนได้ในตั้งค่า)");
  }
  // สลับตำแหน่งไอดีเกม (เลื่อนขึ้น/ลง) ในรายการ — ให้ผู้ใช้จัดลำดับการแสดงผลเองได้ตามใจ
  function moveAccount(id, direction) {
    setData(d => {
      const idx = d.gameAccounts.findIndex(a => a.id === id);
      const newIdx = idx + direction;
      if (idx === -1 || newIdx < 0 || newIdx >= d.gameAccounts.length) return d;
      const arr = [...d.gameAccounts];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...d, gameAccounts: arr };
    });
  }
  function saveOrder(item, isNew) {
    setData(d => {
      let counters = d.counters;
      let orders;
      let gameAccounts = d.gameAccounts;
      let stockMovements = d.stockMovements;
      // อัปเดตราคาสินค้าในสต๊อกให้ตรงกับราคาต่อตัวที่เพิ่งกรอกในออเดอร์นี้เสมอ (ไม่ว่าจะเป็นออเดอร์ใหม่/แก้ไข
      // หรือออเดอร์ที่ถูกยกเลิกอยู่ก็ตาม) เพื่อให้หน้า catalog ของลูกค้าเห็นราคาล่าสุดที่ตั้งไว้จริง
      if (item.type === "sell_pokemon" && item.stockItemId && Number(item.unitPrice) > 0) {
        gameAccounts = updateStockPrice(gameAccounts, item.sourceAccountId, item.stockItemId, item.unitPrice);
      }
      // logs a movement AFTER gameAccounts already reflects the change, so resultQty is accurate
      const logMove = (accountId, stockItemId, delta, reason) => {
        if (!accountId || !stockItemId || !delta) return;
        const acc = gameAccounts.find(a => a.id === accountId);
        const stockItem = acc?.stock?.find(s => s.id === stockItemId);
        stockMovements = pushStockMovement(stockMovements, {
          accountId, accountName: acc?.name || "", stockItemId, pokemonName: stockItem?.name || item.pokemonName || "",
          delta, resultQty: stockItem ? stockItem.quantity : null, reason, refOrderCode: item.code || item.id,
        });
      };
      if (isNew) {
        const n = (d.counters.order || 0) + 1;
        counters = { ...d.counters, order: n };
        item.code = orderCodeFromCounter(n);
        orders = [item, ...d.orders];
        if (!item.cancelled && item.type === "sell_pokemon" && item.stockItemId) {
          const delta = -clamp0(item.quantity);
          gameAccounts = adjustStock(gameAccounts, item.sourceAccountId, item.stockItemId, delta);
          logMove(item.sourceAccountId, item.stockItemId, delta, "ขายออเดอร์ใหม่");
        }
      } else {
        const old = d.orders.find(o => o.id === item.id);
        orders = d.orders.map(o => o.id === item.id ? item : o);
        // only reconcile stock when the order stays "active" through the edit; cancel/restore handle stock separately
        if (old && !old.cancelled && !item.cancelled) {
          if (old.type === "sell_pokemon" && old.stockItemId) {
            const delta = clamp0(old.quantity);
            gameAccounts = adjustStock(gameAccounts, old.sourceAccountId, old.stockItemId, delta);
            logMove(old.sourceAccountId, old.stockItemId, delta, "แก้ไขออเดอร์ (คืนสต๊อกเดิม)");
          }
          if (item.type === "sell_pokemon" && item.stockItemId) {
            const delta = -clamp0(item.quantity);
            gameAccounts = adjustStock(gameAccounts, item.sourceAccountId, item.stockItemId, delta);
            logMove(item.sourceAccountId, item.stockItemId, delta, "แก้ไขออเดอร์ (ตัดสต๊อกใหม่)");
          }
        }
      }
      return { ...d, orders, counters, gameAccounts, stockMovements };
    });
    showToast(isNew ? "สร้างออเดอร์แล้ว" : "บันทึกออเดอร์แล้ว");
  }
  function quickComplete(order) {
    const price = Number(order.price) || 0;
    saveOrder({ ...order, paymentStatus: "paid", paidAmount: price, paidDate: order.paidDate || new Date().toISOString() }, false);
  }
  function quickUseHire(order, delta) {
    const total = clamp0(order.hireTotal);
    const nextUsed = clamp0((clamp0(order.hireUsed) || 0) + delta);
    const capped = total > 0 ? Math.min(nextUsed, total) : nextUsed;
    saveOrder({ ...order, hireUsed: capped }, false);
  }
  function quickSetTradeStatus(id, status) {
    setData(d => ({ ...d, orders: d.orders.map(o => o.id === id ? { ...o, tradeStatus: status } : o) }));
    showToast(TRADE_STATUS[status] ? `อัปเดตเป็น "${TRADE_STATUS[status].label}"` : "อัปเดตสถานะเทรดแล้ว");
  }
  function quickSetHireStatus(id, status) {
    setData(d => ({ ...d, orders: d.orders.map(o => o.id === id ? { ...o, hireStatus: status } : o) }));
    showToast(HIRE_STATUS[status] ? `อัปเดตเป็น "${HIRE_STATUS[status].label}"` : "อัปเดตสถานะแล้ว");
  }
  function cancelOrder(id, reason) {
    setData(d => {
      const order = d.orders.find(o => o.id === id);
      if (!order || order.cancelled) return d;
      let gameAccounts = d.gameAccounts;
      let stockMovements = d.stockMovements;
      if (order.type === "sell_pokemon" && order.stockItemId) {
        const delta = clamp0(order.quantity);
        gameAccounts = adjustStock(gameAccounts, order.sourceAccountId, order.stockItemId, delta);
        const acc = gameAccounts.find(a => a.id === order.sourceAccountId);
        const stockItem = acc?.stock?.find(s => s.id === order.stockItemId);
        stockMovements = pushStockMovement(stockMovements, {
          accountId: order.sourceAccountId, accountName: acc?.name || "", stockItemId: order.stockItemId,
          pokemonName: order.pokemonName || "", delta, resultQty: stockItem ? stockItem.quantity : null,
          reason: "ยกเลิกออเดอร์ (คืนสต๊อก)", refOrderCode: order.code,
        });
      }
      const historyEntry = { id: genId(), date: new Date().toISOString(), reason: (reason || "").trim() || "ไม่ระบุเหตุผล" };
      const orders = d.orders.map(o => o.id === id ? {
        ...o, cancelled: true, cancelledAt: new Date().toISOString(),
        cancelHistory: [historyEntry, ...(o.cancelHistory || [])],
      } : o);
      return { ...d, orders, gameAccounts, stockMovements };
    });
    showToast("ยกเลิกออเดอร์แล้ว");
  }
  // used by quick "ยกเลิก" buttons outside the order form — asks the reason first via a native prompt
  function promptCancelOrder(id) {
    const reason = window.prompt("ยกเลิกออเดอร์นี้เพราะอะไร?");
    if (reason === null) return; // user pressed cancel on the prompt itself — abort, don't cancel the order
    cancelOrder(id, reason);
  }
  function restoreOrder(id) {
    setData(d => {
      const order = d.orders.find(o => o.id === id);
      if (!order || !order.cancelled) return d;
      let gameAccounts = d.gameAccounts;
      let stockMovements = d.stockMovements;
      if (order.type === "sell_pokemon" && order.stockItemId) {
        const delta = -clamp0(order.quantity);
        gameAccounts = adjustStock(gameAccounts, order.sourceAccountId, order.stockItemId, delta);
        const acc = gameAccounts.find(a => a.id === order.sourceAccountId);
        const stockItem = acc?.stock?.find(s => s.id === order.stockItemId);
        stockMovements = pushStockMovement(stockMovements, {
          accountId: order.sourceAccountId, accountName: acc?.name || "", stockItemId: order.stockItemId,
          pokemonName: order.pokemonName || "", delta, resultQty: stockItem ? stockItem.quantity : null,
          reason: "กู้คืนออเดอร์ (ตัดสต๊อกใหม่)", refOrderCode: order.code,
        });
      }
      const orders = d.orders.map(o => o.id === id ? { ...o, cancelled: false, cancelledAt: null } : o);
      return { ...d, orders, gameAccounts, stockMovements };
    });
    showToast("กู้คืนออเดอร์แล้ว");
  }
  // permanent-looking delete, but really moves to trash (restorable within 30 days) — see restoreFromTrash
  function deleteOrder(id) {
    setData(d => {
      const order = d.orders.find(o => o.id === id);
      if (!order) return d;
      let gameAccounts = d.gameAccounts;
      let stockMovements = d.stockMovements;
      if (!order.cancelled && order.type === "sell_pokemon" && order.stockItemId) {
        const delta = clamp0(order.quantity);
        gameAccounts = adjustStock(gameAccounts, order.sourceAccountId, order.stockItemId, delta);
        const acc = gameAccounts.find(a => a.id === order.sourceAccountId);
        const stockItem = acc?.stock?.find(s => s.id === order.stockItemId);
        stockMovements = pushStockMovement(stockMovements, {
          accountId: order.sourceAccountId, accountName: acc?.name || "", stockItemId: order.stockItemId,
          pokemonName: order.pokemonName || "", delta, resultQty: stockItem ? stockItem.quantity : null,
          reason: "ลบออเดอร์ (คืนสต๊อก)", refOrderCode: order.code,
        });
      }
      return {
        ...d, orders: d.orders.filter(o => o.id !== id), gameAccounts, stockMovements,
        trash: pushTrash(d.trash, "order", order),
      };
    });
    showToast("ย้ายออเดอร์ไปถังขยะแล้ว (กู้คืนได้ในตั้งค่า)");
  }
  function saveStock(accountId, item) {
    setData(d => {
      const acc = d.gameAccounts.find(a => a.id === accountId);
      const existing = acc?.stock?.find(s => s.id === item.id);
      let stockMovements = d.stockMovements;
      const newQty = clamp0(item.quantity);
      if (!existing) {
        if (newQty > 0) {
          stockMovements = pushStockMovement(stockMovements, {
            accountId, accountName: acc?.name || "", stockItemId: item.id, pokemonName: item.name || "",
            delta: newQty, resultQty: newQty, reason: "เพิ่มสต๊อกใหม่",
          });
        }
      } else {
        const delta = newQty - clamp0(existing.quantity);
        if (delta !== 0) {
          stockMovements = pushStockMovement(stockMovements, {
            accountId, accountName: acc?.name || "", stockItemId: item.id, pokemonName: item.name || "",
            delta, resultQty: newQty, reason: "แก้ไขจำนวนสต๊อกด้วยมือ",
          });
        }
      }
      // รหัสสินค้า (เช่น A014) ผูกกับ "ชื่อ+ประเภท" ไม่ใช่ไอดีนี้โดยเฉพาะ — ถ้าชื่อ+ประเภทนี้เคยมีรหัส
      // อยู่แล้ว (จากไอดีอื่นหรือของเดิม) ใช้รหัสเดิมซ้ำ ถ้ายังไม่เคยมีจะสร้างรหัสใหม่ให้ตรงนี้เลย
      const variantKey = (item.variants && item.variants[0]) || "normal";
      const { code, productCodes, counters } = ensureProductCode(d, item.name, variantKey);
      const itemWithCode = { ...item, productCode: code };
      return {
        ...d,
        gameAccounts: d.gameAccounts.map(a => {
          if (a.id !== accountId) return a;
          const stock = a.stock || [];
          const exists = stock.some(s => s.id === item.id);
          return { ...a, stock: exists ? stock.map(s => s.id === item.id ? itemWithCode : s) : [itemWithCode, ...stock] };
        }),
        stockMovements,
        productCodes,
        counters,
      };
    });
    showToast("บันทึกสต๊อกแล้ว");
  }
  function deleteStock(accountId, stockId) {
    setData(d => {
      const acc = d.gameAccounts.find(a => a.id === accountId);
      const item = acc?.stock?.find(s => s.id === stockId);
      if (!acc || !item) return d;
      const stockMovements = pushStockMovement(d.stockMovements, {
        accountId, accountName: acc.name || "", stockItemId: stockId, pokemonName: item.name || "",
        delta: -clamp0(item.quantity), resultQty: 0, reason: "ลบสต๊อก",
      });
      return {
        ...d,
        gameAccounts: d.gameAccounts.map(a => a.id === accountId ? { ...a, stock: (a.stock || []).filter(s => s.id !== stockId) } : a),
        trash: pushTrash(d.trash, "stock", item, { accountId, accountName: acc.name || "" }),
        stockMovements,
      };
    });
    showToast("ย้ายสต๊อกไปถังขยะแล้ว (กู้คืนได้ในตั้งค่า)");
  }
  // สลับสถานะ "สินค้าแนะนำ" ของรหัสสินค้าหนึ่งตัว (เปิด/ปิด) — ผูกกับรหัสสินค้า (ชื่อ+ประเภท) ไม่ใช่
  // หน่วยสต๊อกในไอดีใดไอดีหนึ่ง เพราะฉะนั้นมีผลกับของชนิดนี้ทุกไอดีที่มีพร้อมกัน ทำงานทันที ไม่ต้องรอกดบันทึกฟอร์มสต๊อก
  function toggleFeaturedStock(productCode) {
    if (!productCode) return;
    setData(d => ({ ...d, productCodes: toggleFeatured(d.productCodes, productCode) }));
  }
  // จัดลำดับสินค้าแนะนำใหม่ทั้งชุด (จากการลากในเมนู "สินค้าแนะนำ") — orderedCodes คือลำดับรหัสสินค้าใหม่ทั้งหมด
  function reorderFeatured(orderedCodes) {
    setData(d => ({ ...d, productCodes: applyFeaturedOrder(d.productCodes, orderedCodes) }));
  }
  // ---------- trash bin: restore / permanently delete ----------
  function restoreFromTrash(trashId) {
    setData(d => {
      const entry = d.trash.find(t => t.id === trashId);
      if (!entry) return d;
      const trash = d.trash.filter(t => t.id !== trashId);
      if (entry.type === "customer") {
        return { ...d, customers: [entry.payload, ...d.customers], trash };
      }
      if (entry.type === "account") {
        return { ...d, gameAccounts: [entry.payload, ...d.gameAccounts], trash };
      }
      if (entry.type === "stock") {
        const accountId = entry.meta?.accountId;
        const accExists = d.gameAccounts.some(a => a.id === accountId);
        if (!accExists) return d; // guarded in the UI too — restore is disabled if the account is gone
        const item = entry.payload;
        const stockMovements = pushStockMovement(d.stockMovements, {
          accountId, accountName: entry.meta?.accountName || "", stockItemId: item.id, pokemonName: item.name || "",
          delta: clamp0(item.quantity), resultQty: clamp0(item.quantity), reason: "กู้คืนจากถังขยะ",
        });
        return {
          ...d,
          gameAccounts: d.gameAccounts.map(a => a.id === accountId ? { ...a, stock: [item, ...(a.stock || [])] } : a),
          trash, stockMovements,
        };
      }
      if (entry.type === "order") {
        const order = entry.payload;
        let gameAccounts = d.gameAccounts;
        let stockMovements = d.stockMovements;
        // only re-deduct stock if it's still an active sale and the stock item still exists
        if (!order.cancelled && order.type === "sell_pokemon" && order.stockItemId) {
          const acc = gameAccounts.find(a => a.id === order.sourceAccountId);
          const stockItem = acc?.stock?.find(s => s.id === order.stockItemId);
          if (stockItem) {
            const delta = -clamp0(order.quantity);
            gameAccounts = adjustStock(gameAccounts, order.sourceAccountId, order.stockItemId, delta);
            const newQty = clamp0(stockItem.quantity) + delta;
            stockMovements = pushStockMovement(stockMovements, {
              accountId: order.sourceAccountId, accountName: acc?.name || "", stockItemId: order.stockItemId,
              pokemonName: order.pokemonName || "", delta, resultQty: clamp0(newQty), reason: "กู้คืนออเดอร์จากถังขยะ (ตัดสต๊อกใหม่)", refOrderCode: order.code,
            });
          }
        }
        return { ...d, orders: [order, ...d.orders], gameAccounts, stockMovements, trash };
      }
      return d;
    });
    showToast("กู้คืนแล้ว");
  }
  // removes one item from the trash for real — cannot be undone
  function purgeTrash(trashId) {
    setData(d => ({ ...d, trash: d.trash.filter(t => t.id !== trashId) }));
    showToast("ลบถาวรแล้ว ไม่สามารถกู้คืนได้อีก");
  }
  function saveInvestment(item) {
    setData(d => ({ ...d, investmentHistory: [item, ...d.investmentHistory] }));
    showToast("บันทึกรายการลงทุนแล้ว");
  }
  function deleteInvestment(id) {
    setData(d => ({ ...d, investmentHistory: d.investmentHistory.filter(h => h.id !== id) }));
  }
  function saveManualTx(item) {
    setData(d => ({ ...d, manualTx: [item, ...d.manualTx] }));
    showToast("บันทึกรายการแล้ว");
  }
  function deleteManualTx(id) {
    setData(d => ({ ...d, manualTx: d.manualTx.filter(t => t.id !== id) }));
  }

  // ---------- export ----------
  function exportBackup() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pgs-backup-${todayStr()}.json`; a.click();
    URL.revokeObjectURL(url);
    setData(d => ({ ...d, settings: { ...d.settings, lastBackupAt: new Date().toISOString() } }));
    showToast("ดาวน์โหลด Backup แล้ว");
  }
  function restoreBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        setData(migrateData(parsed));
        showToast("กู้คืนข้อมูลสำเร็จ");
      } catch { showToast("ไฟล์ไม่ถูกต้อง"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ---------- Google Sheets + Drive sync ----------
  async function connectGoogle(clientId) {
    setGoogleSyncing(true);
    setGoogleStatus("กำลังเชื่อมต่อ Google...");
    try {
      const token = await requestAccessToken(clientId, { interactive: true });
      const profile = await fetchGoogleProfile(token);
      setGoogleStatus("กำลังสร้าง Sheet และโฟลเดอร์...");
      const spreadsheetId = await ensureSpreadsheet(token, data.settings.google.spreadsheetId, data.settings.shopName);
      const folderId = await ensureDriveFolder(token, data.settings.google.folderId, data.settings.shopName);
      setData(d => ({ ...d, settings: { ...d.settings, google: { ...d.settings.google, clientId, email: profile?.email || "", spreadsheetId, folderId } } }));
      showToast("เชื่อมต่อ Google สำเร็จ");
      await runSync(token, spreadsheetId, folderId);
    } catch (e) {
      console.error("connectGoogle failed", e);
      setGoogleStatus("");
      showToast(e?.message || "เชื่อมต่อ Google ไม่สำเร็จ");
    } finally {
      setGoogleSyncing(false);
    }
  }
  async function runSync(tokenArg, spreadsheetIdArg, folderIdArg) {
    const g = data.settings.google;
    const spreadsheetId = spreadsheetIdArg || g.spreadsheetId;
    const folderId = folderIdArg || g.folderId;
    if (!spreadsheetId || !folderId) return;
    setGoogleSyncing(true);
    try {
      const token = tokenArg || await requestAccessToken(g.clientId, { interactive: false });
      const result = await syncAll({ token, spreadsheetId, folderId, data, onStatus: setGoogleStatus });
      setData(d => ({ ...d, orders: result.orders, gameAccounts: result.gameAccounts, settings: { ...d.settings, google: { ...d.settings.google, lastSyncAt: new Date().toISOString() } } }));
      setGoogleStatus("ซิงค์ล่าสุดสำเร็จ");
    } catch (e) {
      console.error("sync failed", e);
      setGoogleStatus(e?.message || "ซิงค์ไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setGoogleSyncing(false);
    }
  }
  function disconnectGoogleAccount() {
    disconnectGoogle();
    setData(d => ({ ...d, settings: { ...d.settings, google: { clientId: d.settings.google.clientId, email: "", spreadsheetId: "", folderId: "", autoSync: true, lastSyncAt: null } } }));
    setGoogleStatus("");
    showToast("ยกเลิกการเชื่อมต่อ Google แล้ว (ข้อมูลใน Sheet เดิมยังอยู่)");
  }

  // used by LockScreen's "ลืม PIN?" -> security question flow — the data already lives in this
  // browser's localStorage, so a correct answer just needs to swap the PIN, nothing else changes.
  function resetPinByAnswer(newPin) {
    setData(d => ({ ...d, settings: { ...d.settings, pin: newPin } }));
    setUnlocked(true);
    showToast("ตั้ง PIN ใหม่แล้ว");
  }
  // used by LockScreen's "ลืม PIN?" flow — restores data from an uploaded backup
  // file and applies a freshly-chosen PIN (or removes the lock), without ever
  // touching the rest of localStorage.
  function recoverFromBackup(parsed, chosenPin) {
    const migrated = migrateData(parsed);
    migrated.settings.pin = chosenPin || "";
    setData(migrated);
    setUnlocked(true);
    showToast(chosenPin ? "กู้คืนข้อมูลและตั้ง PIN ใหม่แล้ว" : "กู้คืนข้อมูลแล้ว ปิดการล็อก PIN แล้ว");
  }
  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const ordersSheet = data.orders.map(o => ({
      รหัสออเดอร์: o.code, ลูกค้า: custName(o.customerId), ไอดีที่ใช้: o.customerGameId || "", ประเภท: ORDER_TYPES[o.type]?.label,
      Pokemon: o.pokemonName || "", ประเภทพิเศษ: (o.pokemonVariants || []).map(v => POKEMON_VARIANTS[v]?.label).filter(Boolean).join(", "),
      จำนวน: o.quantity || "", ราคา: o.price, ชำระแล้ว: o.paymentStatus === "paid" ? o.price : (o.paidAmount || 0),
      คงค้าง: orderBalance(o),
      ไอดีต้นทาง: o.sourceAccountId ? accName(o.sourceAccountId) : "", สถานะชำระ: PAYMENT_STATUS[o.paymentStatus]?.label,
      สถานะเทรด: o.tradeStatus ? TRADE_STATUS[o.tradeStatus]?.label : "",
      โหมดตี: (o.type !== "sell_pokemon") ? HIRE_MODES[o.hireMode]?.label : "",
      จำนวนรอบ: (o.rounds || []).length || "",
      สถานะออเดอร์: o.cancelled ? "ยกเลิกแล้ว" : "ปกติ",
      วันนัด: o.appointmentDate || "",
      หมายเหตุ: o.note || "", วันที่สร้าง: (o.createdAt || "").slice(0, 10),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersSheet), "Orders");
    const custSheet = data.customers.map(c => ({ ชื่อในเกม: c.name, ไอดีในเกมทั้งหมด: (c.gameIds || []).map(g => g.value).filter(Boolean).join(", "), Facebook: c.facebook || "", หมายเหตุ: c.note || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custSheet), "Customers");
    const accSheet = data.gameAccounts.map(a => ({ ชื่อไอดี: a.name, จำนวนรายการสต๊อก: (a.stock || []).length, หมายเหตุ: a.note || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(accSheet), "GameAccounts");
    const stockRows = [];
    data.gameAccounts.forEach(a => (a.stock || []).forEach(s => stockRows.push({
      ไอดี: a.name, Pokemon: s.name, ประเภทพิเศษ: (s.variants || []).map(v => POKEMON_VARIANTS[v]?.label).filter(Boolean).join(", "),
      คงเหลือ: s.quantity, แจ้งเตือนเมื่อเหลือ: s.lowStockThreshold ?? 2, ราคาต่อตัว: s.price || 0, รหัสสินค้า: s.productCode || "",
    })));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockRows), "Stock");
    const invSheet = data.investmentHistory.map(h => ({ ไอดี: accName(h.accountId), ประเภท: INVEST_TYPES[h.type]?.label, จำนวนเงิน: h.amount, วันที่: h.date, หมายเหตุ: h.note || "" }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invSheet), "InvestmentHistory");
    const manualSheet = data.manualTx.map(t => ({
      ประเภท: t.type === "income" ? "รายรับ" : "รายจ่าย", รายการ: t.category || "อื่นๆ", จำนวนเงิน: t.amount,
      วันที่: t.date, ไอดีที่เกี่ยวข้อง: t.accountId ? accName(t.accountId) : "", หมายเหตุ: t.note || "",
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(manualSheet), "ManualTransactions");
    XLSX.writeFile(wb, `pgs-export-${todayStr()}.xlsx`);
    showToast("Export Excel แล้ว");
  }
  function exportPDF() { window.print(); }

  if (!loaded) {
    return (
      <div className="pgs-root" style={{ alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div className="pgs-ball" style={{ animation: "pgs-up 1s infinite alternate" }} />
      </div>
    );
  }

  if (data.settings.pin && !unlocked) {
    return (
      <LockScreen
        pin={data.settings.pin}
        pinQuestion={data.settings.pinQuestion}
        pinAnswer={data.settings.pinAnswer}
        shopName={data.settings.shopName}
        logoDataUrl={data.settings.logoDataUrl}
        onUnlock={() => setUnlocked(true)}
        onRecover={recoverFromBackup}
        onResetPin={resetPinByAnswer}
      />
    );
  }

  // สถานะ "แนะนำ" ของสต๊อกชิ้นที่กำลังเปิดใน StockModal — เช็คจาก data.productCodes สด ๆ (ไม่ใช่ snapshot
  // ตอนเปิด modal) เพื่อให้ปุ่มอัปเดตทันทีหลังกด toggle โดยไม่ต้องปิด-เปิด modal ใหม่ อิงตาม "รหัสสินค้า"
  // ของหน่วยสต๊อกนี้ (ผูกกับชื่อ+ประเภท ไม่ใช่ตัวไอดีนี้โดยเฉพาะ — ดูคอมเมนต์ที่ toggleFeatured ใน utils.js)
  const stockModalProductCode = modal?.type === "stock" && modal.mode === "edit" && modal.item ? modal.item.productCode : null;
  const stockModalIsFeatured = stockModalProductCode
    ? (data.productCodes || []).some(p => p.code === stockModalProductCode && p.featuredOrder != null)
    : false;

  return (
    <div className="pgs-root">
      <GlobalStyle />
      <Header data={data} onMore={() => setMoreOpen(true)} />
      <div className="pgs-scroll">
        {tab === "dashboard" && (
          <Dashboard
            data={data} stats={stats} custName={custName} accName={accName} goTab={navigateTab}
            openDetail={(d) => setDetail(d)}
            onGoTrade={() => { setOrdersInitialFilter("sell_pokemon"); setTab("orders"); }}
          />
        )}
        {tab === "orders" && (
          <OrdersTab
            data={data} custName={custName} accName={accName}
            initialFilter={ordersInitialFilter}
            openNew={() => setModal({ type: "order", mode: "add" })}
            openEdit={(o) => setModal({ type: "order", mode: "edit", item: o })}
            openReceipt={(o) => setModal({ type: "receipt", item: o })}
            onQuickComplete={quickComplete} onQuickCancel={promptCancelOrder}
            onQuickTrade={quickSetTradeStatus} onQuickUse={quickUseHire} onQuickHireStatus={quickSetHireStatus}
          />
        )}
      </div>
      {moreOpen && (
        <MoreSheet
          onClose={() => setMoreOpen(false)}
          go={(t) => {
            setMoreOpen(false);
            // "ถังขยะ" ไม่ใช่แท็บ (ไม่มี tab === "trash" ใน render ด้านบน) แต่เป็น modal เดียวกับที่
            // SettingsTab เปิดผ่าน openTrash — เลยจัดการเป็นกรณีพิเศษตรงนี้แทนการ setTab
            if (t === "trash") { setModal({ type: "trash" }); return; }
            // "สินค้าแนะนำ" ก็ไม่ใช่แท็บเหมือนกัน (จัดการข้ามทุกไอดี) เลยเปิดเป็น modal แบบเดียวกับถังขยะ
            if (t === "featured") { setModal({ type: "featured" }); return; }
            navigateTab(t);
          }}
        />
      )}
      {tab === "customers" && (
        <div className="pgs-scroll" style={{ position: "fixed", inset: "60px 0 74px 0", maxWidth: 430, margin: "0 auto", background: "var(--bg)", zIndex: 40 }}>
          <CustomersTab
            data={data}
            openNew={() => setModal({ type: "customer", mode: "add" })}
            openEdit={(c) => setModal({ type: "customer", mode: "edit", item: c })}
            openDetail={(c) => setDetail({ type: "customer", item: c })}
            back={() => setTab("dashboard")}
          />
        </div>
      )}
      {tab === "accounts" && (
        <div className="pgs-scroll" style={{ position: "fixed", inset: "60px 0 74px 0", maxWidth: 430, margin: "0 auto", background: "var(--bg)", zIndex: 40 }}>
          <AccountsTab
            data={data} stats={stats}
            openNew={() => setModal({ type: "account", mode: "add" })}
            openDetail={(a) => setDetail({ type: "account", item: a })}
            onMoveAccount={moveAccount}
            openCodeSearch={() => setModal({ type: "codesearch" })}
            back={() => setTab("dashboard")}
          />
        </div>
      )}
      {tab === "finance" && (
        <div className="pgs-scroll" style={{ position: "fixed", inset: "60px 0 74px 0", maxWidth: 430, margin: "0 auto", background: "var(--bg)", zIndex: 40 }}>
          <FinanceTab data={data} stats={stats} custName={custName} accName={accName} openNew={() => setModal({ type: "tx", mode: "add" })} back={() => setTab("dashboard")} onDeleteManual={deleteManualTx} onDeleteInvestment={deleteInvestment} openDetail={(d) => setDetail(d)} />
        </div>
      )}
      {tab === "reports" && (
        <div className="pgs-scroll" style={{ position: "fixed", inset: "60px 0 74px 0", maxWidth: 430, margin: "0 auto", background: "var(--bg)", zIndex: 40 }}>
          <ReportsTab data={data} custName={custName} accName={accName} back={() => setTab("dashboard")} />
        </div>
      )}
      {tab === "settings" && (
        <div className="pgs-scroll" style={{ position: "fixed", inset: "60px 0 74px 0", maxWidth: 430, margin: "0 auto", background: "var(--bg)", zIndex: 40 }}>
          <SettingsTab
            data={data} setData={setData} onBackup={exportBackup} onRestore={restoreBackup} onExportExcel={exportExcel} onExportPDF={exportPDF}
            showToast={showToast} back={() => setTab("dashboard")}
            googleSyncing={googleSyncing} googleStatus={googleStatus}
            onConnectGoogle={connectGoogle} onSyncNow={() => runSync()} onDisconnectGoogle={disconnectGoogleAccount}
            openTrash={() => setModal({ type: "trash" })}
          />
        </div>
      )}

      <BottomNav tab={tab} setTab={navigateTab} onMore={() => setMoreOpen(true)} />

      {modal?.type === "order" && (
        <OrderModal
          data={data} mode={modal.mode} item={modal.item}
          onClose={() => setModal(null)}
          onSave={(item) => { saveOrder(item, modal.mode === "add"); setModal(null); }}
          onCancel={(id, reason) => { cancelOrder(id, reason); setModal(null); }}
          onRestore={(id) => { restoreOrder(id); setModal(null); }}
          onDelete={(id) => { deleteOrder(id); setModal(null); }}
          onReceipt={(o) => setModal({ type: "receipt", item: o })}
        />
      )}
      {modal?.type === "receipt" && (
        <ReceiptModal
          order={modal.item} data={data} custName={custName} accName={accName}
          onClose={() => setModal(null)}
          onToast={showToast}
        />
      )}
      {modal?.type === "stock" && (
        <StockModal
          mode={modal.mode} item={modal.item} data={data}
          onClose={() => setModal(null)}
          onSave={(item) => { saveStock(modal.accountId, item); setModal(null); }}
          onDelete={modal.mode === "edit" ? () => { deleteStock(modal.accountId, modal.item.id); setModal(null); } : null}
          isFeatured={stockModalIsFeatured}
          onToggleFeatured={stockModalProductCode ? () => toggleFeaturedStock(stockModalProductCode) : null}
        />
      )}
      {modal?.type === "codesearch" && (
        <CodeSearchModal
          data={data}
          onClose={() => setModal(null)}
          onOpenStock={(account, item) => setModal({ type: "stock", mode: "edit", item, accountId: account.id })}
        />
      )}
      {modal?.type === "featured" && (
        <FeaturedModal
          data={data}
          onClose={() => setModal(null)}
          onToggleFeatured={toggleFeaturedStock}
          onReorder={reorderFeatured}
        />
      )}
      {modal?.type === "customer" && (
        <CustomerModal
          mode={modal.mode} item={modal.item}
          onClose={() => setModal(null)}
          onSave={(item) => { saveCustomer(item); setModal(null); }}
        />
      )}
      {modal?.type === "account" && (
        <AccountModal
          mode={modal.mode} item={modal.item} data={data}
          onClose={() => setModal(null)}
          onSave={(item) => { saveAccount(item); setModal(null); }}
        />
      )}
      {modal?.type === "tx" && (
        <TxModal
          data={data}
          presetAccount={modal.presetAccount}
          onClose={() => setModal(null)}
          onSaveInvestment={(item) => { saveInvestment(item); setModal(null); }}
          onSaveManual={(item) => { saveManualTx(item); setModal(null); }}
        />
      )}
      {modal?.type === "trash" && (
        <TrashModal
          data={data}
          onClose={() => setModal(null)}
          onRestore={restoreFromTrash}
          onPurge={purgeTrash}
        />
      )}

      {detail?.type === "debt" && (
        <DebtModal
          data={data} custName={custName}
          onClose={() => setDetail(null)}
          onOpenCustomer={(c) => setDetail({ type: "customer", item: c })}
        />
      )}
      {showBackupPrompt && (
        <Modal title="ยังไม่ได้ Backup ข้อมูล" onClose={() => setShowBackupPrompt(false)}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
            <AlertTriangle size={22} color="var(--yellow)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
              {data.settings.lastBackupAt
                ? `ไม่ได้ Backup ข้อมูลมา ${daysBetween(data.settings.lastBackupAt, new Date().toISOString())} วันแล้ว ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้เครื่องเดียว หากล้าง cache หรือเปลี่ยนเครื่องโดยไม่ Backup ไว้ ข้อมูลจะหายถาวร`
                : "ยังไม่เคย Backup ข้อมูลเลย ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้เครื่องเดียว แนะนำให้ Backup ไว้กันข้อมูลหาย"}
            </div>
          </div>
          <button className="pgs-btn pgs-btn-primary" style={{ width: "100%", marginBottom: 8 }} onClick={() => { exportBackup(); setShowBackupPrompt(false); }}>
            <Download size={15} /> Backup ตอนนี้
          </button>
          <button className="pgs-btn pgs-btn-outline" style={{ width: "100%" }} onClick={() => setShowBackupPrompt(false)}>เตือนทีหลัง</button>
        </Modal>
      )}
      {detail?.type === "duesoon" && (
        <DueSoonModal
          items={stats.dueSoonItems} data={data} custName={custName}
          onClose={() => setDetail(null)}
          onGoTo={(orderType) => { setOrdersInitialFilter(orderType || "all"); setTab("orders"); setDetail(null); }}
        />
      )}
      {detail?.type === "customer" && (
        <CustomerDetail
          item={detail.item} data={data}
          onClose={() => setDetail(null)}
          onEdit={() => { setModal({ type: "customer", mode: "edit", item: detail.item }); setDetail(null); }}
          onDelete={() => { deleteCustomer(detail.item.id); setDetail(null); }}
        />
      )}
      {detail?.type === "account" && (
        <AccountDetail
          item={data.gameAccounts.find(a => a.id === detail.item.id) || detail.item} data={data} stats={stats}
          onClose={() => setDetail(null)}
          onEdit={() => { setModal({ type: "account", mode: "edit", item: detail.item }); setDetail(null); }}
          onDelete={() => { deleteAccount(detail.item.id); setDetail(null); }}
          onAddInvestment={() => { setModal({ type: "tx", mode: "add", presetAccount: detail.item.id }); setDetail(null); }}
          onDeleteInvestment={deleteInvestment}
          onDeleteManual={deleteManualTx}
          onAddStock={() => { setModal({ type: "stock", mode: "add", accountId: detail.item.id }); setDetail(null); }}
          onEditStock={(s) => { setModal({ type: "stock", mode: "edit", item: s, accountId: detail.item.id }); setDetail(null); }}
        />
      )}

      {toast && <div className="pgs-toast">{toast}</div>}
    </div>
  );
}
