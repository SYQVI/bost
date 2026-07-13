const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOKENS_1M_FILE = path.join(DATA_DIR, 'tokens_1m.txt');
const TOKENS_3M_FILE = path.join(DATA_DIR, 'tokens_3m.txt');
const USED_FILE = path.join(DATA_DIR, 'used.txt');
const PROXIES_FILE = path.join(DATA_DIR, 'proxies.txt');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function getTokenFile(type) {
  return type === '3m' ? TOKENS_3M_FILE : TOKENS_1M_FILE;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const file of [TOKENS_1M_FILE, TOKENS_3M_FILE, USED_FILE, PROXIES_FILE]) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '');
  }
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');
}

function readLines(file) {
  ensureDataDir();
  const content = fs.readFileSync(file, 'utf-8').trim();
  return content ? content.split('\n').map(l => l.trim()).filter(Boolean) : [];
}

function getTokens(type) {
  return readLines(getTokenFile(type));
}

function getTokenCount(type) {
  return getTokens(type).length;
}

function takeTokens(amount, type) {
  const tokens = getTokens(type);
  if (tokens.length < amount) return null;
  const taken = tokens.splice(0, amount);
  fs.writeFileSync(getTokenFile(type), tokens.join('\n'));
  return taken;
}

function addTokens(newTokens, type) {
  ensureDataDir();
  const existing = getTokens(type);
  const unique = newTokens.filter(t => !existing.includes(t));
  const all = [...existing, ...unique];
  fs.writeFileSync(getTokenFile(type), all.join('\n'));
  return unique.length;
}

function markUsed(tokens) {
  ensureDataDir();
  const existing = fs.readFileSync(USED_FILE, 'utf-8').trim();
  const timestamp = new Date().toISOString();
  const entries = tokens.map(t => `${t} | ${timestamp}`);
  const newContent = existing ? existing + '\n' + entries.join('\n') : entries.join('\n');
  fs.writeFileSync(USED_FILE, newContent);
}

function getProxies() {
  return readLines(PROXIES_FILE);
}

function getOrders() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf-8'));
}

function saveOrders(orders) {
  ensureDataDir();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

function createOrder(data) {
  const orders = getOrders();
  const order = {
    id: crypto.randomBytes(4).toString('hex').toUpperCase(),
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
    tokens: []
  };
  orders.push(order);
  saveOrders(orders);
  return order;
}

function updateOrder(id, updates) {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...updates };
  saveOrders(orders);
  return orders[index];
}

function getOrder(id) {
  return getOrders().find(o => o.id === id) || null;
}

module.exports = {
  ensureDataDir, getTokens, getTokenCount, takeTokens,
  addTokens, markUsed, getProxies, getOrders, createOrder,
  updateOrder, getOrder
};
