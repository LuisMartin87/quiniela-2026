const APP = {
  STORAGE_KEYS: {
    USERS: 'wc2026_users',
    MATCHES: 'wc2026_matches',
    RESULTS: 'wc2026_results',
    PREDICTIONS: 'wc2026_predictions',
    SPECIAL_PREDICTIONS: 'wc2026_specialPredictions',
    SETTINGS: 'wc2026_settings',
    SESSION: 'wc2026_session',
    INITIALIZED: 'wc2026_initialized',
    PLAYERS: 'wc2026_players'
  },
  ROUND_NAMES: {
    1: 'Jornada 1',
    2: 'Jornada 2',
    3: 'Jornada 3',
    4: '16avos de Final',
    5: 'Octavos de Final',
    6: 'Cuartos de Final',
    7: 'Semifinales',
    8: 'Final'
  },
  SCORES: {
    EXACT_SCORE: 3,
    CORRECT_WINNER: 1,
    INCORRECT: 0,
    SPECIAL_CHAMPION: 10,
    SPECIAL_RUNNER_UP: 5,
    SPECIAL_THIRD_PLACE: 3,
    SPECIAL_TOP_SCORER: 5,
    SPECIAL_BALLON_DOR: 5
  },
  MATCH_STATUS: {
    PENDING: 'pending',
    LIVE: 'live',
    FINISHED: 'finished'
  },
  ROUND_STATUS: {
    OPEN: 'open',
    CLOSED: 'closed',
    LOCKED: 'locked'
  },
  LOCK_MINUTES_BEFORE: 10,
  OPEN_MINUTES_AFTER: 10,
  MIN_PASSWORD_LENGTH: 3,
  WORLD_CUP_TEAMS: [
    "Mexico","South Africa","Korea Republic","Czechia","Canada",
    "Bosnia and Herzegovina","USA","Paraguay","Qatar","Switzerland",
    "Brazil","Morocco","Haiti","Scotland","Australia","Turkiye",
    "Germany","Curacao","Netherlands","Japan","Ivory Coast","Ecuador",
    "Sweden","Tunisia","Spain","Cape Verde","Belgium","Egypt",
    "Saudi Arabia","Uruguay","Iran","New Zealand","France","Senegal",
    "Iraq","Norway","Argentina","Algeria","Austria","Jordan",
    "Portugal","Colombia","England","Croatia","Ghana","Panama",
    "Uzbekistan","DR Congo"
  ],
  SUGGESTED_PLAYERS: [
    "Kylian Mbappé","Vinicius Jr","Rodrygo","Endrick","Raphinha",
    "Jude Bellingham","Harry Kane","Bukayo Saka","Phil Foden","Cole Palmer",
    "Lamine Yamal","Pedri","Gavi","Nico Williams","Álvaro Morata",
    "Julián Álvarez","Lautaro Martínez","Alejandro Garnacho","Enzo Fernández",
    "Jamal Musiala","Florian Wirtz","Kai Havertz","Niclas Füllkrug",
    "João Félix","Rafael Leão","Bruno Fernandes","Cristiano Ronaldo",
    "Kylian Mbappe","Antoine Griezmann","Marcus Thuram","Ousmane Dembélé",
    "Erling Haaland","Martin Ødegaard","Alexander Sørloth",
    "Victor Osimhen","Mohamed Salah","Sadio Mané",
    "Xavi Simons","Cody Gakpo","Memphis Depay",
    "Luis Díaz","James Rodríguez","Rafael Borré",
    "Federico Valverde","Darwin Núñez","Giorgian De Arrascaeta",
    "Heung-min Son","Takefusa Kubo","Mehdi Taremi",
    "Robert Lewandowski","Romelu Lukaku","Kevin De Bruyne",
    "Luka Modrić","Ivan Rakitić","Andrej Kramarić",
    "Neymar","Richarlison","Gabriel Martinelli",
    "Jonathan David","Alphonso Davies","Cyle Larin"
  ],
  JSON_FILES: {
    USERS: 'data/participants.json',
    MATCHES: 'data/matches.json',
    RESULTS: 'data/results.json',
    PREDICTIONS: 'data/predictions.json',
    SPECIAL_PREDICTIONS: 'data/special_predictions.json',
    SETTINGS: 'data/settings.json',
    PLAYERS: 'data/players.json'
  }
};
