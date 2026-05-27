const Backend = (function () {
  var BASE_URL = (typeof CONFIG !== 'undefined' && CONFIG.BACKEND_URL) || '';

  var COLLECTION_MAP = {
    wc2026_users: 'users',
    wc2026_matches: 'matches',
    wc2026_results: 'results',
    wc2026_predictions: 'predictions',
    wc2026_specialPredictions: 'specialPredictions',
    wc2026_settings: 'settings',
    wc2026_players: 'players'
  };

  /* ── Format converters ──
     Frontend uses: players = [{team, players:[name, ...]}, ...]
     Sheet uses:    players = [{team, playerName}, ...]
     Frontend: settings = {appName, rounds, ...}
     Sheet:    settings = [{id:1, value:'{"appName":...}'}]
  */

  function playersToFlat(grouped) {
    var flat = [];
    grouped.forEach(function (team) {
      (team.players || []).forEach(function (name) {
        flat.push({ team: team.team, playerName: name });
      });
    });
    return flat;
  }

  function playersFromFlat(flat) {
    var map = {};
    if (!flat || !flat.length) return [];
    flat.forEach(function (row) {
      if (!row.team) return;
      if (!map[row.team]) map[row.team] = { team: row.team, players: [] };
      if (row.playerName) map[row.team].players.push(row.playerName);
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function settingsToArray(settingsObj) {
    if (!settingsObj || typeof settingsObj !== 'object') return [];
    return [{ id: 1, value: JSON.stringify(settingsObj) }];
  }

  function settingsFromArray(arr) {
    if (!arr || !arr.length) return null;
    try {
      return typeof arr[0].value === 'string' ? JSON.parse(arr[0].value) : arr[0].value;
    } catch (e) {
      return null;
    }
  }

  /* ── Core ── */

  function isEnabled() {
    return BASE_URL.length > 0;
  }

  async function fetchAll() {
    var res = await fetch(BASE_URL + '?action=getAll');
    var data = await res.json();
    if (!data || data.error) {
      throw new Error(data ? data.error : 'Backend returned no data');
    }
    if (data.settings && Array.isArray(data.settings)) {
      data.settings = settingsFromArray(data.settings);
    }
    if (data.players && Array.isArray(data.players)) {
      data.players = playersFromFlat(data.players);
    }
    var K = APP.STORAGE_KEYS;
    var map = {};
    map[K.USERS] = data.users;
    map[K.MATCHES] = data.matches;
    map[K.RESULTS] = data.results;
    map[K.PREDICTIONS] = data.predictions;
    map[K.SPECIAL_PREDICTIONS] = data.specialPredictions;
    map[K.SETTINGS] = data.settings;
    map[K.PLAYERS] = data.players;
    Object.keys(map).forEach(function (key) {
      if (map[key] !== undefined) {
        localStorage.setItem(key, JSON.stringify(map[key]));
      }
    });
    localStorage.setItem(K.INITIALIZED, 'true');
  }

  async function syncCollection(collectionName, data) {
    if (!BASE_URL) return;
    try {
      await fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'syncCollection', name: collectionName, data: data })
      });
    } catch (e) {
      console.warn('Backend sync failed for', collectionName, e);
    }
  }

  function syncKey(key) {
    var name = COLLECTION_MAP[key];
    if (!name) return;
    var raw = localStorage.getItem(key);
    var data = [];
    try { data = raw ? JSON.parse(raw) : []; } catch (e) { data = []; }
    if (name === 'players') {
      data = playersToFlat(data);
    } else if (name === 'settings') {
      data = settingsToArray(data);
    }
    syncCollection(name, data);
  }

  async function login(username, password) {
    var res = await fetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', username: username, password: password })
    });
    return await res.json();
  }

  async function registerUser(data) {
    var res = await fetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'registerUser', username: data.username, password: data.password, whatsapp: data.whatsapp })
    });
    var result = await res.json();
    if (result.success && result.user) {
      var K = APP.STORAGE_KEYS;
      var users = JSON.parse(localStorage.getItem(K.USERS) || '[]');
      users.push(result.user);
      localStorage.setItem(K.USERS, JSON.stringify(users));
    }
    return result;
  }

  async function resetVolatile() {
    if (!BASE_URL) return;
    try {
      await fetch(BASE_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'resetVolatile' })
      });
    } catch (e) {
      console.warn('Backend reset failed', e);
    }
  }

  return {
    isEnabled: isEnabled,
    fetchAll: fetchAll,
    syncCollection: syncCollection,
    syncKey: syncKey,
    login: login,
    registerUser: registerUser,
    resetVolatile: resetVolatile
  };
})();
