/* Card Scorer — round-based card game score tracker.
 * State is persisted to localStorage. No backend, no auth. */

(function () {
  "use strict";

  var STORAGE_KEY = "card-scorer:v1";

  /* ---------- State ---------- *
   * state = {
   *   activeGameId: string | null,
   *   games: [{
   *     id, name,
   *     players: [{ id, name }],
   *     rounds: [{ id, scores: { [playerId]: number } }]
   *   }]
   * }
   */
  var state = load();

  /* ---------- Persistence ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.games)) return parsed;
      }
    } catch (e) {
      console.warn("Could not load saved data:", e);
    }
    return { activeGameId: null, games: [] };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save data:", e);
    }
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- State helpers ---------- */
  function activeGame() {
    return state.games.find(function (g) { return g.id === state.activeGameId; }) || null;
  }

  function playerTotal(game, playerId) {
    return game.rounds.reduce(function (sum, round) {
      var v = round.scores[playerId];
      return sum + (typeof v === "number" ? v : 0);
    }, 0);
  }

  function leadingTotal(game) {
    if (game.players.length === 0 || game.rounds.length === 0) return null;
    var max = -Infinity;
    game.players.forEach(function (p) {
      var t = playerTotal(game, p.id);
      if (t > max) max = t;
    });
    return max === -Infinity ? null : max;
  }

  /* ---------- DOM refs ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var gameSelect = $("game-select");
  var gameView = $("game-view");
  var noGameView = $("no-game-view");
  var scoreboard = $("scoreboard");
  var emptyHint = $("empty-hint");

  /* ---------- Game-level actions ---------- */
  function createGame() {
    var name = prompt("Name this game:", "Game " + (state.games.length + 1));
    if (name === null) return;
    name = name.trim() || "Game " + (state.games.length + 1);
    var game = { id: uid(), name: name, players: [], rounds: [] };
    state.games.push(game);
    state.activeGameId = game.id;
    save();
    render();
  }

  function renameGame() {
    var game = activeGame();
    if (!game) return;
    var name = prompt("Rename game:", game.name);
    if (name === null) return;
    name = name.trim();
    if (name) { game.name = name; save(); render(); }
  }

  function deleteGame() {
    var game = activeGame();
    if (!game) return;
    if (!confirm('Delete "' + game.name + '" and all its scores?')) return;
    state.games = state.games.filter(function (g) { return g.id !== game.id; });
    state.activeGameId = state.games.length ? state.games[0].id : null;
    save();
    render();
  }

  function selectGame(id) {
    state.activeGameId = id;
    save();
    render();
  }

  /* ---------- Player actions ---------- */
  function addPlayer(name) {
    var game = activeGame();
    if (!game) return;
    name = name.trim();
    if (!name) return;
    game.players.push({ id: uid(), name: name });
    save();
    render();
  }

  function removePlayer(playerId) {
    var game = activeGame();
    if (!game) return;
    var player = game.players.find(function (p) { return p.id === playerId; });
    if (!player) return;
    if (!confirm('Remove "' + player.name + '"? Their scores in every round will be removed.')) return;
    game.players = game.players.filter(function (p) { return p.id !== playerId; });
    game.rounds.forEach(function (r) { delete r.scores[playerId]; });
    save();
    render();
  }

  /* ---------- Round editor (modal) ---------- */
  var roundModal = $("round-modal");
  var roundInputs = $("round-inputs");
  var roundTitle = $("round-modal-title");
  var roundDeleteBtn = $("round-delete-btn");
  var editingRoundId = null; // null => adding a new round

  function openRoundModal(roundId) {
    var game = activeGame();
    if (!game) return;
    if (game.players.length === 0) {
      alert("Add at least one player before scoring a round.");
      return;
    }
    editingRoundId = roundId || null;
    var round = roundId ? game.rounds.find(function (r) { return r.id === roundId; }) : null;
    var roundNumber = roundId
      ? game.rounds.findIndex(function (r) { return r.id === roundId; }) + 1
      : game.rounds.length + 1;

    roundTitle.textContent = "Round " + roundNumber;
    roundDeleteBtn.hidden = !roundId;

    roundInputs.innerHTML = "";
    game.players.forEach(function (p) {
      var row = document.createElement("div");
      row.className = "round-input-row";

      var label = document.createElement("label");
      label.textContent = p.name;
      label.htmlFor = "score-" + p.id;

      var input = document.createElement("input");
      input.type = "number";
      input.id = "score-" + p.id;
      input.dataset.playerId = p.id;
      input.step = "1";
      input.placeholder = "0";
      if (round && typeof round.scores[p.id] === "number") {
        input.value = round.scores[p.id];
      }

      row.appendChild(label);
      row.appendChild(input);
      roundInputs.appendChild(row);
    });

    roundModal.hidden = false;
    var first = roundInputs.querySelector("input");
    if (first) first.focus();
  }

  function closeRoundModal() {
    roundModal.hidden = true;
    editingRoundId = null;
  }

  function saveRound() {
    var game = activeGame();
    if (!game) return;
    var scores = {};
    roundInputs.querySelectorAll("input").forEach(function (input) {
      var raw = input.value.trim();
      var val = raw === "" ? 0 : Number(raw);
      scores[input.dataset.playerId] = isNaN(val) ? 0 : val;
    });

    if (editingRoundId) {
      var round = game.rounds.find(function (r) { return r.id === editingRoundId; });
      if (round) round.scores = scores;
    } else {
      game.rounds.push({ id: uid(), scores: scores });
    }
    save();
    closeRoundModal();
    render();
  }

  function deleteRound() {
    var game = activeGame();
    if (!game || !editingRoundId) return;
    if (!confirm("Delete this round?")) return;
    game.rounds = game.rounds.filter(function (r) { return r.id !== editingRoundId; });
    save();
    closeRoundModal();
    render();
  }

  /* ---------- Rendering ---------- */
  function render() {
    renderGameSelect();
    var game = activeGame();

    var hasGame = !!game;
    gameView.hidden = !hasGame;
    noGameView.hidden = hasGame;
    $("rename-game-btn").disabled = !hasGame;
    $("delete-game-btn").disabled = !hasGame;

    if (!game) return;
    renderScoreboard(game);
  }

  function renderGameSelect() {
    gameSelect.innerHTML = "";
    state.games.forEach(function (g) {
      var opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.name;
      if (g.id === state.activeGameId) opt.selected = true;
      gameSelect.appendChild(opt);
    });
    gameSelect.hidden = state.games.length === 0;
  }

  function renderScoreboard(game) {
    var thead = scoreboard.querySelector("thead");
    var tbody = scoreboard.querySelector("tbody");
    var tfoot = scoreboard.querySelector("tfoot");
    thead.innerHTML = "";
    tbody.innerHTML = "";
    tfoot.innerHTML = "";

    if (game.players.length === 0) {
      scoreboard.hidden = true;
      emptyHint.textContent = "Add players above to start the scoreboard.";
      return;
    }
    scoreboard.hidden = false;

    var lead = leadingTotal(game);

    /* Header: Round | player names (with remove buttons) */
    var headRow = document.createElement("tr");
    headRow.appendChild(th("Round"));
    game.players.forEach(function (p) {
      var cell = document.createElement("th");
      if (lead !== null && playerTotal(game, p.id) === lead) cell.classList.add("leader");

      var wrap = document.createElement("div");
      wrap.className = "player-th";
      var nameSpan = document.createElement("span");
      nameSpan.textContent = p.name;
      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "remove-player";
      rm.title = "Remove player";
      rm.textContent = "✕";
      rm.addEventListener("click", function () { removePlayer(p.id); });
      wrap.appendChild(nameSpan);
      wrap.appendChild(rm);
      cell.appendChild(wrap);
      headRow.appendChild(cell);
    });
    thead.appendChild(headRow);

    /* Body: one row per round, cells clickable to edit */
    if (game.rounds.length === 0) {
      emptyHint.textContent = 'No rounds yet. Click "Add round" to enter the first round.';
    } else {
      emptyHint.textContent = "Tip: click any score to correct it.";
    }

    game.rounds.forEach(function (round, idx) {
      var tr = document.createElement("tr");
      tr.className = "round-row";
      tr.appendChild(td("R" + (idx + 1)));
      game.players.forEach(function (p) {
        var cell = document.createElement("td");
        cell.className = "round-cell";
        var v = round.scores[p.id];
        cell.textContent = typeof v === "number" ? v : "–";
        cell.title = "Click to edit round " + (idx + 1);
        cell.addEventListener("click", function () { openRoundModal(round.id); });
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
    });

    /* Footer: totals */
    var footRow = document.createElement("tr");
    footRow.appendChild(td("Total"));
    game.players.forEach(function (p) {
      var total = playerTotal(game, p.id);
      var cell = td(String(total));
      if (lead !== null && total === lead) cell.classList.add("leader");
      footRow.appendChild(cell);
    });
    tfoot.appendChild(footRow);
  }

  function th(text) { var e = document.createElement("th"); e.textContent = text; return e; }
  function td(text) { var e = document.createElement("td"); e.textContent = text; return e; }

  /* ---------- Event wiring ---------- */
  $("new-game-btn").addEventListener("click", createGame);
  $("first-game-btn").addEventListener("click", createGame);
  $("rename-game-btn").addEventListener("click", renameGame);
  $("delete-game-btn").addEventListener("click", deleteGame);
  gameSelect.addEventListener("change", function () { selectGame(gameSelect.value); });

  $("add-player-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("player-name-input");
    addPlayer(input.value);
    input.value = "";
    input.focus();
  });

  $("add-round-btn").addEventListener("click", function () { openRoundModal(null); });
  $("round-cancel-btn").addEventListener("click", closeRoundModal);
  $("round-delete-btn").addEventListener("click", deleteRound);
  $("round-form").addEventListener("submit", function (e) { e.preventDefault(); saveRound(); });
  roundModal.addEventListener("click", function (e) {
    if (e.target === roundModal) closeRoundModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !roundModal.hidden) closeRoundModal();
  });

  /* ---------- Boot ---------- */
  if (!activeGame() && state.games.length) {
    state.activeGameId = state.games[0].id;
  }
  render();
})();
