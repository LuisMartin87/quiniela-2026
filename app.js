const App = (function () {

  async function init() {
    try {
      await API.initData();

      const user = API.getCurrentUser();
      if (!user) {
        window.location.href = 'login.html';
        return;
      }

      UI.renderNavbar(user);
      setupNavigation();
      setupLogout();
      UI.startCountdowns();

      showPage('dashboard');
      loadPage('dashboard');

    } catch (err) {
      console.error('Error de inicialización:', err);
      document.body.innerHTML = '<div class="error-screen"><h1>⚠️ Error</h1><p>' + err.message + '</p><button onclick="location.reload()" class="btn btn-primary">Reintentar</button></div>';
    } finally {
      var loader = document.getElementById('appLoader');
      if (loader) loader.classList.add('hidden');
    }
  }

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('page-active'));
    const page = document.getElementById(pageId + 'Page');
    if (page) page.classList.add('page-active');

    document.querySelectorAll('.nav-link[data-page]').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('.nav-link[data-page="' + pageId + '"]');
    if (link) link.classList.add('active');
  }

  function loadPage(pageId) {
    switch (pageId) {
      case 'dashboard':
        UI.renderDashboard();
        break;
      case 'matches':
        UI.renderMatches();
        break;
      case 'specials':
        UI.renderSpecials();
        bindSpecialsEvents();
        break;
      case 'leaderboard':
        UI.renderLeaderboard();
        break;
      case 'history':
        UI.renderHistory();
        break;
    }
  }

  function setupNavigation() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('.nav-link[data-page]');
      if (!link) return;
      e.preventDefault();
      const pageId = link.dataset.page;
      showPage(pageId);
      loadPage(pageId);
    });
  }

  function setupLogout() {
    document.addEventListener('click', function (e) {
      if (e.target.id === 'logoutBtn') {
        API.logout();
        window.location.href = 'login.html';
      }
    });
  }

  function bindSpecialsEvents() {
    const saveBtn = document.getElementById('saveSpecialsBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        const user = API.getCurrentUser();
        if (!user) return;
        const data = {
          champion: document.getElementById('specChampion').value.trim(),
          runnerUp: document.getElementById('specRunnerUp').value.trim(),
          thirdPlace: document.getElementById('specThirdPlace').value.trim(),
          topScorer: document.getElementById('specTopScorer').value.trim(),
          ballonDor: document.getElementById('specBallonDor').value.trim()
        };

        if (!data.champion) {
          UI.showToast('La predicción del campeón es obligatoria', 'error');
          return;
        }

        const existing = API.getUserSpecialPrediction(user.userId);
        if (existing) {
          UI.showToast('Las predicciones especiales ya están bloqueadas', 'error');
          return;
        }

        API.saveSpecialPredictions(user.userId, data);
        UI.showToast('¡Predicciones especiales enviadas!', 'success');
        UI.renderSpecials();
        bindSpecialsEvents();
      });
    }
  }

  return {
    init: init,
    showPage: showPage,
    loadPage: loadPage
  };
})();

document.addEventListener('DOMContentLoaded', function () {
  App.init();
});
