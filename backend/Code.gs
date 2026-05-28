/* ── Google Apps Script Backend for Quiniela Mundial 2026 ──
   Deploy as Web App → Anyone with link
   Google Sheet tabs: users, matches, results, predictions, specialPredictions, settings, players, sessions
*/

var SHEET = {
  USERS: 'users',
  MATCHES: 'matches',
  RESULTS: 'results',
  PREDICTIONS: 'predictions',
  SPECIALS: 'specialPredictions',
  SETTINGS: 'settings',
  PLAYERS: 'players',
  SESSIONS: 'sessions'
};

function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var action = body.action;

  if (action === 'login') return jsonResponse(handleLogin(body));
  if (action === 'syncCollection') return jsonResponse(syncCollection(body));
  if (action === 'registerUser') return jsonResponse(registerUser(body));
  if (action === 'resetVolatile') return jsonResponse(resetVolatile());

  return jsonResponse({ error: 'Invalid action' });
}

function debugSheet(name) {
  var sheet = getSheet(name);
  var rows = sheet.getDataRange().getValues();
  var info = {
    sheetName: sheet.getName(),
    numRows: rows.length,
    numCols: rows.length > 0 ? rows[0].length : 0
  };
  if (rows.length > 0) {
    info.headers = rows[0].map(function(h) { return String(h); });
    info.rows = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      info.rows.push({
        values: row.map(function(v) { return String(v); }),
        types: row.map(function(v) { return typeof v; })
      });
    }
  }
  return info;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── Sheet Helpers ── */

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    var all = ss.getSheets();
    for (var i = 0; i < all.length; i++) {
      if (all[i].getName().toLowerCase() === name.toLowerCase()) {
        sheet = all[i];
        break;
      }
    }
  }
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(['_created']);
  }
  return sheet;
}

function readCollection(name) {
  var sheet = getSheet(name);
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0];
  var result = [];
  for (var r = 1; r < rows.length; r++) {
    var row = rows[r];
    if (!row[0]) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = row[c];
    }
    result.push(obj);
  }
  return result;
}

function writeCollection(name, data) {
  var sheet = getSheet(name);
  sheet.clearContents();
  if (!data || !data.length) return;
  var headers = Object.keys(data[0]);
  var rows = [headers];
  data.forEach(function (item) {
    var row = [];
    headers.forEach(function (h) { row.push(item[h] !== undefined ? item[h] : ''); });
    rows.push(row);
  });
  var range = sheet.getRange(1, 1, rows.length, headers.length);
  range.setValues(rows);
}

function clearSheet(name) {
  var sheet = getSheet(name);
  sheet.clearContents();
}

/* ── Data Operations ── */

function getAllData() {
  return {
    users: readCollection(SHEET.USERS),
    matches: readCollection(SHEET.MATCHES),
    results: readCollection(SHEET.RESULTS),
    predictions: readCollection(SHEET.PREDICTIONS),
    specialPredictions: readCollection(SHEET.SPECIALS),
    settings: readCollection(SHEET.SETTINGS),
    players: readCollection(SHEET.PLAYERS)
  };
}

function syncCollection(body) {
  var name = body.name;
  var data = body.data;
  if (!name || !data) return { success: false, error: 'Missing name or data' };
  writeCollection(name, data);
  return { success: true };
}

function handleLogin(body) {
  var users = readCollection(SHEET.USERS);
  var user = null;
  var debugInfo = { totalUsers: users.length, bodyUsername: body.username, bodyPassword: body.password, checked: [] };
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var uName = String(u.username);
    var uPass = String(u.password);
    var bName = String(body.username);
    var bPass = String(body.password);
    var nameMatch = uName.trim() === bName.trim();
    var passMatch = uPass === bPass;
    debugInfo.checked.push({
      storedUsername: uName,
      storedPassword: uPass,
      nameMatch: nameMatch,
      passMatch: passMatch,
      nameTrimmed: uName.trim(),
      bodyNameTrimmed: bName.trim()
    });
    if (nameMatch && passMatch) {
      user = u;
      break;
    }
  }
  if (!user) {
    debugInfo.result = 'no_match';
    return { success: false, error: 'Usuario o contraseña inválidos', debug: debugInfo };
  }
  var isActive = user.active === true || user.active === 'TRUE' || user.active === 'true';
  if (!isActive) {
    return { success: false, error: 'Tu cuenta está inactiva. Contacta al administrador.', debug: { active: user.active } };
  }
  var token = Utilities.getUuid();
  var sessions = readCollection(SHEET.SESSIONS);
  sessions.push({ id: sessions.length + 1, userId: user.id, token: token, createdAt: new Date().toISOString() });
  writeCollection(SHEET.SESSIONS, sessions);
  return {
    success: true,
    user: {
      userId: user.id,
      username: user.username,
      admin: user.admin === true || user.admin === 'true' || user.admin === true,
      loginTime: new Date().toISOString()
    },
    token: token
  };
}

function registerUser(body) {
  var users = readCollection(SHEET.USERS);
  for (var i = 0; i < users.length; i++) {
    if (users[i].username && users[i].username.toLowerCase() === body.username.toLowerCase()) {
      return { success: false, error: 'El nombre de usuario ya existe' };
    }
  }
  if (!body.username || body.username.trim().length < 2) {
    return { success: false, error: 'El usuario debe tener al menos 2 caracteres' };
  }
  if (!body.password || body.password.length < 3) {
    return { success: false, error: 'La contraseña debe tener al menos 3 caracteres' };
  }
  if (!body.whatsapp || body.whatsapp.trim().length < 8) {
    return { success: false, error: 'Ingresa un número de WhatsApp válido' };
  }
  var maxId = users.length > 0 ? Math.max.apply(null, users.map(function (u) { return Number(u.id) || 0; })) : 0;
  var newUser = {
    id: maxId + 1,
    username: body.username.trim(),
    password: body.password,
    whatsapp: body.whatsapp.trim(),
    active: true,
    paid: false,
    admin: false
  };
  users.push(newUser);
  writeCollection(SHEET.USERS, users);
  return { success: true, user: newUser };
}

function resetVolatile() {
  clearSheet(SHEET.RESULTS);
  clearSheet(SHEET.PREDICTIONS);
  clearSheet(SHEET.SPECIALS);
  clearSheet(SHEET.SETTINGS);
  clearSheet(SHEET.SESSIONS);
  return { success: true, message: 'Datos volátiles eliminados' };
}
