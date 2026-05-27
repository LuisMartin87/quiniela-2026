# Setup: Google Sheets + Apps Script Backend

## Paso 1: Crear Google Sheet

1. Ve a https://sheets.new
2. Crea estas pestañas (nombres exactos):
   - `users`
   - `matches`
   - `results`
   - `predictions`
   - `specialPredictions`
   - `settings`
   - `players`
   - `sessions`
3. Pobla cada pestaña con los datos iniciales (puedes copiar de los archivos `data/*.json`):
   - **users**: columnas `id, username, password, name, whatsapp, active, paid, admin`
   - **matches**: columnas `id, round, dateISO, homeTeam, awayTeam, status`
   - **players**: columnas `team, playerName` (un jugador por fila)
   - **settings**: columnas `key, value` (una fila por configuración)

## Paso 2: Crear Apps Script

1. En el Sheet: Extensiones → Apps Script
2. Copia el contenido de `backend/Code.gs` y pégalo en el editor
3. Guarda el proyecto (Ctrl+S) → nómbralo `Quiniela Backend`
4. Haz clic en **Deploy** → **New deployment**
   - Tipo: **Web app**
   - Execute as: **Me** (tu correo)
   - Who has access: **Anyone**
5. Haz clic en **Deploy**
6. **Copia la URL** que aparece (ej: `https://script.google.com/macros/s/ABC123/exec`)

## Paso 3: Configurar la App

1. Abre `config.js`
2. Pega la URL:
   ```js
   const CONFIG = {
     BACKEND_URL: 'https://script.google.com/macros/s/ABC123/exec'
   };
   ```

## Paso 4: Subir a GitHub Pages

```bash
git add -A
git commit -m "Add Apps Script backend integration"
git push
```

La app buscará automáticamente el backend al cargar. Si la URL está vacía, funciona en modo localStorage (standalone).

## Cómo funciona

| Operación | Sin backend (localStorage) | Con backend (Google Sheets) |
|-----------|---------------------------|----------------------------|
| Lectura de datos | Desde archivos JSON locales | Desde Google Sheet vía API |
| Login | Valida contra localStorage | Valida contra Google Sheet |
| Registro | Guarda en localStorage | Crea en Google Sheet |
| Predicciones | localStorage | localStorage + sincroniza a Google Sheet |
| Resultados | localStorage | localStorage + sincroniza a Google Sheet |
| Reset | Solo localStorage | localStorage + Google Sheet |

Los datos se guardan SIEMPRE en localStorage primero (para que la app sea rápida), y luego se sincronizan al Google Sheet en segundo plano.
