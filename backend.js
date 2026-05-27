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

  function isEnabled() {
    return BASE_URL.length > 0;
  }

  /* ── Load all data from backend into localStorage ── */
  async function fetchAll() {
    var res = await fetch(BASE_URL + '?action=getAll');
    var data = await res.json();
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

  /* ── Sync a single collection to backend ── */
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

  /* ── Sync a localStorage key to backend ── */
  function syncKey(key) {
    var name = COLLECTION_MAP[key];
    if (!name) return;
    var raw = localStorage.getItem(key);
    var data = [];
    try { data = raw ? JSON.parse(raw) : []; } catch (e) { data = []; }
    syncCollection(name, data);
  }

  /* ── Login through backend ── */
  async function login(username, password) {
    var res = await fetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'login', username: username, password: password })
    });
    return await res.json();
  }

  /* ── Register user through backend ── */
  async function registerUser(data) {
    var res = await fetch(BASE_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'registerUser', username: data.username, password: data.password, whatsapp: data.whatsapp })
    });
    var result = await res.json();
    if (result.success) {
      syncKey('wc2026_users');
    }
    return result;
  }

  /* ── Reset volatile data on backend ── */
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
