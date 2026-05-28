const API = (function () {
  const K = APP.STORAGE_KEYS;
  var backendMode = typeof Backend !== 'undefined' && Backend.isEnabled();

  function getItem(key) {
    const raw = localStorage.getItem(key);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function setItem(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    if (backendMode) {
      Backend.syncKey(key);
    }
  }

  /* ── Initialization ── */

  async function initData() {
    if (backendMode) {
      try {
        await Backend.fetchAll();
        return;
      } catch (e) {
        console.warn('Backend not available, falling back to localStorage', e);
        backendMode = false;
      }
    }
    var alreadyInit = localStorage.getItem(K.INITIALIZED);
    if (alreadyInit) {
      if (!getPlayers() || getPlayers().length === 0) {
        try {
          var players = await fetch(APP.JSON_FILES.PLAYERS).then(function (r) { return r.json(); });
          setItem(K.PLAYERS, players);
        } catch (_) {}
      }
      return;
    }
    try {
      const [users, matches, results, predictions, specials, settings, players] = await Promise.all([
        fetch(APP.JSON_FILES.USERS).then(r => r.json()),
        fetch(APP.JSON_FILES.MATCHES).then(r => r.json()),
        fetch(APP.JSON_FILES.RESULTS).then(r => r.json()),
        fetch(APP.JSON_FILES.PREDICTIONS).then(r => r.json()),
        fetch(APP.JSON_FILES.SPECIAL_PREDICTIONS).then(r => r.json()),
        fetch(APP.JSON_FILES.SETTINGS).then(r => r.json()),
        fetch(APP.JSON_FILES.PLAYERS).then(r => r.json()).catch(function () { return []; })
      ]);

      setItem(K.USERS, users);
      setItem(K.MATCHES, matches);
      setItem(K.RESULTS, results);
      setItem(K.PREDICTIONS, predictions);
      setItem(K.SPECIAL_PREDICTIONS, specials);
      setItem(K.SETTINGS, settings);
      setItem(K.PLAYERS, players);
      localStorage.setItem(K.INITIALIZED, 'true');
    } catch (err) {
      console.error('Error al inicializar datos desde archivos JSON:', err);
      throw new Error('Error al cargar datos iniciales. Verifica que los archivos JSON existan.');
    }
  }

  function isInitialized() {
    return localStorage.getItem(K.INITIALIZED) === 'true';
  }

  /* ── Session ── */

  async function login(username, password) {
    if (backendMode) {
      var result = await Backend.login(username, password);
      if (result.success && result.user) {
        sessionStorage.setItem(K.SESSION, JSON.stringify(result.user));
        if (result.token) {
          localStorage.setItem(K.SESSION + '_token', result.token);
        }
      }
      return result;
    }
    const users = getItem(K.USERS) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
      return { success: false, error: 'Usuario o contraseña inválidos' };
    }
    if (!user.active) {
      return { success: false, error: 'Tu cuenta está inactiva. Contacta a un administrador.' };
    }
    const session = { userId: user.id, username: user.username, admin: user.admin, loginTime: new Date().toISOString() };
    sessionStorage.setItem(K.SESSION, JSON.stringify(session));
    return { success: true, user: session };
  }

  function logout() {
    sessionStorage.removeItem(K.SESSION);
  }

  function getCurrentUser() {
    const raw = sessionStorage.getItem(K.SESSION);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.admin === true;
  }

  /* ── Users ── */

  function getUsers() {
    return getItem(K.USERS) || [];
  }

  function getUserById(id) {
    const users = getUsers();
    return users.find(u => u.id == id) || null;
  }

  function getUserByUsername(username) {
    const users = getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  async function registerUser(data) {
    if (backendMode) {
      return await Backend.registerUser(data);
    }
    const users = getUsers();

    if (getUserByUsername(data.username)) {
      return { success: false, error: 'El nombre de usuario ya existe' };
    }
    if (!data.username || data.username.trim().length < 2) {
      return { success: false, error: 'El usuario debe tener al menos 2 caracteres' };
    }
    if (!data.password || data.password.length < APP.MIN_PASSWORD_LENGTH) {
      return { success: false, error: 'La contraseña debe tener al menos ' + APP.MIN_PASSWORD_LENGTH + ' caracteres' };
    }
    if (!data.whatsapp || data.whatsapp.trim().length < 8) {
      return { success: false, error: 'Ingresa un número de WhatsApp válido' };
    }

    const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
    const newUser = {
      id: maxId + 1,
      username: data.username.trim(),
      password: data.password,
      whatsapp: data.whatsapp.trim(),
      active: true,
      paid: false,
      admin: false
    };
    users.push(newUser);
    setItem(K.USERS, users);
    return { success: true, user: newUser };
  }

  function updateUserStatus(userId, updates) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1)       return { success: false, error: 'Usuario no encontrado' };
    if (updates.active !== undefined) users[idx].active = updates.active;
    if (updates.paid !== undefined) users[idx].paid = updates.paid;
    setItem(K.USERS, users);
    return { success: true };
  }

  function deleteUser(userId) {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return { success: false, error: 'Usuario no encontrado' };
    if (users[idx].admin) return { success: false, error: 'No puedes eliminar un administrador' };
    users.splice(idx, 1);
    setItem(K.USERS, users);
    return { success: true };
  }

  function createUser(data) {
    const users = getUsers();
    if (getUserByUsername(data.username)) {
      return { success: false, error: 'El nombre de usuario ya existe' };
    }
    const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
    const newUser = {
      id: maxId + 1,
      username: data.username.trim(),
      password: data.password || '1234',
      whatsapp: data.whatsapp || '',
      active: data.active !== undefined ? data.active : true,
      paid: data.paid !== undefined ? data.paid : false,
      admin: data.admin || false
    };
    users.push(newUser);
    setItem(K.USERS, users);
    return { success: true, user: newUser };
  }

  /* ── Matches ── */

  function getMatches() {
    return getItem(K.MATCHES) || [];
  }

  function getMatchById(id) {
    const matches = getMatches();
    return matches.find(m => m.id === id) || null;
  }

  function getMatchesByRound(round) {
    const matches = getMatches();
    return matches.filter(m => m.round === round).sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  }

  function getRounds() {
    const matches = getMatches();
    const rounds = [...new Set(matches.map(m => m.round))];
    return rounds.sort((a, b) => a - b);
  }

  function createMatch(data) {
    const matches = getMatches();
    const maxId = matches.length > 0 ? Math.max(...matches.map(m => m.id)) : 0;
    const newMatch = {
      id: maxId + 1,
      round: data.round,
      dateISO: data.dateISO,
      homeTeam: data.homeTeam.trim(),
      awayTeam: data.awayTeam.trim(),
      status: data.status || APP.MATCH_STATUS.PENDING
    };
    matches.push(newMatch);
    setItem(K.MATCHES, matches);
    return { success: true, match: newMatch };
  }

  function updateMatch(data) {
    const matches = getMatches();
    const idx = matches.findIndex(m => m.id === data.id);
    if (idx === -1)       return { success: false, error: 'Partido no encontrado' };
    if (data.round !== undefined) matches[idx].round = data.round;
    if (data.dateISO !== undefined) matches[idx].dateISO = data.dateISO;
    if (data.homeTeam !== undefined) matches[idx].homeTeam = data.homeTeam.trim();
    if (data.awayTeam !== undefined) matches[idx].awayTeam = data.awayTeam.trim();
    if (data.status !== undefined) matches[idx].status = data.status;
    setItem(K.MATCHES, matches);
    return { success: true };
  }

  /* ── Results ── */

  function getResults() {
    return getItem(K.RESULTS) || [];
  }

  function getResultByMatchId(matchId) {
    const results = getResults();
    return results.find(r => r.matchId === matchId) || null;
  }

  function saveResult(matchId, homeScore, awayScore) {
    const results = getResults();
    const idx = results.findIndex(r => r.matchId === matchId);
    const result = { matchId: matchId, homeScore: homeScore, awayScore: awayScore };
    if (idx === -1) {
      results.push(result);
    } else {
      results[idx] = result;
    }
    setItem(K.RESULTS, results);

    updateMatch({ id: matchId, status: APP.MATCH_STATUS.FINISHED });
    return { success: true };
  }

  function clearResult(matchId) {
    let results = getResults();
    results = results.filter(r => r.matchId !== matchId);
    setItem(K.RESULTS, results);
    updateMatch({ id: matchId, status: APP.MATCH_STATUS.PENDING });
    return { success: true };
  }

  /* ── Predictions ── */

  function getPredictions() {
    return getItem(K.PREDICTIONS) || [];
  }

  function getPrediction(userId, matchId) {
    const predictions = getPredictions();
    return predictions.find(p => p.userId === userId && p.matchId === matchId) || null;
  }

  function getUserPredictions(userId) {
    const predictions = getPredictions();
    return predictions.filter(p => p.userId === userId);
  }

  function savePrediction(userId, matchId, homeScore, awayScore) {
    const predictions = getPredictions();
    const idx = predictions.findIndex(p => p.userId === userId && p.matchId === matchId);

    const prediction = {
      userId: userId,
      matchId: matchId,
      homeScore: homeScore,
      awayScore: awayScore,
      updatedAt: new Date().toISOString()
    };

    if (idx === -1) {
      predictions.push(prediction);
    } else {
      predictions[idx] = prediction;
    }
    setItem(K.PREDICTIONS, predictions);
    return { success: true };
  }

  /* ── Special Predictions ── */

  function getSpecialPredictions() {
    return getItem(K.SPECIAL_PREDICTIONS) || [];
  }

  function getUserSpecialPrediction(userId) {
    const specials = getSpecialPredictions();
    return specials.find(s => s.userId === userId) || null;
  }

  function saveSpecialPredictions(userId, data) {
    const specials = getSpecialPredictions();
    const idx = specials.findIndex(s => s.userId === userId);

    const entry = {
      userId: userId,
      champion: data.champion || '',
      runnerUp: data.runnerUp || '',
      thirdPlace: data.thirdPlace || '',
      topScorer: data.topScorer || '',
      ballonDor: data.ballonDor || '',
      updatedAt: new Date().toISOString()
    };

    if (idx === -1) {
      specials.push(entry);
    } else {
      specials[idx] = entry;
    }
    setItem(K.SPECIAL_PREDICTIONS, specials);
    return { success: true };
  }

  /* ── Settings ── */

  function getSettings() {
    const settings = getItem(K.SETTINGS);
    if (!settings) {
      return {
        paymentQRUrl: '',
        paymentAmount: 50,
        paymentCurrency: 'USD',
        paymentDescription: 'Entry Fee',
        appName: 'FIFA World Cup 2026 Pool',
        tournamentStartDate: '2026-06-10T18:00:00',
        rounds: {}
      };
    }
    return settings;
  }

  function saveSettings(settings) {
    setItem(K.SETTINGS, settings);
    return { success: true };
  }

  /* ── Round Management ── */

  function getRoundStatus(round) {
    const settings = getSettings();
    const roundSettings = settings.rounds[round];
    if (!roundSettings) return APP.ROUND_STATUS.CLOSED;

    const matches = getMatchesByRound(round);
    if (matches.length === 0) return APP.ROUND_STATUS.CLOSED;

    if (roundSettings.status === APP.ROUND_STATUS.OPEN) {
      const now = Date.now();
      const firstMatch = matches.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO))[0];
      const lockTime = new Date(firstMatch.dateISO).getTime() - APP.LOCK_MINUTES_BEFORE * 60 * 1000;
      if (now >= lockTime) {
        setRoundStatus(round, APP.ROUND_STATUS.LOCKED);
        return APP.ROUND_STATUS.LOCKED;
      }
      return APP.ROUND_STATUS.OPEN;
    }

    if (roundSettings.status === APP.ROUND_STATUS.CLOSED && round > 1) {
      const prevRound = round - 1;
      const prevMatches = getMatchesByRound(prevRound);
      if (prevMatches.length > 0) {
        const lastPrevMatch = prevMatches.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))[0];
        const endTime = new Date(lastPrevMatch.dateISO).getTime() + 100 * 60 * 1000;
        if (Date.now() >= endTime) {
          setRoundStatus(round, APP.ROUND_STATUS.OPEN);
          return APP.ROUND_STATUS.OPEN;
        }
      }
    }

    return roundSettings.status;
  }

  function setRoundStatus(round, status) {
    const settings = getSettings();
    if (!settings.rounds) settings.rounds = {};
    if (!settings.rounds[round]) settings.rounds[round] = {};
    settings.rounds[round].status = status;
    setItem(K.SETTINGS, settings);
  }

  function openRound(round) {
    setRoundStatus(round, APP.ROUND_STATUS.OPEN);
    return { success: true };
  }

  function closeRound(round) {
    setRoundStatus(round, APP.ROUND_STATUS.CLOSED);
    return { success: true };
  }

  /* ── Scoring & Leaderboard ── */

  function calculateUserMatchPoints(userId) {
    const predictions = getUserPredictions(userId);
    const results = getResults();
    let total = 0;
    const details = [];

    predictions.forEach(p => {
      const result = results.find(r => r.matchId === p.matchId);
      if (result) {
        const points = Helpers.calculateMatchPoints(p, result);
        total += points;
        details.push({
          matchId: p.matchId,
          prediction: { homeScore: p.homeScore, awayScore: p.awayScore },
          result: { homeScore: result.homeScore, awayScore: result.awayScore },
          points: points,
          reason: Helpers.getReason(p, result)
        });
      }
    });

    return { total: total, details: details };
  }

  function calculateUserSpecialPoints(userId) {
    const special = getUserSpecialPrediction(userId);
    if (!special) return 0;

    const settings = getSettings();
    const officialSpecials = settings.officialSpecials;
    if (!officialSpecials) return 0;

    return Helpers.calculateSpecialPoints(special, officialSpecials);
  }

  function calculateUserTotalPoints(userId) {
    const matchPoints = calculateUserMatchPoints(userId);
    const specialPoints = calculateUserSpecialPoints(userId);
    return matchPoints.total + specialPoints;
  }

  function calculateLeaderboard() {
    const users = getUsers();
    const activeUsers = users.filter(u => u.active);
    const leaderboard = activeUsers.map(u => {
      const matchPoints = calculateUserMatchPoints(u.id);
      const specialPoints = calculateUserSpecialPoints(u.id);
      return {
        userId: u.id,
        username: u.username,
        matchPoints: matchPoints.total,
        specialPoints: specialPoints,
        totalPoints: matchPoints.total + specialPoints,
        paid: u.paid
      };
    });

    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    leaderboard.forEach((entry, index) => {
      entry.position = index + 1;
    });

    return leaderboard;
  }

  function getUserHistory(userId) {
    const matches = getMatches();
    const results = getResults();
    const predictions = getUserPredictions(userId);
    const rounds = getRounds();

    return rounds.map(round => {
      const roundMatches = matches.filter(m => m.round === round);
      const matchDetails = roundMatches.map(match => {
        const result = results.find(r => r.matchId === match.id) || null;
        const prediction = predictions.find(p => p.matchId === match.id) || null;
        let points = 0;
        let reason = '';

        if (prediction && result) {
          points = Helpers.calculateMatchPoints(prediction, result);
          reason = Helpers.getReason(prediction, result);
        } else if (!prediction) {
          reason = 'No prediction';
        } else {
          reason = 'Result pending';
        }

        return {
          match: match,
          prediction: prediction,
          result: result,
          points: points,
          reason: reason
        };
      });

      return {
        round: round,
        roundName: Helpers.getRoundName(round),
        matches: matchDetails,
        roundTotal: matchDetails.reduce((sum, m) => sum + m.points, 0)
      };
    });
  }

  function getMatchHistory(userId) {
    const matches = getMatches();
    const results = getResults();
    const predictions = getUserPredictions(userId);

    return matches.map(match => {
      const result = results.find(r => r.matchId === match.id) || null;
      const prediction = predictions.find(p => p.matchId === match.id) || null;
      let points = 0;
      let reason = '';

      if (prediction && result) {
        points = Helpers.calculateMatchPoints(prediction, result);
        reason = Helpers.getReason(prediction, result);
      } else if (!prediction) {
        reason = 'No prediction';
      } else {
        reason = 'Result pending';
      }

      return {
        match: match,
        prediction: prediction,
        result: result,
        points: points,
        reason: reason
      };
    });
  }

  /* ── Official Specials (Admin) ── */

  function saveOfficialSpecials(data) {
    const settings = getSettings();
    settings.officialSpecials = {
      champion: data.champion || '',
      runnerUp: data.runnerUp || '',
      thirdPlace: data.thirdPlace || '',
      topScorer: data.topScorer || '',
      ballonDor: data.ballonDor || ''
    };
    setItem(K.SETTINGS, settings);
    return { success: true };
  }

  /* ── Players ── */

  function getPlayers() {
    return getItem(K.PLAYERS) || [];
  }

  function getAllPlayerNames() {
    const players = getPlayers();
    const names = [];
    players.forEach(function (team) {
      (team.players || []).forEach(function (name) {
        if (names.indexOf(name) === -1) names.push(name);
      });
    });
    return names;
  }

  function isValidPlayer(name) {
    if (!name || name.trim().length < 2) return false;
    const normalized = name.trim().toLowerCase();
    const allNames = getAllPlayerNames();
    return allNames.some(function (n) { return n.toLowerCase() === normalized; });
  }

  function findPlayerName(input) {
    if (!input || input.trim().length < 2) return null;
    const normalized = input.trim().toLowerCase();
    const allNames = getAllPlayerNames();
    var match = null;
    allNames.forEach(function (n) {
      if (n.toLowerCase() === normalized) match = n;
    });
    return match;
  }

  function getPlayersByTeam(teamName) {
    const players = getPlayers();
    var match = null;
    players.forEach(function (team) {
      if (team.team.toLowerCase() === teamName.toLowerCase()) match = team;
    });
    return match || null;
  }

  function getPlayerTeams() {
    const players = getPlayers();
    return players.map(function (t) { return t.team; });
  }

  /* ── Reset ── */

  async function resetAll() {
    var volatileKeys = [K.RESULTS, K.PREDICTIONS, K.SPECIAL_PREDICTIONS];
    volatileKeys.forEach(function (key) { localStorage.removeItem(key); });
    localStorage.removeItem(K.SESSION);
    localStorage.removeItem(K.SESSION + '_token');

    var users = getUsers();
    var adminUsers = users.filter(function (u) { return u.admin === true || u.admin === 'true'; });
    setItem(K.USERS, adminUsers);

    var settings = getSettings();
    settings.officialSpecials = {};
    setItem(K.SETTINGS, settings);

    if (backendMode) {
      await Backend.syncCollection('results', []);
      await Backend.syncCollection('predictions', []);
      await Backend.syncCollection('specialPredictions', []);
      await Backend.syncCollection('sessions', []);
    }

    return { success: true, message: 'App reiniciada. Solo admins conservados. Partidos, jugadores y rondas intactos.' };
  }

  return {
    initData: initData,
    isInitialized: isInitialized,
    login: login,
    logout: logout,
    getCurrentUser: getCurrentUser,
    isLoggedIn: isLoggedIn,
    isAdmin: isAdmin,
    getUsers: getUsers,
    getUserById: getUserById,
    getUserByUsername: getUserByUsername,
    registerUser: registerUser,
    updateUserStatus: updateUserStatus,
    deleteUser: deleteUser,
    createUser: createUser,
    getMatches: getMatches,
    getMatchById: getMatchById,
    getMatchesByRound: getMatchesByRound,
    getRounds: getRounds,
    createMatch: createMatch,
    updateMatch: updateMatch,
    getResults: getResults,
    getResultByMatchId: getResultByMatchId,
    saveResult: saveResult,
    clearResult: clearResult,
    getPredictions: getPredictions,
    getPrediction: getPrediction,
    getUserPredictions: getUserPredictions,
    savePrediction: savePrediction,
    getSpecialPredictions: getSpecialPredictions,
    getUserSpecialPrediction: getUserSpecialPrediction,
    saveSpecialPredictions: saveSpecialPredictions,
    getSettings: getSettings,
    saveSettings: saveSettings,
    getRoundStatus: getRoundStatus,
    setRoundStatus: setRoundStatus,
    openRound: openRound,
    closeRound: closeRound,
    calculateUserMatchPoints: calculateUserMatchPoints,
    calculateUserSpecialPoints: calculateUserSpecialPoints,
    calculateUserTotalPoints: calculateUserTotalPoints,
    calculateLeaderboard: calculateLeaderboard,
    getUserHistory: getUserHistory,
    getMatchHistory: getMatchHistory,
    saveOfficialSpecials: saveOfficialSpecials,
    getPlayers: getPlayers,
    getAllPlayerNames: getAllPlayerNames,
    isValidPlayer: isValidPlayer,
    findPlayerName: findPlayerName,
    getPlayersByTeam: getPlayersByTeam,
    getPlayerTeams: getPlayerTeams,
    resetAll: resetAll
  };
})();
