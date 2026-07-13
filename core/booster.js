const { ProxyAgent, Agent, fetch } = require('undici');

const API = 'https://discord.com/api/v9';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay() {
  return Math.floor(Math.random() * 7000) + 3000;
}

function getDispatcher(proxy) {
  if (!proxy) return new Agent();
  const uri = proxy.startsWith('http') ? proxy : `http://${proxy}`;
  return new ProxyAgent(uri);
}

async function resolveInvite(inviteInput) {
  const code = inviteInput.replace(/.*discord\.gg\/|.*discord\.com\/invite\//g, '');
  try {
    const res = await fetch(`${API}/invites/${code}?with_counts=true`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function joinGuild(token, inviteCode, dispatcher) {
  const code = inviteCode.replace(/.*discord\.gg\/|.*discord\.com\/invite\//g, '');
  const res = await fetch(`${API}/invites/${code}`, {
    method: 'POST',
    dispatcher,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function getBoostSlots(token, dispatcher) {
  const res = await fetch(`${API}/users/@me/guilds/premium/subscription-slots`, {
    dispatcher,
    headers: { 'Authorization': token }
  });
  if (!res.ok) return [];
  return await res.json();
}

async function boostGuild(token, guildId, slotId, dispatcher) {
  const res = await fetch(`${API}/guilds/${guildId}/premium/subscription-slots/${slotId}`, {
    method: 'PUT',
    dispatcher,
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  });
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => null) };
}

async function unboostGuild(token, guildId, slotId, dispatcher) {
  const res = await fetch(`${API}/guilds/${guildId}/premium/subscription-slots/${slotId}`, {
    method: 'DELETE',
    dispatcher,
    headers: { 'Authorization': token }
  });
  return { ok: res.ok, status: res.status };
}

async function processBoost(token, invite, guildId, proxy) {
  const dispatcher = getDispatcher(proxy);
  const result = { token: token.slice(0, 25) + '***', success: false, slots: 0, error: null };

  try {
    await joinGuild(token, invite, dispatcher);

    const slots = await getBoostSlots(token, dispatcher);
    const available = slots.filter(s => !s.premium_guild_subscription && !s.cooldown_ends_at);

    if (available.length === 0) {
      result.error = 'No available boost slots';
      return result;
    }

    const boostPromises = available.map(slot => boostGuild(token, guildId, slot.id, dispatcher));
    const boostResults = await Promise.all(boostPromises);
    
    const boosted = boostResults.filter(res => res.ok).length;

    result.success = boosted > 0;
    result.slots = boosted;
  } catch (err) {
    result.error = err.message;
  }

  return result;
}

async function processUnboost(token, guildId, proxy) {
  const dispatcher = getDispatcher(proxy);
  const result = { token: token.slice(0, 25) + '***', success: false, slots: 0, error: null };

  try {
    const slots = await getBoostSlots(token, dispatcher);
    const active = slots.filter(s =>
      s.premium_guild_subscription &&
      s.premium_guild_subscription.guild_id === guildId
    );

    if (active.length === 0) {
      result.error = 'No active boosts found';
      return result;
    }

    const unboostPromises = active.map(slot => unboostGuild(token, guildId, slot.id, dispatcher));
    const unboostResults = await Promise.all(unboostPromises);
    
    const removed = unboostResults.filter(res => res.ok).length;

    result.success = removed > 0;
    result.slots = removed;
  } catch (err) {
    result.error = err.message;
  }

  return result;
}

module.exports = { resolveInvite, processBoost, processUnboost, sleep, randomDelay };
