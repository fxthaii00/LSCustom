import { loadShopData, saveShopData } from './firebase-system.js';

const PRICES_KEY = 'pawnshop-prices';
const STOCK_KEY = 'pawnshop-stock';
const STOCK_HISTORY_KEY = 'pawnshop-stock-history';

let prices = [];   // {id, name, sud, nord, illegal}
let stock = [];     // {id, priceId, qty}
let stockHistory = [];
let priceSort = 'name';
let stockSort = 'name';
let customPriceOrder = [];
let customStockOrder = [];

const PRICE_CUSTOM_KEY = 'pawnshop-custom-price-order';
const STOCK_CUSTOM_KEY = 'pawnshop-custom-stock-order';

function fmt(n){
  if(n === null || n === undefined || n === '') return '—';
  return Number(n).toLocaleString('fr-FR');
}

function escapeHtml(s){
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getPrice(id){
  return prices.find(p => p.id === id) || null;
}

function normalizePriceName(value){
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isPlaceholderPriceName(value){
  const key = normalizePriceName(value);
  return key === '' || key === 'nouvel objet';
}

function generateNextItemName(){
  const usedNumbers = new Set();

  for (const price of prices) {
    const match = String(price?.name || '').trim().match(/^item\s+(\d+)$/i);
    if (match) {
      usedNumbers.add(Number(match[1]));
    }
  }

  let next = 1;
  while (usedNumbers.has(next)) {
    next += 1;
  }

  return `Item ${next}`;
}

function getFirstCreatedPriceMatch(name, excludeId = null){
  const key = normalizePriceName(name);
  if(!key || isPlaceholderPriceName(name)) return null;

  let match = null;
  for(const p of prices){
    if(excludeId && p.id === excludeId) continue;
    if(normalizePriceName(p.name) === key){
      if(!match){
        match = p;
      } else if((Number(p.createdAt) || 0) < (Number(match.createdAt) || 0)){
        match = p;
      }
    }
  }
  return match;
}

function mergePriceDuplicate(sourceId, canonicalId){
  const source = getPrice(sourceId);
  const canonical = getPrice(canonicalId);
  if(!source || !canonical || sourceId === canonicalId) return false;

  for(const field of ['sud', 'nord', 'illegal']){
    const sourceVal = Number(source[field]) || 0;
    const canonicalVal = Number(canonical[field]) || 0;
    if(canonicalVal === 0 && sourceVal > 0){
      canonical[field] = sourceVal;
    }
  }

  if(!canonical.name || normalizePriceName(canonical.name) === ''){
    canonical.name = source.name;
  }

  for(const item of stock){
    if(item.priceId === sourceId){
      item.priceId = canonicalId;
    }
  }

  prices = prices.filter(p => p.id !== sourceId);
  customPriceOrder = customPriceOrder.filter(id => id !== sourceId);
  savePrices();
  saveStock();
  saveCustomOrder(PRICE_CUSTOM_KEY, customPriceOrder);
  renderPrices();
  renderStock();
  updateTotal();
  return true;
}

function readCustomOrder(key, fallback = []){
  try {
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveCustomOrder(key, order){
  try {
    localStorage.setItem(key, JSON.stringify(order));
  } catch (e) {
    console.warn('Impossible de sauvegarder l’ordre personnalisé', e);
  }
}

function normalizeCustomOrder(savedOrder, allIds){
  const existing = new Set(allIds);
  const ordered = (savedOrder || []).filter(id => existing.has(id));
  for(const id of allIds){
    if(!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

function ensureCustomOrders(){
  customPriceOrder = normalizeCustomOrder(readCustomOrder(PRICE_CUSTOM_KEY), prices.map(p => p.id));
  customStockOrder = normalizeCustomOrder(readCustomOrder(STOCK_CUSTOM_KEY), stock.map(s => s.id));
}

function applyCustomOrder(type, list){
  const order = type === 'price' ? customPriceOrder : customStockOrder;
  if(!order.length) return list;
  const orderMap = new Map(order.map((id, index) => [id, index]));
  return [...list].sort((a, b) => {
    const aIndex = orderMap.has(a.id) ? orderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.has(b.id) ? orderMap.get(b.id) : Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex;
  });
}

function getCurrentSessionUser(){
  try {
    const session = JSON.parse(localStorage.getItem('littleAngelSession') || 'null');
    if (!session) return 'Système';
    return session.name || session.username || 'Utilisateur';
  } catch {
    return 'Système';
  }
}

function readStockHistory(){
  try {
    const raw = localStorage.getItem(STOCK_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStockHistory(){
  try {
    localStorage.setItem(STOCK_HISTORY_KEY, JSON.stringify(stockHistory.slice(0, 200)));
  } catch (e) {
    console.warn('Impossible de sauvegarder l’historique du stock', e);
  }
}

function logStockMovement({ itemName, action, qty, before, after }){
  const log = {
    id: 'move_' + Date.now() + '_' + Math.random().toString(16).slice(2),
    itemName: itemName || 'Objet',
    action,
    qty: Number(qty) || 0,
    before: Number(before) || 0,
    after: Number(after) || 0,
    user: getCurrentSessionUser(),
    createdAt: new Date().toISOString()
  };

  stockHistory.unshift(log);
  stockHistory = stockHistory.slice(0, 200);
  saveStockHistory();
  renderHistory();
}

function moveCustomOrder(type, fromId, toId){
  const target = type === 'price' ? customPriceOrder : customStockOrder;
  const next = [...target];
  if(!next.length){
    const base = type === 'price' ? prices.map(p => p.id) : stock.map(s => s.id);
    next.push(...base);
  }
  const fromIndex = next.indexOf(fromId);
  const toIndex = next.indexOf(toId);
  if(fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  if(type === 'price'){
    customPriceOrder = next;
    saveCustomOrder(PRICE_CUSTOM_KEY, next);
  } else {
    customStockOrder = next;
    saveCustomOrder(STOCK_CUSTOM_KEY, next);
  }
}

function bestSale(p){
  if(!p) return {key:'none', label:'Prix non défini', val:0};
  const options = [
    {key:'sud', label:'Pawnshop Sud', val: Number(p.sud)||0},
    {key:'nord', label:'Pawnshop Nord', val: Number(p.nord)||0},
    {key:'illegal', label:'Revente illégale', val: Number(p.illegal)||0}
  ];
  return options.reduce((a,b) => b.val > a.val ? b : a);
}

/* ══════════ CHARGEMENT / SAUVEGARDE ══════════ */
async function persistShopSnapshot(){
  try {
    await saveShopData({
      prices,
      stock,
      stockHistory,
      customPriceOrder,
      customStockOrder
    });
    return true;
  } catch (error) {
    console.error('Erreur Firestore, fallback localStorage', error);
    try {
      localStorage.setItem(PRICES_KEY, JSON.stringify(prices));
      localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
      localStorage.setItem(STOCK_HISTORY_KEY, JSON.stringify(stockHistory));
      localStorage.setItem(PRICE_CUSTOM_KEY, JSON.stringify(customPriceOrder));
      localStorage.setItem(STOCK_CUSTOM_KEY, JSON.stringify(customStockOrder));
      return true;
    } catch (fallbackError) {
      console.error('Fallback localStorage impossible', fallbackError);
      return false;
    }
  }
}

function cleanupPlaceholderEntries(){
  prices = prices
    .filter((price) => !isPlaceholderPriceName(price?.name))
    .map((price) => ({ ...price, name: String(price?.name || '').trim() }));

  const validPriceIds = new Set(prices.map((price) => price.id));
  stock = stock.filter((entry) => validPriceIds.has(entry.priceId));
  customPriceOrder = customPriceOrder.filter((id) => validPriceIds.has(id));
  customStockOrder = customStockOrder.filter((id) => stock.some((entry) => entry.id === id));
}

function enforceStockCapacity(){
  if (!prices.length) {
    if (stock.length) {
      stock = [];
      customStockOrder = [];
      saveCustomOrder(STOCK_CUSTOM_KEY, customStockOrder);
      saveStock();
    }
    return;
  }

  if (stock.length > prices.length) {
    const kept = stock.slice(0, prices.length);
    stock = kept;
    const validIds = new Set(stock.map((entry) => entry.id));
    customStockOrder = customStockOrder.filter((id) => validIds.has(id));
    for (const id of kept.map((entry) => entry.id)) {
      if (!customStockOrder.includes(id)) customStockOrder.push(id);
    }
    saveCustomOrder(STOCK_CUSTOM_KEY, customStockOrder);
    saveStock();
  }
}

async function loadAll(){
  try {
    const firestoreData = await loadShopData();
    if (firestoreData && (firestoreData.prices.length || firestoreData.stock.length || firestoreData.stockHistory.length)) {
      prices = firestoreData.prices;
      stock = firestoreData.stock;
      stockHistory = firestoreData.stockHistory;
      customPriceOrder = firestoreData.customPriceOrder;
      customStockOrder = firestoreData.customStockOrder;
    } else {
      const savedPrices = JSON.parse(localStorage.getItem(PRICES_KEY) || 'null');
      const savedStock = JSON.parse(localStorage.getItem(STOCK_KEY) || 'null');
      const savedHistory = JSON.parse(localStorage.getItem(STOCK_HISTORY_KEY) || 'null');
      const savedCustomPriceOrder = JSON.parse(localStorage.getItem(PRICE_CUSTOM_KEY) || 'null');
      const savedCustomStockOrder = JSON.parse(localStorage.getItem(STOCK_CUSTOM_KEY) || 'null');

      prices = Array.isArray(savedPrices) ? savedPrices : [];
      stock = Array.isArray(savedStock) ? savedStock : [];
      stockHistory = Array.isArray(savedHistory) ? savedHistory : [];
      customPriceOrder = Array.isArray(savedCustomPriceOrder) ? savedCustomPriceOrder : [];
      customStockOrder = Array.isArray(savedCustomStockOrder) ? savedCustomStockOrder : [];
    }
  } catch (e) {
    console.error('Erreur chargement Firestore, lecture locale', e);
    prices = JSON.parse(localStorage.getItem(PRICES_KEY) || '[]');
    stock = JSON.parse(localStorage.getItem(STOCK_KEY) || '[]');
    stockHistory = JSON.parse(localStorage.getItem(STOCK_HISTORY_KEY) || '[]');
    customPriceOrder = JSON.parse(localStorage.getItem(PRICE_CUSTOM_KEY) || '[]');
    customStockOrder = JSON.parse(localStorage.getItem(STOCK_CUSTOM_KEY) || '[]');
  }

  cleanupPlaceholderEntries();
  enforceStockCapacity();
  ensureCustomOrders();
  renderPrices();
  renderStock();
  renderHistory();
}

async function savePrices(){
  await persistShopSnapshot();
}
async function saveStock(){
  await persistShopSnapshot();
}

/* ══════════ ONGLETS ══════════ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    updateHeaderStamp();
  });
});

function updateHeaderStamp(){
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  const stamp = document.getElementById('header-stamp');
  if(activeTab === 'stockage'){
    stamp.textContent = stock.length + (stock.length > 1 ? ' objets en stock' : ' objet en stock');
  } else if(activeTab === 'historique'){
    stamp.textContent = stockHistory.length + (stockHistory.length > 1 ? ' mouvements' : ' mouvement');
  } else {
    stamp.textContent = prices.length + (prices.length > 1 ? ' objets au catalogue' : ' objet au catalogue');
  }
}

/* ══════════ ONGLET PRIX ══════════ */
function addPrice(){
  const p = {
    id: 'price_' + Date.now(),
    name: generateNextItemName(),
    sud: 0,
    nord: 0,
    illegal: 0,
    createdAt: Date.now()
  };

  const existing = getFirstCreatedPriceMatch(p.name);
  if(existing){
    window.alert(`"${existing.name}" existe déjà. L’objet a été fusionné avec l’entrée existante.`);
    return;
  }

  prices.unshift(p);
  customPriceOrder.unshift(p.id);
  saveCustomOrder(PRICE_CUSTOM_KEY, customPriceOrder);
  savePrices();

  renderPrices();
  renderStock();
  const first = document.querySelector('#priceBody .name-input');
  if(first){ first.focus(); first.select(); }
}

function updatePriceField(id, field, value, options = {}){
  const { checkDuplicate = true, suppressRender = false } = options;
  const p = getPrice(id);
  if(!p) return;

  if(field === 'name'){
    const nextName = String(value || '').trim();
    if(!nextName){
      p.name = '';
      savePrices();
      renderStock();
      return;
    }

    if(checkDuplicate){
      const existing = getFirstCreatedPriceMatch(nextName, id);
      if(existing){
        const merged = mergePriceDuplicate(id, existing.id);
        if(merged){
          window.alert(`"${existing.name}" existe déjà. L’objet a été fusionné avec l’entrée existante.`);
        }
        return;
      }
    }

    p.name = nextName;
  } else {
    const numeric = Number(value);
    p[field] = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  }

  savePrices();
  if(field === 'name'){
    renderStock();
    return;
  }

  if(!suppressRender) {
    renderPriceRow(p);
    renderStock();
  }
}

function deletePrice(id){
  prices = prices.filter(p => p.id !== id);
  customPriceOrder = customPriceOrder.filter(itemId => itemId !== id);
  savePrices();
  saveCustomOrder(PRICE_CUSTOM_KEY, customPriceOrder);
  renderPrices();
  renderStock();
}

function sortedPrices(){
  const q = document.getElementById('priceSearch').value.trim().toLowerCase();
  let list = prices.filter(p => p.name.toLowerCase().includes(q));
  if(priceSort === 'custom'){
    return applyCustomOrder('price', list);
  }
  list.sort((a,b) => {
    if(priceSort === 'name') return a.name.localeCompare(b.name);
    if(priceSort === 'best') return bestSale(b).val - bestSale(a).val;
    return (Number(b[priceSort])||0) - (Number(a[priceSort])||0);
  });
  return list;
}

function priceRowHtml(p){
  const best = bestSale(p);
  const labelClass = best.key;
  return `
    <td>
      <div class="name-cell">
        <button type="button" class="drag-handle" data-drag-id="${p.id}" data-drag-type="price" draggable="true" aria-label="Déplacer ${escapeHtml(p.name || 'Objet sans nom')}">⋮⋮</button>
        <input class="name-input" value="${escapeHtml(p.name)}" placeholder="Nom de l'objet" data-id="${p.id}" data-field="name">
      </div>
    </td>
    <td><input class="num-input" type="number" min="0" value="${p.sud}" data-id="${p.id}" data-field="sud"></td>
    <td><input class="num-input" type="number" min="0" value="${p.nord}" data-id="${p.id}" data-field="nord"></td>
    <td><input class="num-input" type="number" min="0" value="${p.illegal}" data-id="${p.id}" data-field="illegal"></td>
    <td>
      <div class="best-cell">
        <span class="best-tag ${labelClass}">${best.label}</span>
        <span class="best-val">${fmt(best.val)} $</span>
      </div>
    </td>
    <td style="text-align:right;"><button class="del-btn" data-id="${p.id}" data-action="delete-price">✕</button></td>
  `;
}

function renderPriceRow(p){
  const tr = document.querySelector(`tr[data-price-row="${p.id}"]`);
  if(tr) tr.innerHTML = priceRowHtml(p);
}

function renderPrices(){
  const tbody = document.getElementById('priceBody');
  const list = sortedPrices();
  const empty = document.getElementById('priceEmpty');
  updateHeaderStamp();

  if(prices.length === 0){
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(p => `<tr class="reorder-row" data-price-row="${p.id}">${priceRowHtml(p)}</tr>`).join('');

  requestAnimationFrame(() => {
    tbody.querySelectorAll('tr.reorder-row').forEach((row, index) => {
      row.style.animationDelay = `${index * 20}ms`;
    });
  });
}

/* ══════════ ONGLET STOCKAGE ══════════ */
function addStock(){
  enforceStockCapacity();
  if(prices.length === 0) return;
  if(stock.length >= prices.length){
    alert('Tu as déjà atteint le nombre maximal d’objets pour les prix disponibles.');
    return;
  }

  const s = {id: 'stock_' + Date.now(), priceId: prices[0].id, qty:0};
  stock.unshift(s);
  customStockOrder.unshift(s.id);
  saveCustomOrder(STOCK_CUSTOM_KEY, customStockOrder);
  saveStock();
  logStockMovement({
    itemName: stockName(s),
    action: 'création',
    qty: 0,
    before: 0,
    after: 0
  });
  renderStock();
}

function updateStockField(id, field, value){
  const s = stock.find(i => i.id === id);
  if(!s) return;

  if(field === 'priceId') {
    const before = stockName(s);
    s.priceId = value;
    saveStock();
    renderStockRow(s);
    updateTotal();
    logStockMovement({
      itemName: stockName(s),
      action: 'objet changé',
      qty: 0,
      before: 0,
      after: Number(s.qty) || 0
    });
    return;
  }

  const beforeQty = Number(s.qty) || 0;
  const numeric = Number(value);
  const nextQty = Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
  if(beforeQty === nextQty) {
    saveStock();
    renderStockRow(s);
    updateTotal();
    return;
  }

  s.qty = nextQty;
  saveStock();
  renderStockRow(s);
  updateTotal();

  const delta = nextQty - beforeQty;
  const action = delta > 0 ? 'ajout' : 'retire';
  logStockMovement({
    itemName: stockName(s),
    action,
    qty: Math.abs(delta),
    before: beforeQty,
    after: nextQty
  });
}

function deleteStock(id){
  const item = stock.find(i => i.id === id);
  if (!item) return;
  stock = stock.filter(i => i.id !== id);
  customStockOrder = customStockOrder.filter(itemId => itemId !== id);
  saveCustomOrder(STOCK_CUSTOM_KEY, customStockOrder);
  saveStock();
  logStockMovement({
    itemName: stockName(item),
    action: 'suppression',
    qty: Number(item.qty) || 0,
    before: Number(item.qty) || 0,
    after: 0
  });
  renderStock();
}

function rowTotal(s){
  const p = getPrice(s.priceId);
  const qty = Number(s.qty) || 0;
  return qty * bestSale(p).val;
}

function stockName(s){
  const p = getPrice(s.priceId);
  return p ? p.name : '(objet supprimé)';
}

function sortedStock(){
  const q = document.getElementById('stockSearch').value.trim().toLowerCase();
  let list = stock.filter(s => stockName(s).toLowerCase().includes(q));
  if(stockSort === 'custom'){
    return applyCustomOrder('stock', list);
  }
  list.sort((a,b) => {
    if(stockSort === 'name') return stockName(a).localeCompare(stockName(b));
    if(stockSort === 'qty') return (Number(b.qty)||0) - (Number(a.qty)||0);
    if(stockSort === 'best') return bestSale(getPrice(b.priceId)).val - bestSale(getPrice(a.priceId)).val;
    if(stockSort === 'total') return rowTotal(b) - rowTotal(a);
    return 0;
  });
  return list;
}

function objectOptionsHtml(selectedId){
  return prices.map(p => `<div class="dd-option ${p.id === selectedId ? 'selected' : ''}" data-value="${p.id}">${escapeHtml(p.name)}</div>`).join('');
}

function stockRowHtml(s){
  const p = getPrice(s.priceId);
  const best = bestSale(p);
  const labelClass = best.key;
  return `
    <td>
      <div class="stock-name-cell">
        <button type="button" class="drag-handle drag-handle-inline" data-drag-id="${s.id}" data-drag-type="stock" draggable="true" aria-label="Déplacer ${escapeHtml(p ? p.name : 'objet')}">⋮⋮</button>
        <div class="dd obj-dd" id="objDD_${s.id}" data-id="${s.id}">
          <button type="button" class="dd-toggle">
            <span class="dd-label">${escapeHtml(p ? p.name : '(objet supprimé)')}</span>
            <svg viewBox="0 0 20 20"><path d="M5 7l5 5 5-5"/></svg>
          </button>
          <div class="dd-menu">
            ${objectOptionsHtml(s.priceId)}
          </div>
        </div>
      </div>
    </td>
    <td><input class="qty-input" type="number" min="0" value="${s.qty}" data-id="${s.id}" data-field="qty"></td>
    <td>
      <div class="best-cell">
        <span class="best-tag ${labelClass}">${best.label}</span>
        <span class="best-val">${fmt(best.val)} $</span>
      </div>
    </td>
    <td><span class="total-val">${fmt(rowTotal(s))} $</span></td>
    <td style="text-align:right;"><button class="del-btn" data-id="${s.id}" data-action="delete-stock">✕</button></td>
  `;
}

function renderStockRow(s){
  const tr = document.querySelector(`tr[data-stock-row="${s.id}"]`);
  if(tr) tr.innerHTML = stockRowHtml(s);
}

function updateTotal(){
  const total = stock.reduce((sum, s) => sum + rowTotal(s), 0);
  document.getElementById('totalNum').textContent = fmt(total) + '$';
  document.getElementById('totalSub').textContent =
    stock.length + (stock.length > 1 ? ' objet(s) en stock' : ' objet en stock');
}

function renderStock(){
  const tbody = document.getElementById('stockBody');
  const list = sortedStock();
  const empty = document.getElementById('stockEmpty');
  const hint = document.getElementById('stockHint');
  const addBtn = document.getElementById('addStockBtn');
  updateHeaderStamp();
  updateTotal();

  if(prices.length === 0){
    hint.style.display = 'block';
    addBtn.disabled = true;
  } else if(stock.length >= prices.length){
    hint.style.display = 'none';
    addBtn.disabled = true;
  } else {
    hint.style.display = 'none';
    addBtn.disabled = false;
  }

  if(stock.length === 0){
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  tbody.innerHTML = list.map(s => `<tr class="reorder-row" data-stock-row="${s.id}">${stockRowHtml(s)}</tr>`).join('');

  requestAnimationFrame(() => {
    tbody.querySelectorAll('tr.reorder-row').forEach((row, index) => {
      row.style.animationDelay = `${index * 20}ms`;
    });
  });
}

function renderHistory(){
  const tbody = document.getElementById('historyBody');
  const empty = document.getElementById('historyEmpty');
  if (!tbody) return;

  if (!stockHistory.length) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    updateHeaderStamp();
    return;
  }

  if (empty) empty.style.display = 'none';

  tbody.innerHTML = stockHistory.map((entry) => {
    const actionText = entry.action === 'ajout' ? 'Ajout' : entry.action === 'retire' ? 'Retrait' : entry.action === 'création' ? 'Création' : entry.action === 'suppression' ? 'Suppression' : 'Mise à jour';
    const qtyText = entry.qty > 0 ? `${entry.qty}` : '0';
    const date = new Date(entry.createdAt).toLocaleString('fr-FR');
    return `
      <tr>
        <td>${date}</td>
        <td>${escapeHtml(entry.itemName || 'Objet')}</td>
        <td>${actionText}</td>
        <td>${qtyText}</td>
        <td>${escapeHtml(entry.user || 'Système')}</td>
      </tr>
    `;
  }).join('');

  updateHeaderStamp();
}

/* ══════════ ÉVÉNEMENTS ══════════ */

/* ── Dropdowns custom (remplace <select>) ── */
function closeAllDropdowns(){
  document.querySelectorAll('.dd.open').forEach(d => d.classList.remove('open'));
}
function openDropdown(dd){
  closeAllDropdowns();
  const menu = dd.querySelector('.dd-menu');
  const toggle = dd.querySelector('.dd-toggle');
  dd.classList.add('open');

  if (menu && toggle) {
    const width = Math.max(toggle.offsetWidth, 180);
    menu.style.width = width + 'px';
    menu.style.left = '0px';
    menu.style.top = 'calc(100% + 6px)';
    menu.style.position = 'absolute';
  }
}
document.addEventListener('click', (e) => {
  if(!e.target.closest('.dd')) closeAllDropdowns();
});
window.addEventListener('scroll', closeAllDropdowns, true);
window.addEventListener('resize', closeAllDropdowns);

function wireSortDropdown(ddId, onSelect){
  const dd = document.getElementById(ddId);
  const toggle = dd.querySelector('.dd-toggle');
  const label = dd.querySelector('.dd-label');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if(dd.classList.contains('open')){ dd.classList.remove('open'); }
    else { openDropdown(dd); }
  });
  dd.querySelectorAll('.dd-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.querySelectorAll('.dd-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      label.textContent = opt.textContent;
      dd.dataset.value = opt.dataset.value;
      dd.classList.remove('open');
      onSelect(opt.dataset.value);
    });
  });
}
wireSortDropdown('stockSortDD', (v) => { stockSort = v; renderStock(); });
wireSortDropdown('priceSortDD', (v) => { priceSort = v; renderPrices(); });

document.addEventListener('dragstart', (e) => {
  const handle = e.target.closest('.drag-handle');
  if(!handle) return;
  const row = handle.closest('tr');
  if(!row) return;
  const type = handle.dataset.dragType;
  const id = handle.dataset.dragId;
  if(!type || !id) return;
  e.dataTransfer.setData('text/plain', JSON.stringify({type, id}));
  e.dataTransfer.effectAllowed = 'move';
  row.classList.add('dragging');
});

document.addEventListener('dragover', (e) => {
  const row = e.target.closest('tr[data-price-row]') || e.target.closest('tr[data-stock-row]');
  if(!row) return;
  e.preventDefault();
  document.querySelectorAll('tr[data-price-row], tr[data-stock-row]').forEach(item => {
    item.classList.toggle('drop-target', item === row);
  });
});

document.addEventListener('drop', (e) => {
  const row = e.target.closest('tr[data-price-row]') || e.target.closest('tr[data-stock-row]');
  if(!row) return;
  e.preventDefault();
  document.querySelectorAll('tr[data-price-row], tr[data-stock-row]').forEach(item => item.classList.remove('drop-target'));

  const payload = e.dataTransfer.getData('text/plain');
  if(!payload) return;

  let data;
  try { data = JSON.parse(payload); }
  catch { return; }

  const type = row.dataset.priceRow ? 'price' : 'stock';
  const fromId = data.id;
  const toId = row.dataset.priceRow || row.dataset.stockRow;
  if(!fromId || !toId || fromId === toId || data.type !== type) return;

  moveCustomOrder(type, fromId, toId);
  if(type === 'price'){
    priceSort = 'custom';
    renderPrices();
  } else {
    stockSort = 'custom';
    renderStock();
  }
});

document.addEventListener('dragend', (e) => {
  const handle = e.target.closest('.drag-handle');
  const row = handle ? handle.closest('tr') : null;
  if(row) row.classList.remove('dragging');
  document.querySelectorAll('tr[data-price-row], tr[data-stock-row]').forEach(item => item.classList.remove('drop-target'));
});

document.getElementById('addPriceBtn').addEventListener('click', addPrice);
document.getElementById('priceSearch').addEventListener('input', renderPrices);

document.getElementById('priceBody').addEventListener('input', (e) => {
  const t = e.target;
  if(!(t.dataset && t.dataset.field)) return;

  if(t.dataset.field === 'name') {
    updatePriceField(t.dataset.id, t.dataset.field, t.value, { checkDuplicate: false });
    return;
  }

  updatePriceField(t.dataset.id, t.dataset.field, t.value, { checkDuplicate: false, suppressRender: true });
});
document.getElementById('priceBody').addEventListener('change', (e) => {
  const t = e.target;
  if(t.dataset && t.dataset.field) updatePriceField(t.dataset.id, t.dataset.field, t.value, { checkDuplicate: false });
});
document.getElementById('priceBody').addEventListener('click', (e) => {
  const t = e.target;
  if(t.dataset && t.dataset.action === 'delete-price') deletePrice(t.dataset.id);
});

document.getElementById('addStockBtn').addEventListener('click', addStock);
document.getElementById('stockSearch').addEventListener('input', renderStock);

document.getElementById('stockBody').addEventListener('change', (e) => {
  const t = e.target;
  if(t.dataset && t.dataset.field) updateStockField(t.dataset.id, t.dataset.field, t.value);
});
document.getElementById('stockBody').addEventListener('click', (e) => {
  const ddToggle = e.target.closest('.dd-toggle');
  if(ddToggle){
    e.stopPropagation();
    const dd = ddToggle.closest('.dd');
    if(dd.classList.contains('open')){ dd.classList.remove('open'); }
    else { openDropdown(dd); }
    return;
  }
  const ddOption = e.target.closest('.dd-option');
  if(ddOption){
    e.stopPropagation();
    const dd = ddOption.closest('.dd');
    updateStockField(dd.dataset.id, 'priceId', ddOption.dataset.value);
    closeAllDropdowns();
    return;
  }
  const t = e.target;
  if(t.dataset && t.dataset.action === 'delete-stock') deleteStock(t.dataset.id);
});

loadAll();