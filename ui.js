const UI = (function () {

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('page-active'));
    const page = document.getElementById(pageId);
    if (page) page.classList.add('page-active');
    updateActiveNav(pageId);
  }

  function updateActiveNav(pageId) {
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('.nav-link[data-page="' + pageId + '"]');
    if (link) link.classList.add('active');
  }

  /* ── Navbar ── */

  function renderNavbar(user) {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    if (!user) {
      nav.innerHTML = '';
      return;
    }
    const isAdm = user.admin ? '<a href="admin.html" class="nav-link">Panel de Administración</a>' : '';
    nav.innerHTML = `
      <nav class="navbar">
        <div class="nav-brand">⚽ ${API.getSettings().appName || 'Quiniela WC2026'}</div>
        <button class="nav-toggle" id="navToggle">☰</button>
        <div class="nav-menu" id="navMenu">
          <a href="#" class="nav-link active" data-page="dashboard">Inicio</a>
          <a href="#" class="nav-link" data-page="matches">Partidos</a>
          <a href="#" class="nav-link" data-page="specials">Especiales</a>
          <a href="#" class="nav-link" data-page="leaderboard">Tabla</a>
          <a href="#" class="nav-link" data-page="history">Mi Historial</a>
          ${isAdm}
          <span class="nav-user">👤 ${user.username}</span>
          <button class="btn btn-sm btn-outline" id="logoutBtn">Salir</button>
        </div>
      </nav>
    `;

    document.getElementById('navToggle').addEventListener('click', function () {
      const menu = document.getElementById('navMenu');
      menu.classList.toggle('nav-menu-open');
    });
  }

  /* ── Dashboard ── */

  function renderDashboard() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;
    const user = API.getCurrentUser();
    if (!user) return;
    const fullUser = API.getUserById(user.userId);
    const settings = API.getSettings();
    const matches = API.getMatches();
    const currentRound = Helpers.getCurrentRound(matches);

    let html = '<div class="dashboard-grid">';

    html += '<div class="card"><div class="card-header">Mi Estado</div><div class="card-body">';
    html += '<p><strong>Usuario:</strong> ' + (fullUser ? fullUser.username : user.username) + '</p>';
    html += '<p><strong>Estado:</strong> ' + (fullUser && fullUser.active ? '✅ Activo' : '❌ Inactivo') + '</p>';
    html += '<p><strong>Pago:</strong> ' + (fullUser && fullUser.paid ? '✅ Pagado' : '❌ No Pagado') + '</p>';
    html += '</div></div>';

    html += '<div class="card"><div class="card-header">Ronda Actual</div><div class="card-body">';
    html += '<p><strong>' + Helpers.getRoundName(currentRound) + '</strong></p>';
    html += '<p>Estado: ' + Helpers.getStatusBadge(API.getRoundStatus(currentRound)) + '</p>';
    html += '</div></div>';

    html += '<div class="card"><div class="card-header">Pago</div><div class="card-body">';
    html += '<p>Cuota de entrada: <strong>$' + settings.paymentAmount + '</strong></p>';
    if (fullUser && !fullUser.paid) {
      html += '<p>Pagar mediante: <strong>' + settings.paymentDescription + '</strong></p>';
      if (settings.paymentQRUrl) {
        html += '<div class="qr-placeholder">';
        html += '<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' + encodeURIComponent(settings.paymentQRUrl) + '" alt="QR de Pago" class="qr-img">';
        html += '<p class="qr-hint">Escanear para pagar $' + settings.paymentAmount + '</p>';
        html += '</div>';
      }
      html += '<p class="text-warning">⏳ Esperando confirmación de pago</p>';
    } else if (fullUser && fullUser.paid) {
      html += '<p class="text-success">✅ ¡Pago confirmado!</p>';
    }
    html += '</div></div>';

    html += '</div>';
    container.innerHTML = html;
  }

  /* ── Matches ── */

  function renderMatches() {
    const container = document.getElementById('matchesContent');
    if (!container) return;
    const user = API.getCurrentUser();
    if (!user) return;
    const rounds = API.getRounds();

    let html = '<div class="round-tabs">';
    rounds.forEach(r => {
      const status = API.getRoundStatus(r);
      const isOpen = status === APP.ROUND_STATUS.OPEN;
      html += '<button class="round-tab ' + (isOpen ? 'round-tab-active' : '') + '" data-round="' + r + '">' + Helpers.getRoundName(r) + ' ' + Helpers.getStatusBadge(status) + '</button>';
    });
    html += '</div>';

    html += '<div id="roundContent"></div>';
    container.innerHTML = html;

    const firstOpen = rounds.find(r => API.getRoundStatus(r) === APP.ROUND_STATUS.OPEN) || rounds[0];
    renderRoundMatches(firstOpen);

    container.querySelectorAll('.round-tab').forEach(tab => {
      tab.addEventListener('click', function () {
        container.querySelectorAll('.round-tab').forEach(t => t.classList.remove('round-tab-active'));
        this.classList.add('round-tab-active');
        renderRoundMatches(parseInt(this.dataset.round));
      });
    });
  }

  function renderRoundMatches(round) {
    const container = document.getElementById('roundContent');
    if (!container) return;
    const user = API.getCurrentUser();
    if (!user) return;
    const fullUser = API.getUserById(user.userId);
    const matches = API.getMatchesByRound(round);
    const status = API.getRoundStatus(round);
    const canPredict = (status === APP.ROUND_STATUS.OPEN) && fullUser && fullUser.active && fullUser.paid;
    const settings = API.getSettings();

    let html = '<h3>' + Helpers.getRoundName(round) + ' - ' + Helpers.getStatusBadge(status) + '</h3>';

    if (status === APP.ROUND_STATUS.OPEN) {
      const ms = Helpers.msUntilLock(API.getMatches(), settings, round);
      html += '<p class="countdown" data-round="' + round + '">⏰ Bloquea en: ' + Helpers.formatCountdown(ms) + '</p>';
    }

    if (matches.length === 0) {
      html += '<div class="empty-state">Sin partidos en esta ronda</div>';
      container.innerHTML = html;
      return;
    }

    html += '<div class="matches-grid">';
    matches.forEach(match => {
      const result = API.getResultByMatchId(match.id);
      const prediction = API.getPrediction(user.userId, match.id);
      const isFinished = match.status === APP.MATCH_STATUS.FINISHED;

      html += '<div class="match-card card">';
      html += '<div class="match-header">';
      html += '<span>' + Helpers.formatDateTime(match.dateISO) + '</span>';
      html += Helpers.getStatusBadge(match.status);
      html += '</div>';
      html += '<div class="match-teams">';
      html += '<div class="team home-team">' + match.homeTeam + '</div>';
      html += '<div class="score-display">';
      if (isFinished && result) {
        html += '<span class="result-score">' + result.homeScore + ' - ' + result.awayScore + '</span>';
      } else if (isFinished && !result) {
        html += '<span class="result-score">? - ?</span>';
      } else {
        html += '<span class="vs">VS</span>';
      }
      html += '</div>';
      html += '<div class="team away-team">' + match.awayTeam + '</div>';
      html += '</div>';

      if (canPredict && !isFinished) {
        html += '<div class="prediction-form" data-match-id="' + match.id + '">';
        html += '<div class="input-group">';
        html += '<input type="number" class="input score-input home-score" min="0" max="20" placeholder="L" value="' + (prediction ? prediction.homeScore : '') + '">';
        html += '<span class="input-sep">:</span>';
        html += '<input type="number" class="input score-input away-score" min="0" max="20" placeholder="V" value="' + (prediction ? prediction.awayScore : '') + '">';
        html += '<button class="btn btn-sm btn-primary save-prediction">Guardar</button>';
        html += '</div>';
        html += '</div>';
      } else if (prediction && !isFinished) {
        html += '<div class="prediction-display">Tu predicción: <strong>' + prediction.homeScore + ' - ' + prediction.awayScore + '</strong></div>';
      } else if (isFinished && prediction && result) {
        const pts = Helpers.calculateMatchPoints(prediction, result);
        html += '<div class="prediction-result">';
        html += '<span>Tu elección: ' + prediction.homeScore + ' - ' + prediction.awayScore + '</span>';
        html += '<span class="points-badge">' + pts + ' pts</span>';
        html += '</div>';
      } else if (isFinished && !prediction) {
        html += '<div class="prediction-result text-muted">Sin predicción enviada</div>';
      }

      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;

    if (canPredict) {
      container.querySelectorAll('.save-prediction').forEach(btn => {
        btn.addEventListener('click', function () {
          const form = this.closest('.prediction-form');
          const matchId = parseInt(form.dataset.matchId);
          const homeScore = parseInt(form.querySelector('.home-score').value);
          const awayScore = parseInt(form.querySelector('.away-score').value);

          if (isNaN(homeScore) || isNaN(awayScore)) {
            showToast('Ingresa ambos marcadores', 'error');
            return;
          }
          if (homeScore < 0 || awayScore < 0) {
            showToast('Los marcadores no pueden ser negativos', 'error');
            return;
          }

          API.savePrediction(user.userId, matchId, homeScore, awayScore);
          showToast('¡Predicción guardada!', 'success');
          renderRoundMatches(round);
        });
      });
    }
  }

  /* ── Special Predictions ── */

  function renderSpecials() {
    const container = document.getElementById('specialsContent');
    if (!container) return;
    const user = API.getCurrentUser();
    if (!user) return;
    const fullUser = API.getUserById(user.userId);
    const settings = API.getSettings();
    const existing = API.getUserSpecialPrediction(user.userId);
    const officialSpecials = settings.officialSpecials;
    const tournamentStart = new Date(settings.tournamentStartDate).getTime();
    const lockTime = tournamentStart - APP.LOCK_MINUTES_BEFORE * 60 * 1000;
    const isLocked = existing !== null || Date.now() >= lockTime;
    const canSubmit = !isLocked && fullUser && fullUser.active && fullUser.paid;
    const hasOfficialResults = officialSpecials && (officialSpecials.champion || officialSpecials.runnerUp || officialSpecials.thirdPlace || officialSpecials.topScorer || officialSpecials.ballonDor);

    let html = '<h3>Predicciones Especiales del Torneo</h3>';
    html += '<p class="text-muted">Predice los resultados del torneo. ' + (isLocked ? '🔒 Predicciones bloqueadas.' : '🔓 Predicciones abiertas.') + '</p>';

    if (hasOfficialResults && existing) {
      const comparison = Helpers.getSpecialComparison(existing, officialSpecials);
      const totalPoints = comparison.reduce((sum, c) => sum + c.points, 0);
      html += '<div class="card"><div class="card-header">📊 Comparación: Tu Predicción vs Resultado Oficial — Puntos: <strong>' + totalPoints + '</strong></div><div class="card-body">';
      html += '<div class="table-responsive"><table class="table"><thead><tr>';
      html += '<th>Categoría</th><th>Tu Predicción</th><th>Resultado Oficial</th><th>Puntos</th>';
      html += '</tr></thead><tbody>';
      comparison.forEach(c => {
        const icon = c.isCorrect ? '✅' : '❌';
        html += '<tr>';
        html += '<td>' + c.icon + ' ' + c.label + '</td>';
        html += '<td>' + (c.userValue || '-') + '</td>';
        html += '<td>' + (c.hasOfficial ? c.officialValue : '<span class="text-muted">Pendiente</span>') + '</td>';
        html += '<td><strong>' + (c.hasOfficial ? icon + ' ' + c.points : '-') + '</strong></td>';
        html += '</tr>';
      });
      html += '</tbody></table></div></div></div>';
    } else if (hasOfficialResults && !existing) {
      html += '<div class="card"><div class="card-header">📊 Resultados Oficiales del Torneo</div><div class="card-body">';
      html += '<div class="special-display"><label>🏆 Campeón:</label><span class="special-value">' + (officialSpecials.champion || '-') + '</span></div>';
      html += '<div class="special-display"><label>🥈 Subcampeón:</label><span class="special-value">' + (officialSpecials.runnerUp || '-') + '</span></div>';
      html += '<div class="special-display"><label>🥉 Tercer Lugar:</label><span class="special-value">' + (officialSpecials.thirdPlace || '-') + '</span></div>';
      html += '<div class="special-display"><label>⚽ Goleador:</label><span class="special-value">' + (officialSpecials.topScorer || '-') + '</span></div>';
      html += '<div class="special-display"><label>🌟 Balón de Oro:</label><span class="special-value">' + (officialSpecials.ballonDor || '-') + '</span></div>';
      html += '</div></div>';
    }

    const teams = Helpers.getValidTeams();
    const teamOptions = teams.map(t => '<option value="' + t + '">').join('');
    const allPlayers = API.getAllPlayerNames();
    const playerOptions = allPlayers.map(p => '<option value="' + p + '">').join('');

    if (isLocked && existing) {
      if (!hasOfficialResults) {
        html += '<div class="card"><div class="card-header">Tus Predicciones Especiales (Bloqueadas) 🔒</div><div class="card-body">';
        html += '<div class="special-display"><label>🏆 Campeón:</label><span class="special-value">' + (existing.champion || '-') + '</span></div>';
        html += '<div class="special-display"><label>🥈 Subcampeón:</label><span class="special-value">' + (existing.runnerUp || '-') + '</span></div>';
        html += '<div class="special-display"><label>🥉 Tercer Lugar:</label><span class="special-value">' + (existing.thirdPlace || '-') + '</span></div>';
        html += '<div class="special-display"><label>⚽ Goleador:</label><span class="special-value">' + (existing.topScorer || '-') + '</span></div>';
        html += '<div class="special-display"><label>🌟 Balón de Oro:</label><span class="special-value">' + (existing.ballonDor || '-') + '</span></div>';
        html += '</div></div>';
      }
    } else if (canSubmit) {
      html += '<div class="card"><div class="card-header">Tus Predicciones Especiales</div><div class="card-body">';
      html += '<div class="special-form">';
      html += '<div class="form-group"><label>🏆 Campeón</label><input type="text" class="input" id="specChampion" list="teamList" value="' + (existing ? existing.champion : '') + '" placeholder="ej. Brasil"><datalist id="teamList">' + teamOptions + '</datalist></div>';
      html += '<div class="form-group"><label>🥈 Subcampeón</label><input type="text" class="input" id="specRunnerUp" list="teamList" value="' + (existing ? existing.runnerUp : '') + '" placeholder="ej. Argentina"></div>';
      html += '<div class="form-group"><label>🥉 Tercer Lugar</label><input type="text" class="input" id="specThirdPlace" list="teamList" value="' + (existing ? existing.thirdPlace : '') + '" placeholder="ej. Francia"></div>';
      html += '<div class="form-group"><label>⚽ Goleador</label><input type="text" class="input" id="specTopScorer" list="playerList" value="' + (existing ? existing.topScorer : '') + '" placeholder="ej. Mbappé"></div>';
      html += '<div class="form-group"><label>🌟 Balón de Oro</label><input type="text" class="input" id="specBallonDor" list="playerList" value="' + (existing ? existing.ballonDor : '') + '" placeholder="ej. Vinicius Jr"></div>';
      html += '<datalist id="playerList">' + playerOptions + '</datalist>';
      html += '<div id="specValidationErrors" class="auth-error"></div>';
      html += '<button class="btn btn-primary" id="saveSpecialsBtn">Enviar Predicciones Especiales</button>';
      html += '<p class="text-warning">⚠️ Después del envío, no se pueden cambiar las predicciones especiales.</p>';
      html += '</div></div></div>';
    } else {
      html += '<div class="card"><div class="card-body">';
      if (!fullUser || !fullUser.active) html += '<p class="text-warning">❌ Tu cuenta está inactiva.</p>';
      if (!fullUser || !fullUser.paid) html += '<p class="text-warning">❌ Pago requerido para enviar predicciones.</p>';
      if (Date.now() >= lockTime && !existing) html += '<p class="text-warning">🔒 El torneo ha comenzado. No hay más predicciones especiales.</p>';
      html += '</div></div>';
    }

    html += '<div class="card"><div class="card-header">Puntuación</div><div class="card-body">';
    html += '<ul class="scoring-list">';
    html += '<li>🏆 Campeón: <strong>+' + APP.SCORES.SPECIAL_CHAMPION + ' pts</strong></li>';
    html += '<li>🥈 Subcampeón: <strong>+' + APP.SCORES.SPECIAL_RUNNER_UP + ' pts</strong></li>';
    html += '<li>🥉 Tercer Lugar: <strong>+' + APP.SCORES.SPECIAL_THIRD_PLACE + ' pts</strong></li>';
    html += '<li>⚽ Goleador: <strong>+' + APP.SCORES.SPECIAL_TOP_SCORER + ' pts</strong></li>';
    html += '<li>🌟 Balón de Oro: <strong>+' + APP.SCORES.SPECIAL_BALLON_DOR + ' pts</strong></li>';
    html += '</ul></div></div>';

    container.innerHTML = html;

    if (canSubmit) {
      document.getElementById('saveSpecialsBtn').addEventListener('click', function () {
        const champion = document.getElementById('specChampion').value.trim();
        const runnerUp = document.getElementById('specRunnerUp').value.trim();
        const thirdPlace = document.getElementById('specThirdPlace').value.trim();
        const topScorer = document.getElementById('specTopScorer').value.trim();
        const ballonDor = document.getElementById('specBallonDor').value.trim();
        const errors = [];

        if (!champion) errors.push('Campeón es requerido');
        if (!runnerUp) errors.push('Subcampeón es requerido');
        if (!thirdPlace) errors.push('Tercer Lugar es requerido');

        var teamFields = [
          { name: 'Campeón', id: 'specChampion' },
          { name: 'Subcampeón', id: 'specRunnerUp' },
          { name: 'Tercer Lugar', id: 'specThirdPlace' }
        ];

        teamFields.forEach(function (f) {
          var el = document.getElementById(f.id);
          var val = el.value.trim();
          if (val && !Helpers.isValidTeam(val)) {
            errors.push('"' + val + '" no es un equipo válido para ' + f.name + '. Selecciona de la lista.');
          } else if (val) {
            var corrected = Helpers.findTeamName(val);
            if (corrected) el.value = corrected;
          }
        });

        if (champion && runnerUp && champion.toLowerCase() === runnerUp.toLowerCase()) {
          errors.push('Campeón y Subcampeón no pueden ser el mismo equipo');
        }
        if (champion && thirdPlace && champion.toLowerCase() === thirdPlace.toLowerCase()) {
          errors.push('Campeón y Tercer Lugar no pueden ser el mismo equipo');
        }
        if (runnerUp && thirdPlace && runnerUp.toLowerCase() === thirdPlace.toLowerCase()) {
          errors.push('Subcampeón y Tercer Lugar no pueden ser el mismo equipo');
        }

        var playerFields = [
          { name: 'Goleador', id: 'specTopScorer' },
          { name: 'Balón de Oro', id: 'specBallonDor' }
        ];

        playerFields.forEach(function (f) {
          var el = document.getElementById(f.id);
          var val = el.value.trim();
          if (val && val.length >= 2 && !API.isValidPlayer(val)) {
            errors.push('"' + val + '" no es un jugador válido para ' + f.name + '. Selecciona de la lista de jugadores del torneo.');
          } else if (val) {
            var corrected = API.findPlayerName(val);
            if (corrected) el.value = corrected;
          }
        });

        const errorEl = document.getElementById('specValidationErrors');
        if (errors.length > 0) {
          errorEl.style.color = 'var(--danger)';
          errorEl.innerHTML = errors.join('<br>');
          return;
        }

        errorEl.textContent = '';

        const result = API.saveSpecialPredictions(user.userId, {
          champion: document.getElementById('specChampion').value.trim(),
          runnerUp: document.getElementById('specRunnerUp').value.trim(),
          thirdPlace: document.getElementById('specThirdPlace').value.trim(),
          topScorer: topScorer,
          ballonDor: ballonDor
        });

        if (result.success) {
          UI.showToast('¡Predicciones especiales guardadas!', 'success');
          renderSpecials();
        } else {
          UI.showToast(result.error, 'error');
        }
      });
    }
  }

  /* ── Leaderboard ── */

  function renderLeaderboard() {
    const container = document.getElementById('leaderboardContent');
    if (!container) return;
    const leaderboard = API.calculateLeaderboard();

    let html = '<h3>🏆 Tabla General</h3>';

    if (leaderboard.length === 0) {
      html += '<div class="empty-state">Sin usuarios aún</div>';
      container.innerHTML = html;
      return;
    }

    html += '<div class="table-responsive"><table class="table"><thead><tr>';
    html += '<th>#</th><th>Usuario</th><th>Pts Partidos</th><th>Pts Especiales</th><th>Total</th><th>Pago</th>';
    html += '</tr></thead><tbody>';

    leaderboard.forEach(entry => {
      const medal = entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : '';
      const payStatus = entry.paid ? '✅' : '❌';
      html += '<tr>';
      html += '<td>' + medal + ' ' + entry.position + '</td>';
      html += '<td><strong>' + entry.username + '</strong></td>';
      html += '<td>' + entry.matchPoints + '</td>';
      html += '<td>' + entry.specialPoints + '</td>';
      html += '<td><strong>' + entry.totalPoints + '</strong></td>';
      html += '<td>' + payStatus + '</td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  /* ── User History ── */

  function renderHistory() {
    const container = document.getElementById('historyContent');
    if (!container) return;
    const user = API.getCurrentUser();
    if (!user) return;
    const predictions = API.getUserPredictions(user.userId);
    const results = API.getResults();

    const hasActivity = predictions.length > 0 || results.length > 0;

    let html = '<h3>📋 Mi Historial de Predicciones</h3>';

    if (!hasActivity) {
      html += '<div class="empty-state">No tienes predicciones aún. ¡Ve a la sección Partidos para comenzar!</div>';
      container.innerHTML = html;
      return;
    }

    const history = API.getUserHistory(user.userId);

    history.forEach(round => {
      if (round.matches.length === 0) return;
      const hasRoundActivity = round.matches.some(m => m.prediction !== null || m.result !== null);
      if (!hasRoundActivity) return;

      html += '<div class="card"><div class="card-header">' + round.roundName + ' — Total: <strong>' + round.roundTotal + ' pts</strong></div><div class="card-body">';
      html += '<div class="table-responsive"><table class="table"><thead><tr>';
      html += '<th>Partido</th><th>Resultado</th><th>Tu Predicción</th><th>Pts</th><th>Motivo</th>';
      html += '</tr></thead><tbody>';

      round.matches.forEach(m => {
        if (m.prediction === null && m.result === null) return;
        html += '<tr>';
        html += '<td>' + m.match.homeTeam + ' vs ' + m.match.awayTeam + '</td>';
        html += '<td>' + Helpers.getResultText(m.result) + '</td>';
        html += '<td>' + Helpers.getPredictionText(m.prediction) + '</td>';
        html += '<td><strong>' + m.points + '</strong></td>';
        html += '<td class="reason-cell">' + m.reason + '</td>';
        html += '</tr>';
      });

      html += '</tbody></table></div></div></div>';
    });

    container.innerHTML = html;
  }

  /* ── Toast Notifications ── */

  function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.classList.add('toast-fade');
      setTimeout(function () { toast.remove(); }, 300);
    }, 3000);
  }

  /* ── Modal ── */

  function showModal(title, contentHtml) {
    const overlay = document.getElementById('modalOverlay');
    const body = document.getElementById('modalBody');
    const titleEl = document.getElementById('modalTitle');
    if (!overlay || !body || !titleEl) return;
    titleEl.textContent = title;
    body.innerHTML = contentHtml;
    overlay.classList.add('modal-open');
  }

  function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('modal-open');
  }

  /* ── Loading ── */

  function showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Cargando...</p></div>';
  }

  /* ── Countdown Timer ── */

  function startCountdowns() {
    setInterval(function () {
      document.querySelectorAll('.countdown').forEach(el => {
        const round = parseInt(el.dataset.round);
        const settings = API.getSettings();
        const matches = API.getMatches();
        const ms = Helpers.msUntilLock(matches, settings, round);
        el.textContent = '⏰ Bloquea en: ' + Helpers.formatCountdown(ms);
        if (ms <= 0) {
          el.textContent = '🔒 Bloqueado';
        }
      });
    }, 1000);
  }

  return {
    showPage: showPage,
    renderNavbar: renderNavbar,
    renderDashboard: renderDashboard,
    renderMatches: renderMatches,
    renderSpecials: renderSpecials,
    renderLeaderboard: renderLeaderboard,
    renderHistory: renderHistory,
    showToast: showToast,
    showModal: showModal,
    closeModal: closeModal,
    showLoading: showLoading,
    startCountdowns: startCountdowns
  };
})();
