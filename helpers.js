const Helpers = (function () {

  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTime(isoString) {
    if (!isoString) return '';
    return formatDate(isoString) + ' ' + formatTime(isoString);
  }

  function getRoundName(round) {
    return APP.ROUND_NAMES[round] || 'Ronda ' + round;
  }

  function getRoundNumber(name) {
    for (const [key, value] of Object.entries(APP.ROUND_NAMES)) {
      if (value === name) return parseInt(key);
    }
    return null;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function isPastDate(isoString) {
    return new Date(isoString) < new Date();
  }

  function isLocked(round, settings) {
    const roundSettings = settings.rounds[round];
    if (!roundSettings) return false;
    return roundSettings.status === APP.ROUND_STATUS.LOCKED;
  }

  function isRoundClosed(round, settings) {
    const roundSettings = settings.rounds[round];
    if (!roundSettings) return false;
    return roundSettings.status === APP.ROUND_STATUS.CLOSED;
  }

  function isRoundOpen(round, settings) {
    const roundSettings = settings.rounds[round];
    if (!roundSettings) return false;
    return roundSettings.status === APP.ROUND_STATUS.OPEN;
  }

  function getCurrentRound(matches) {
    const now = new Date();
    const upcoming = matches
      .filter(m => new Date(m.dateISO) > now)
      .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));

    if (upcoming.length === 0) {
      const lastMatch = matches.sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))[0];
      return lastMatch ? lastMatch.round : 1;
    }

    return upcoming[0].round;
  }

  function getNextMatchTime(matches) {
    const now = new Date();
    const upcoming = matches
      .filter(m => new Date(m.dateISO) > now)
      .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));

    if (upcoming.length === 0) return null;
    return upcoming[0].dateISO;
  }

  function msUntilLock(matches, settings, round) {
    const roundMatches = matches.filter(m => m.round === round);
    if (roundMatches.length === 0) return 0;

    const firstMatch = roundMatches.sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO))[0];
    const lockTime = new Date(firstMatch.dateISO).getTime() - APP.LOCK_MINUTES_BEFORE * 60 * 1000;
    const now = Date.now();
    return Math.max(0, lockTime - now);
  }

  function formatCountdown(ms) {
    if (ms <= 0) return 'Bloqueado';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return days + 'd ' + hours + 'h ' + minutes + 'm';
    if (hours > 0) return hours + 'h ' + minutes + 'm ' + seconds + 's';
    if (minutes > 0) return minutes + 'm ' + seconds + 's';
    return seconds + 's';
  }

  function getStatusBadge(status) {
    const map = {
      pending: '<span class="badge badge-pending">Pendiente</span>',
      live: '<span class="badge badge-live">EN VIVO</span>',
      finished: '<span class="badge badge-finished">Finalizado</span>',
      open: '<span class="badge badge-open">Abierto</span>',
      closed: '<span class="badge badge-closed">Cerrado</span>',
      locked: '<span class="badge badge-locked">Bloqueado</span>'
    };
    return map[status] || '<span class="badge">' + status + '</span>';
  }

  function getResultText(result) {
    if (!result) return '? - ?';
    return result.homeScore + ' - ' + result.awayScore;
  }

  function getPredictionText(prediction) {
    if (!prediction) return 'Sin predicción';
    return prediction.homeScore + ' - ' + prediction.awayScore;
  }

  function calculateMatchPoints(prediction, result) {
    if (!prediction || !result) return 0;

    const pHome = prediction.homeScore;
    const pAway = prediction.awayScore;
    const rHome = result.homeScore;
    const rAway = result.awayScore;

    if (pHome === rHome && pAway === rAway) {
      return APP.SCORES.EXACT_SCORE;
    }

    const pDiff = pHome - pAway;
    const rDiff = rHome - rAway;

    if ((pDiff > 0 && rDiff > 0) || (pDiff < 0 && rDiff < 0) || (pDiff === 0 && rDiff === 0)) {
      return APP.SCORES.CORRECT_WINNER;
    }

    return APP.SCORES.INCORRECT;
  }

  function calculateSpecialPoints(specialPrediction, officialSpecials) {
    if (!specialPrediction || !officialSpecials) return 0;
    let points = 0;

    if (specialPrediction.champion && specialPrediction.champion === officialSpecials.champion) {
      points += APP.SCORES.SPECIAL_CHAMPION;
    }
    if (specialPrediction.runnerUp && specialPrediction.runnerUp === officialSpecials.runnerUp) {
      points += APP.SCORES.SPECIAL_RUNNER_UP;
    }
    if (specialPrediction.thirdPlace && specialPrediction.thirdPlace === officialSpecials.thirdPlace) {
      points += APP.SCORES.SPECIAL_THIRD_PLACE;
    }
    if (specialPrediction.topScorer && specialPrediction.topScorer === officialSpecials.topScorer) {
      points += APP.SCORES.SPECIAL_TOP_SCORER;
    }
    if (specialPrediction.ballonDor && specialPrediction.ballonDor === officialSpecials.ballonDor) {
      points += APP.SCORES.SPECIAL_BALLON_DOR;
    }

    return points;
  }

  function getReason(prediction, result) {
    if (!prediction) return 'Sin predicción enviada';
    if (!result) return 'Resultado no disponible aún';

    const pHome = prediction.homeScore;
    const pAway = prediction.awayScore;
    const rHome = result.homeScore;
    const rAway = result.awayScore;

    if (pHome === rHome && pAway === rAway) {
      return '¡Marcador exacto! +' + APP.SCORES.EXACT_SCORE + ' pts';
    }

    const pDiff = pHome - pAway;
    const rDiff = rHome - rAway;

    if ((pDiff > 0 && rDiff > 0) || (pDiff < 0 && rDiff < 0)) {
      return 'Ganador correcto +' + APP.SCORES.CORRECT_WINNER + ' pt';
    }
    if (pDiff === 0 && rDiff === 0) {
      return 'Empate correcto +' + APP.SCORES.CORRECT_WINNER + ' pt';
    }

    return 'Predicción incorrecta +0 pts';
  }

  function getTopRounds() {
    return Object.keys(APP.ROUND_NAMES).map(Number).sort((a, b) => a - b);
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function getValidTeams() {
    return APP.WORLD_CUP_TEAMS;
  }

  function isValidTeam(name) {
    if (!name || name.trim().length === 0) return false;
    const normalized = name.trim().toLowerCase();
    return APP.WORLD_CUP_TEAMS.some(t => t.toLowerCase() === normalized);
  }

  function findTeamName(input) {
    if (!input || input.trim().length === 0) return null;
    const normalized = input.trim().toLowerCase();
    const match = APP.WORLD_CUP_TEAMS.find(t => t.toLowerCase() === normalized);
    return match || null;
  }

  function getSuggestedPlayers() {
    return APP.SUGGESTED_PLAYERS;
  }

  function isValidPlayer(name) {
    if (!name || name.trim().length < 3) return false;
    const normalized = name.trim().toLowerCase();
    return APP.SUGGESTED_PLAYERS.some(p => p.toLowerCase() === normalized);
  }

  function findPlayerName(input) {
    if (!input || input.trim().length < 3) return null;
    const normalized = input.trim().toLowerCase();
    const match = APP.SUGGESTED_PLAYERS.find(p => p.toLowerCase() === normalized);
    return match || null;
  }

  function getSpecialComparison(userPrediction, officialSpecials) {
    if (!officialSpecials) return [];
    const categories = [
      { key: 'champion', label: 'Campeón', icon: '🏆' },
      { key: 'runnerUp', label: 'Subcampeón', icon: '🥈' },
      { key: 'thirdPlace', label: 'Tercer Lugar', icon: '🥉' },
      { key: 'topScorer', label: 'Goleador', icon: '⚽' },
      { key: 'ballonDor', label: 'Balón de Oro', icon: '🌟' }
    ];

    const pointsMap = {
      champion: APP.SCORES.SPECIAL_CHAMPION,
      runnerUp: APP.SCORES.SPECIAL_RUNNER_UP,
      thirdPlace: APP.SCORES.SPECIAL_THIRD_PLACE,
      topScorer: APP.SCORES.SPECIAL_TOP_SCORER,
      ballonDor: APP.SCORES.SPECIAL_BALLON_DOR
    };

    return categories.map(cat => {
      const userVal = userPrediction ? userPrediction[cat.key] || '' : '';
      const officialVal = officialSpecials[cat.key] || '';
      const isCorrect = userVal.toLowerCase() === officialVal.toLowerCase() && userVal !== '';
      const points = isCorrect ? pointsMap[cat.key] : 0;
      return {
        key: cat.key,
        label: cat.label,
        icon: cat.icon,
        userValue: userVal,
        officialValue: officialVal,
        isCorrect: isCorrect,
        points: points,
        hasOfficial: officialVal !== ''
      };
    });
  }

  return {
    formatDate: formatDate,
    formatTime: formatTime,
    formatDateTime: formatDateTime,
    getRoundName: getRoundName,
    getRoundNumber: getRoundNumber,
    nowISO: nowISO,
    isPastDate: isPastDate,
    isLocked: isLocked,
    isRoundClosed: isRoundClosed,
    isRoundOpen: isRoundOpen,
    getCurrentRound: getCurrentRound,
    getNextMatchTime: getNextMatchTime,
    msUntilLock: msUntilLock,
    formatCountdown: formatCountdown,
    getStatusBadge: getStatusBadge,
    getResultText: getResultText,
    getPredictionText: getPredictionText,
    calculateMatchPoints: calculateMatchPoints,
    calculateSpecialPoints: calculateSpecialPoints,
    getReason: getReason,
    getTopRounds: getTopRounds,
    debounce: debounce,
    getValidTeams: getValidTeams,
    isValidTeam: isValidTeam,
    findTeamName: findTeamName,
    getSuggestedPlayers: getSuggestedPlayers,
    isValidPlayer: isValidPlayer,
    findPlayerName: findPlayerName,
    getSpecialComparison: getSpecialComparison
  };
})();
