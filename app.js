(() => {
  "use strict";

  const state = {
    mode: "play",
    status: "ready",
    rows: 10,
    cols: 14,
    mines: 26,
    board: [],
    custom: false,
    firstClick: true,
    startedAt: null,
    elapsed: 0,
    editorTool: "number",
    editorNumber: 1,
    flagMode: false,
    showProbabilities: true,
    probabilityResult: null,
    customClues: null,
  };

  const els = {
    rowsInput: document.querySelector("#rowsInput"),
    colsInput: document.querySelector("#colsInput"),
    minesInput: document.querySelector("#minesInput"),
    newGameButton: document.querySelector("#newGameButton"),
    newGameLabel: document.querySelector("#newGameLabel"),
    playModeButton: document.querySelector("#playModeButton"),
    editorModeButton: document.querySelector("#editorModeButton"),
    setupTitle: document.querySelector("#setupTitle"),
    configHint: document.querySelector("#configHint"),
    board: document.querySelector("#board"),
    boardTitle: document.querySelector("#boardTitle"),
    boardFooterHint: document.querySelector("#boardFooterHint"),
    mineCount: document.querySelector("#mineCount"),
    mineCountLabel: document.querySelector("#mineCountLabel"),
    timerValue: document.querySelector("#timerValue"),
    editorBand: document.querySelector("#editorBand"),
    editorCount: document.querySelector("#editorCount"),
    editorHint: document.querySelector("#editorHint"),
    startCustomButton: document.querySelector("#startCustomButton"),
    clearEditorButton: document.querySelector("#clearEditorButton"),
    editorNumberInput: document.querySelector("#editorNumberInput"),
    probabilityToggle: document.querySelector("#probabilityToggle"),
    probabilityCopy: document.querySelector("#probabilityCopy"),
    probabilityNote: document.querySelector("#probabilityNote"),
    unknownValue: document.querySelector("#unknownValue"),
    remainingMinesValue: document.querySelector("#remainingMinesValue"),
    safeValue: document.querySelector("#safeValue"),
    restartButton: document.querySelector("#restartButton"),
    flagModeButton: document.querySelector("#flagModeButton"),
    topStatusDot: document.querySelector("#topStatusDot"),
    topStatusText: document.querySelector("#topStatusText"),
  };

  let timerHandle = null;

  function idx(row, col) {
    return row * state.cols + col;
  }

  function coords(index) {
    return [Math.floor(index / state.cols), index % state.cols];
  }

  function neighbors(index) {
    const [row, col] = coords(index);
    const result = [];
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < state.rows && c >= 0 && c < state.cols) result.push(idx(r, c));
      }
    }
    return result;
  }

  function makeCell() {
    return { mine: false, revealed: false, flagged: false, number: 0, exploded: false };
  }

  function makeEmptyBoard() {
    state.board = Array.from({ length: state.rows * state.cols }, makeCell);
    calculateNumbers();
  }

  function placeRandomMines(avoidIndex = null) {
    state.board.forEach((cell) => { cell.mine = false; cell.exploded = false; });
    const protectedSet = new Set();
    if (avoidIndex !== null) {
      protectedSet.add(avoidIndex);
      neighbors(avoidIndex).forEach((neighbor) => protectedSet.add(neighbor));
    }
    let candidates = state.board
      .map((_, index) => index)
      .filter((index) => !protectedSet.has(index));
    if (candidates.length < state.mines) {
      candidates = state.board.map((_, index) => index).filter((index) => index !== avoidIndex);
    }
    for (let i = candidates.length - 1; i > 0; i -= 1) {
      const swapIndex = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[swapIndex]] = [candidates[swapIndex], candidates[i]];
    }
    candidates.slice(0, state.mines).forEach((index) => { state.board[index].mine = true; });
    calculateNumbers();
  }

  function calculateNumbers(preserveRevealed = false) {
    const revealedNumbers = preserveRevealed
      ? state.board.map((cell) => cell.number)
      : null;
    state.board.forEach((cell, index) => {
      if (preserveRevealed && cell.revealed) {
        cell.number = revealedNumbers[index];
        return;
      }
      cell.number = neighbors(index).reduce((count, neighbor) => count + (state.board[neighbor].mine ? 1 : 0), 0);
    });
  }

  function readConfiguration() {
    const rows = Number.parseInt(els.rowsInput.value, 10);
    const cols = Number.parseInt(els.colsInput.value, 10);
    const mines = Number.parseInt(els.minesInput.value, 10);
    if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2 || rows > 60 || cols > 60) {
      return { error: "行数和列数需要在 2 到 60 之间。" };
    }
    if (!Number.isInteger(mines) || mines < 1 || mines >= rows * cols) {
      return { error: `雷数需要在 1 到 ${rows * cols - 1} 之间。` };
    }
    return { rows, cols, mines };
  }

  function applyConfiguration() {
    const config = readConfiguration();
    if (config.error) {
      setStatus(config.error, "ready");
      return null;
    }
    state.rows = config.rows;
    state.cols = config.cols;
    state.mines = config.mines;
    return config;
  }

  function resetClock() {
    state.startedAt = null;
    state.elapsed = 0;
    updateTimer();
  }

  function startClock() {
    if (state.startedAt === null) state.startedAt = Date.now() - state.elapsed * 1000;
    updateTimer();
  }

  function updateTimer() {
    let seconds = state.elapsed;
    if (state.startedAt !== null && (state.status === "playing" || state.status === "editing")) {
      seconds = Math.floor((Date.now() - state.startedAt) / 1000);
    }
    const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
    const remainder = (seconds % 60).toString().padStart(2, "0");
    els.timerValue.textContent = `${minutes}:${remainder}`;
  }

  function beginTimerLoop() {
    if (timerHandle !== null) return;
    timerHandle = window.setInterval(updateTimer, 1000);
  }

  function setStatus(message, status = state.status) {
    state.status = status;
    els.topStatusText.textContent = message;
    els.topStatusDot.classList.toggle("is-success", status === "won");
    els.topStatusDot.classList.toggle("is-danger", status === "lost");
  }

  function startNewGame() {
    const config = applyConfiguration();
    if (!config) return;
    state.mode = "play";
    state.custom = false;
    state.customClues = null;
    state.firstClick = true;
    state.flagMode = false;
    state.elapsed = 0;
    state.startedAt = null;
    state.board = Array.from({ length: state.rows * state.cols }, makeCell);
    placeRandomMines();
    setStatus("准备开始", "ready");
    render();
  }

  function enterEditor() {
    const config = applyConfiguration();
    if (!config) return;
    state.mode = "editor";
    state.custom = false;
    state.customClues = null;
    state.editorTool = "number";
    state.editorNumber = 1;
    els.editorNumberInput.value = "1";
    state.elapsed = 0;
    state.startedAt = null;
    makeEmptyBoard();
    state.customClues = null;
    setStatus("编辑残局", "editing");
    render();
  }

  function enterPlayMode() {
    startNewGame();
  }

  function clearEditor() {
    if (state.mode !== "editor") return;
    makeEmptyBoard();
    state.customClues = null;
    state.elapsed = 0;
    state.startedAt = null;
    setStatus("编辑残局", "editing");
    render();
  }

  function restartRound() {
    if (state.mode === "editor") {
      clearEditor();
      return;
    }
    if (state.custom && state.customClues) {
      state.board.forEach((cell, index) => {
        const clue = state.customClues[index];
        cell.mine = false;
        cell.revealed = clue !== null;
        cell.number = clue ?? 0;
        cell.flagged = false;
        cell.exploded = false;
      });
      const generated = generateMinesFromClues();
      if (!generated.ok) {
        setStatus("残局约束无解", "ready");
        render();
        return;
      }
      state.elapsed = 0;
      state.startedAt = Date.now();
      setStatus("残局进行中", "playing");
      render();
      return;
    }
    state.board.forEach((cell) => {
      cell.revealed = false;
      cell.flagged = false;
      cell.exploded = false;
    });
    state.firstClick = !state.custom;
    state.elapsed = 0;
    state.startedAt = null;
    setStatus("准备开始", "ready");
    render();
  }

  function countMines() {
    return state.board.reduce((count, cell) => count + (cell.mine ? 1 : 0), 0);
  }

  function countFlags() {
    return state.board.reduce((count, cell) => count + (cell.flagged ? 1 : 0), 0);
  }

  function revealCell(index) {
    if (state.mode !== "play" || state.status === "lost" || state.status === "won") return;
    const cell = state.board[index];
    if (cell.revealed || cell.flagged) return;
    if (state.firstClick && !state.custom) {
      placeRandomMines(index);
      state.firstClick = false;
    }
    if (state.startedAt === null) startClock();
    if (cell.mine) {
      cell.exploded = true;
      cell.revealed = true;
      state.board.forEach((other) => {
        if (other.mine) other.revealed = true;
      });
      state.elapsed = state.startedAt === null ? 0 : Math.floor((Date.now() - state.startedAt) / 1000);
      setStatus("踩到雷了", "lost");
      render();
      return;
    }
    floodReveal(index);
    if (hasWon()) {
      state.board.forEach((other) => { if (other.mine) other.flagged = true; });
      state.elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      setStatus("清空雷区", "won");
    } else {
      setStatus("对局进行中", "playing");
    }
    render();
  }

  function floodReveal(startIndex) {
    const queue = [startIndex];
    const visited = new Set();
    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      const cell = state.board[current];
      if (cell.mine || cell.flagged) continue;
      cell.revealed = true;
      if (cell.number === 0) {
        neighbors(current).forEach((neighbor) => {
          if (!state.board[neighbor].revealed && !state.board[neighbor].mine && !state.board[neighbor].flagged) queue.push(neighbor);
        });
      }
    }
  }

  function hasWon() {
    return state.board.every((cell) => cell.mine || cell.revealed);
  }

  function toggleFlag(index) {
    if (state.mode !== "play" || state.status === "lost" || state.status === "won") return;
    const cell = state.board[index];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    if (state.status === "ready") setStatus("对局进行中", "playing");
    if (state.startedAt === null) startClock();
    render();
  }

  function handleCellClick(index) {
    if (state.mode === "editor") {
      editCell(index);
    } else if (state.flagMode) {
      toggleFlag(index);
    } else {
      revealCell(index);
    }
  }

  function editCell(index) {
    const cell = state.board[index];
    cell.mine = false;
    if (state.editorTool === "number") {
      cell.revealed = true;
      cell.number = state.editorNumber;
    } else if (state.editorTool === "empty") {
      cell.revealed = true;
      cell.number = 0;
    } else {
      cell.revealed = false;
      cell.number = 0;
    }
    els.editorHint.textContent = "选择数字后点击格子；“设置空白”代表数字 0。雷的位置会在开始时随机生成。";
    render();
  }

  function randomizeArray(values) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
    }
    return values;
  }

  function chooseRandomItems(values, count) {
    return randomizeArray([...values]).slice(0, count);
  }

  function buildClueConstraintModel() {
    const candidates = [];
    const candidateIndex = new Map();
    const revealedIndexes = [];
    state.board.forEach((cell, index) => {
      if (cell.revealed) revealedIndexes.push(index);
      else {
        candidateIndex.set(index, candidates.length);
        candidates.push(index);
      }
    });
    const equations = [];
    for (const index of revealedIndexes) {
      const vars = neighbors(index)
        .filter((neighbor) => candidateIndex.has(neighbor))
        .map((neighbor) => candidateIndex.get(neighbor));
      const target = state.board[index].number;
      if (target < 0 || target > vars.length) {
        return { error: `第 ${Math.floor(index / state.cols) + 1} 行，第 ${index % state.cols + 1} 列的数字 ${target} 无法成立。` };
      }
      if (vars.length) equations.push({ vars, target });
      else if (target !== 0) {
        return { error: `第 ${Math.floor(index / state.cols) + 1} 行，第 ${index % state.cols + 1} 列周围没有可放置的雷，数字必须是 0。` };
      }
    }
    const variableEquations = Array.from({ length: candidates.length }, () => []);
    equations.forEach((equation, equationIndex) => equation.vars.forEach((variable) => variableEquations[variable].push(equationIndex)));
    const usedVariables = new Set();
    const components = [];
    for (let variable = 0; variable < candidates.length; variable += 1) {
      if (!variableEquations[variable].length || usedVariables.has(variable)) continue;
      const componentVariables = [];
      const componentEquations = new Set();
      const queue = [variable];
      usedVariables.add(variable);
      while (queue.length) {
        const current = queue.pop();
        componentVariables.push(current);
        variableEquations[current].forEach((equationIndex) => {
          if (componentEquations.has(equationIndex)) return;
          componentEquations.add(equationIndex);
          equations[equationIndex].vars.forEach((neighbor) => {
            if (!usedVariables.has(neighbor)) {
              usedVariables.add(neighbor);
              queue.push(neighbor);
            }
          });
        });
      }
      components.push({ variables: componentVariables, equations: [...componentEquations] });
    }
    return {
      candidates,
      equations,
      components,
      freeVariables: candidates.map((_, index) => index).filter((variable) => !usedVariables.has(variable)),
    };
  }

  function chooseComponentMineCounts(solved, freeCount, totalMines) {
    let paths = new Map([[0, []]]);
    solved.forEach((result) => {
      const next = new Map();
      paths.forEach((path, usedMines) => {
        result.waysByMines.forEach((ways, componentMines) => {
          if (!ways || usedMines + componentMines > totalMines || next.has(usedMines + componentMines)) return;
          next.set(usedMines + componentMines, [...path, componentMines]);
        });
      });
      paths = next;
    });
    const options = [];
    paths.forEach((path, componentMines) => {
      for (let freeMines = 0; freeMines <= freeCount; freeMines += 1) {
        if (componentMines + freeMines === totalMines) options.push({ path, freeMines });
      }
    });
    return options.length ? options[Math.floor(Math.random() * options.length)] : null;
  }

  function findRandomGlobalAssignment(candidates, equations, totalMines) {
    const variableEquations = Array.from({ length: candidates.length }, () => []);
    equations.forEach((equation, equationIndex) => equation.vars.forEach((variable) => variableEquations[variable].push(equationIndex)));
    const order = candidates.map((_, index) => index).sort((left, right) => variableEquations[right].length - variableEquations[left].length);
    randomizeArray(order);
    const assignment = new Int8Array(candidates.length);
    assignment.fill(-1);
    const assignedCount = new Int16Array(equations.length);
    const assignedMines = new Int16Array(equations.length);
    let nodes = 0;
    const maxNodes = 500000;

    function search(position, mineCount) {
      nodes += 1;
      if (nodes > maxNodes || mineCount > totalMines || mineCount + (order.length - position) < totalMines) return false;
      if (position === order.length) {
        return mineCount === totalMines && equations.every((equation, equationIndex) => assignedMines[equationIndex] === equation.target);
      }
      const variable = order[position];
      const values = Math.random() < 0.5 ? [0, 1] : [1, 0];
      for (const value of values) {
        assignment[variable] = value;
        const touched = variableEquations[variable];
        touched.forEach((equationIndex) => {
          assignedCount[equationIndex] += 1;
          assignedMines[equationIndex] += value;
        });
        let feasible = true;
        for (const equationIndex of touched) {
          const remaining = equations[equationIndex].vars.length - assignedCount[equationIndex];
          const target = equations[equationIndex].target;
          if (assignedMines[equationIndex] > target || assignedMines[equationIndex] + remaining < target) {
            feasible = false;
            break;
          }
        }
        if (feasible && search(position + 1, mineCount + value)) return true;
        touched.forEach((equationIndex) => {
          assignedCount[equationIndex] -= 1;
          assignedMines[equationIndex] -= value;
        });
        assignment[variable] = -1;
      }
      return false;
    }

    return search(0, 0) ? assignment : null;
  }

  function generateMinesFromClues() {
    const revealedCount = state.board.reduce((count, cell) => count + (cell.revealed ? 1 : 0), 0);
    if (revealedCount === 0) {
      return { ok: false, error: "请至少设置一个已经翻开的格子，再开始残局。" };
    }
    const model = buildClueConstraintModel();
    if (model.error) return { ok: false, error: model.error };
    if (state.mines > model.candidates.length) {
      return { ok: false, error: `当前只有 ${model.candidates.length} 个未翻开格子，无法放置 ${state.mines} 枚雷。` };
    }
    state.board.forEach((cell) => { cell.mine = false; cell.flagged = false; cell.exploded = false; });
    if (!model.equations.length) {
      chooseRandomItems(model.candidates, state.mines).forEach((index) => { state.board[index].mine = true; });
      calculateNumbers(true);
      return { ok: true };
    }
    const solved = model.components.map((component) => solveComponent(component.variables, component.equations, model.equations));
    const exact = solved.every((result) => result.complete);
    let assignment = null;
    if (exact) {
      const choice = chooseComponentMineCounts(solved, model.freeVariables.length, state.mines);
      if (choice) {
        assignment = new Int8Array(model.candidates.length);
        solved.forEach((result, componentIndex) => {
          const sample = result.sampleByMines[choice.path[componentIndex]];
          if (!sample) {
            assignment = null;
            return;
          }
          if (assignment) result.variableIds.forEach((variable, localVariable) => { assignment[variable] = sample[localVariable]; });
        });
        if (assignment) chooseRandomItems(model.freeVariables, choice.freeMines).forEach((variable) => { assignment[variable] = 1; });
      }
    }
    if (!assignment) assignment = findRandomGlobalAssignment(model.candidates, model.equations, state.mines);
    if (!assignment) {
      return { ok: false, error: "这些翻开数字目前没有相容的雷位，请调整数字或雷数后重试。" };
    }
    model.candidates.forEach((index, variable) => { state.board[index].mine = assignment[variable] === 1; });
    calculateNumbers(true);
    return { ok: true };
  }

  function startCustomGame() {
    if (state.mode !== "editor") return;
    const generated = generateMinesFromClues();
    if (!generated.ok) {
      els.editorHint.textContent = generated.error;
      setStatus("残局约束无解", "editing");
      render();
      return;
    }
    state.customClues = state.board.map((cell) => cell.revealed ? cell.number : null);
    state.mode = "play";
    state.custom = true;
    state.firstClick = false;
    state.flagMode = false;
    state.startedAt = Date.now();
    state.elapsed = 0;
    state.board.forEach((cell) => { cell.flagged = false; cell.exploded = false; });
    setStatus("残局进行中", "playing");
    render();
  }

  function combinations(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let value = 1;
    for (let i = 1; i <= k; i += 1) value = value * (n - k + i) / i;
    return value;
  }

  function solveComponent(variableIds, equationIds, equations) {
    const localIndex = new Map(variableIds.map((value, index) => [value, index]));
    const localEquations = equationIds.map((equationId) => equations[equationId].vars.map((value) => localIndex.get(value)));
    const targets = equationIds.map((equationId) => equations[equationId].target);
    const variableEquations = Array.from({ length: variableIds.length }, () => []);
    localEquations.forEach((equation, equationIndex) => equation.forEach((variable) => variableEquations[variable].push(equationIndex)));
    const order = variableIds.map((_, index) => index).sort((a, b) => variableEquations[b].length - variableEquations[a].length);
    const assignment = new Int8Array(variableIds.length);
    assignment.fill(-1);
    const assignedCount = new Int16Array(localEquations.length);
    const assignedMines = new Int16Array(localEquations.length);
    const waysByMines = Array(variableIds.length + 1).fill(0);
    const mineWaysByVariable = Array.from({ length: variableIds.length }, () => Array(variableIds.length + 1).fill(0));
    const sampleByMines = Array(variableIds.length + 1).fill(null);
    let nodes = 0;
    let aborted = false;
    const maxNodes = 260000;

    function dfs(position, mineCount) {
      if (aborted) return;
      nodes += 1;
      if (nodes > maxNodes) {
        aborted = true;
        return;
      }
      if (position === order.length) {
        waysByMines[mineCount] += 1;
        if (sampleByMines[mineCount] === null || Math.random() < (1 / waysByMines[mineCount])) {
          sampleByMines[mineCount] = Array.from(assignment);
        }
        for (let variable = 0; variable < assignment.length; variable += 1) {
          if (assignment[variable] === 1) mineWaysByVariable[variable][mineCount] += 1;
        }
        return;
      }
      const variable = order[position];
      for (let value = 0; value <= 1; value += 1) {
        assignment[variable] = value;
        const touched = variableEquations[variable];
        touched.forEach((equationIndex) => {
          assignedCount[equationIndex] += 1;
          assignedMines[equationIndex] += value;
        });
        let feasible = true;
        for (const equationIndex of touched) {
          const remaining = localEquations[equationIndex].length - assignedCount[equationIndex];
          const target = targets[equationIndex];
          if (assignedMines[equationIndex] > target || assignedMines[equationIndex] + remaining < target) {
            feasible = false;
            break;
          }
        }
        if (feasible) dfs(position + 1, mineCount + value);
        touched.forEach((equationIndex) => {
          assignedCount[equationIndex] -= 1;
          assignedMines[equationIndex] -= value;
        });
        assignment[variable] = -1;
        if (aborted) return;
      }
    }

    dfs(0, 0);
    return { variableIds, waysByMines, mineWaysByVariable, sampleByMines, complete: !aborted, nodes };
  }

  function calculateProbabilities() {
    const candidates = [];
    const candidateIndex = new Map();
    let flags = 0;
    state.board.forEach((cell, index) => {
      if (cell.flagged) flags += 1;
      if (!cell.revealed && !cell.flagged) {
        candidateIndex.set(index, candidates.length);
        candidates.push(index);
      }
    });
    const remainingMines = Math.max(0, state.mines - flags);
    const probabilities = new Map();
    if (!candidates.length) {
      return { probabilities, unknown: 0, remainingMines, safe: 0, exact: true, inconsistent: false };
    }
    const equations = [];
    state.board.forEach((cell, index) => {
      if (!cell.revealed || cell.mine) return;
      const vars = [];
      let flaggedNeighbors = 0;
      neighbors(index).forEach((neighbor) => {
        if (state.board[neighbor].flagged) flaggedNeighbors += 1;
        else if (!state.board[neighbor].revealed && candidateIndex.has(neighbor)) vars.push(candidateIndex.get(neighbor));
      });
      if (vars.length) equations.push({ vars, target: cell.number - flaggedNeighbors });
    });
    if (!equations.length) {
      const baseline = Math.min(1, remainingMines / candidates.length);
      candidates.forEach((index) => probabilities.set(index, baseline));
      return { probabilities, unknown: candidates.length, remainingMines, safe: baseline === 0 ? candidates.length : 0, exact: true, inconsistent: false };
    }
    const variableEquations = Array.from({ length: candidates.length }, () => []);
    equations.forEach((equation, equationIndex) => equation.vars.forEach((variable) => variableEquations[variable].push(equationIndex)));
    const usedVariables = new Set();
    const components = [];
    for (let variable = 0; variable < candidates.length; variable += 1) {
      if (!variableEquations[variable].length || usedVariables.has(variable)) continue;
      const componentVariables = [];
      const componentEquations = new Set();
      const queue = [variable];
      usedVariables.add(variable);
      while (queue.length) {
        const current = queue.pop();
        componentVariables.push(current);
        variableEquations[current].forEach((equationIndex) => {
          if (componentEquations.has(equationIndex)) return;
          componentEquations.add(equationIndex);
          equations[equationIndex].vars.forEach((neighbor) => {
            if (!usedVariables.has(neighbor)) {
              usedVariables.add(neighbor);
              queue.push(neighbor);
            }
          });
        });
      }
      components.push({ variables: componentVariables, equations: [...componentEquations] });
    }
    const freeVariables = candidates.map((_, index) => index).filter((variable) => !usedVariables.has(variable));
    const solved = components.map((component) => solveComponent(component.variables, component.equations, equations));
    const exact = solved.every((result) => result.complete);
    const totalWays = (results, freeCount) => {
      let distribution = [1];
      results.forEach((result) => {
        const next = Array(distribution.length + result.waysByMines.length - 1).fill(0);
        distribution.forEach((left, leftMines) => result.waysByMines.forEach((right, rightMines) => { next[leftMines + rightMines] += left * right; }));
        distribution = next;
      });
      if (freeCount > 0) {
        const next = Array(distribution.length + freeCount).fill(0);
        distribution.forEach((ways, componentMines) => {
          for (let freeMines = 0; freeMines <= freeCount; freeMines += 1) {
            next[componentMines + freeMines] += ways * combinations(freeCount, freeMines);
          }
        });
        distribution = next;
      }
      return distribution;
    };

    if (exact) {
      const denominatorDistribution = totalWays(solved, freeVariables.length);
      const denominator = denominatorDistribution[remainingMines] || 0;
      if (denominator > 0 && Number.isFinite(denominator)) {
        solved.forEach((result, componentIndex) => {
          const otherResults = solved.filter((_, index) => index !== componentIndex);
          const otherDistribution = totalWays(otherResults, freeVariables.length);
          result.variableIds.forEach((variable, localVariable) => {
            let ways = 0;
            result.mineWaysByVariable[localVariable].forEach((variableWays, minesInComponent) => {
              const needed = remainingMines - minesInComponent;
              if (needed >= 0 && needed < otherDistribution.length) ways += variableWays * otherDistribution[needed];
            });
            probabilities.set(candidates[variable], Math.max(0, Math.min(1, ways / denominator)));
          });
        });
        if (freeVariables.length) {
          const componentDistribution = totalWays(solved, 0);
          let freeMineWays = 0;
          for (let freeMines = 1; freeMines <= freeVariables.length; freeMines += 1) {
            const needed = remainingMines - freeMines;
            if (needed >= 0 && needed < componentDistribution.length) {
              freeMineWays += combinations(freeVariables.length - 1, freeMines - 1) * componentDistribution[needed];
            }
          }
          const freeProbability = freeMineWays / denominator;
          freeVariables.forEach((variable) => probabilities.set(candidates[variable], Math.max(0, Math.min(1, freeProbability))));
        }
        const safe = [...probabilities.values()].filter((value) => value === 0).length;
        return { probabilities, unknown: candidates.length, remainingMines, safe, exact: true, inconsistent: false };
      }
    }

    // A dense component can have too many satisfying assignments for an instant exhaustive search.
    // Keep deterministic deductions and distribute the unresolved mines over the remaining candidates.
    const fixed = new Map();
    equations.forEach((equation) => {
      if (equation.target === 0) equation.vars.forEach((variable) => fixed.set(variable, 0));
      if (equation.target === equation.vars.length) equation.vars.forEach((variable) => fixed.set(variable, 1));
    });
    let fixedMines = 0;
    fixed.forEach((value) => { if (value === 1) fixedMines += 1; });
    const unresolved = candidates.map((_, variable) => variable).filter((variable) => !fixed.has(variable));
    const fallbackProbability = unresolved.length ? Math.max(0, Math.min(1, (remainingMines - fixedMines) / unresolved.length)) : 0;
    candidates.forEach((index, variable) => probabilities.set(index, fixed.has(variable) ? fixed.get(variable) : fallbackProbability));
    return { probabilities, unknown: candidates.length, remainingMines, safe: [...probabilities.values()].filter((value) => value === 0).length, exact: false, inconsistent: denominatorDistributionInvalid(solved, remainingMines) };
  }

  function denominatorDistributionInvalid(solved, remainingMines) {
    return solved.some((result) => result.waysByMines.every((ways) => ways === 0)) || remainingMines < 0;
  }

  function formatProbability(value) {
    if (value <= 0.00001) return "0%";
    if (value >= 0.99999) return "100%";
    return `${Math.round(value * 100)}%`;
  }

  function summarizeProbabilityCounts() {
    const unknown = state.board.reduce((count, cell) => count + (!cell.revealed && !cell.flagged ? 1 : 0), 0);
    const flags = countFlags();
    return {
      probabilities: new Map(),
      unknown,
      remainingMines: Math.max(0, state.mines - flags),
      safe: 0,
      exact: true,
      inconsistent: false,
    };
  }

  function renderBoard() {
    els.board.style.setProperty("--cols", state.cols);
    els.board.replaceChildren();
    state.board.forEach((cell, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", `第 ${Math.floor(index / state.cols) + 1} 行，第 ${index % state.cols + 1} 列`);
      button.addEventListener("click", () => handleCellClick(index));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        if (state.mode === "play") toggleFlag(index);
      });
      if (state.mode === "editor") {
        if (cell.revealed) {
          button.classList.add("revealed", "editor-open");
          button.setAttribute("aria-label", cell.number > 0 ? `设计数字 ${cell.number}` : "设计为空白的翻开格子");
          if (cell.number > 0) {
            button.dataset.number = cell.number;
            const number = document.createElement("span");
            number.className = "number";
            number.textContent = cell.number;
            button.append(number);
          }
        } else {
          button.classList.add("covered");
        }
      } else if (cell.revealed) {
        button.classList.add("revealed");
        if (cell.mine) {
          button.classList.add("mine");
          button.textContent = cell.exploded ? "✹" : "✦";
        } else if (cell.number > 0) {
          button.dataset.number = cell.number;
          const number = document.createElement("span");
          number.className = "number";
          number.textContent = cell.number;
          button.append(number);
        }
      } else if (cell.flagged) {
        button.classList.add("covered", "flagged");
        button.textContent = "⚑";
        button.setAttribute("aria-label", "已标记为雷");
      } else {
        button.classList.add("covered");
        const probability = state.probabilityResult?.probabilities.get(index);
        if (state.showProbabilities && state.status !== "lost" && state.status !== "won" && probability !== undefined) {
          const probabilityElement = document.createElement("span");
          probabilityElement.className = "probability";
          probabilityElement.textContent = `${state.probabilityResult.exact ? "" : "~"}${formatProbability(probability)}`;
          button.append(probabilityElement);
          if (probability >= 0.66) button.classList.add("high-risk");
          if (probability <= 0.001) button.classList.add("safe-risk");
          button.setAttribute("aria-label", `雷概率 ${formatProbability(probability)}`);
        }
      }
      els.board.append(button);
    });
  }

  function renderStats() {
    const flags = countFlags();
    if (state.mode === "editor") {
      const designed = state.board.reduce((count, cell) => count + (cell.revealed ? 1 : 0), 0);
      els.mineCount.textContent = `${designed}`;
      els.mineCountLabel.textContent = "已设计翻开";
    } else {
      els.mineCount.textContent = `${flags} / ${state.mines}`;
      els.mineCountLabel.textContent = "已标记雷";
    }
    els.unknownValue.textContent = state.probabilityResult?.unknown ?? 0;
    els.remainingMinesValue.textContent = state.probabilityResult?.remainingMines ?? state.mines;
    els.safeValue.textContent = state.showProbabilities && state.probabilityResult ? state.probabilityResult.safe : "—";
    const designed = state.board.reduce((count, cell) => count + (cell.revealed ? 1 : 0), 0);
    els.editorCount.textContent = `已设置 ${designed} 个翻开格子`;
  }

  function renderPanels() {
    const editor = state.mode === "editor";
    els.playModeButton.classList.toggle("is-active", !editor);
    els.editorModeButton.classList.toggle("is-active", editor);
    els.editorBand.classList.toggle("is-hidden", !editor);
    els.setupTitle.textContent = editor ? "先配置残局尺寸" : "配置一局新游戏";
    els.newGameLabel.textContent = editor ? "重建编辑" : "开始新局";
    els.configHint.textContent = editor
      ? "只需设计翻开格子和数字；开始残局时会自动寻找相容的随机雷位。"
      : "首次翻开会自动保护点击位置及周围一圈。";
    els.boardFooterHint.textContent = editor ? "选择下方工具后点击棋盘格" : (state.flagMode ? "标记模式已开启 · 点击格子标记" : "左键翻开 · 右键标记");
    els.flagModeButton.textContent = `⚑ 标记模式：${state.flagMode ? "开" : "关"}`;
    els.flagModeButton.classList.toggle("is-active", state.flagMode);
    els.probabilityToggle.checked = state.showProbabilities;
    els.probabilityCopy.textContent = state.showProbabilities
      ? "在未翻开的格子上显示当前推断的雷概率。"
      : "概率显示已关闭，棋盘只保留基础扫雷信息。";
    els.probabilityNote.classList.toggle("is-off", !state.showProbabilities);
    const terminal = state.status === "lost" || state.status === "won";
    if (terminal) {
      els.probabilityNote.classList.remove("is-estimate");
      els.probabilityNote.classList.add("is-off");
      els.probabilityCopy.textContent = "对局已结束，概率显示已暂停。";
      els.probabilityNote.lastElementChild.textContent = "重新开始后恢复实时推断。";
    } else if (!state.showProbabilities) {
      els.probabilityNote.classList.remove("is-estimate");
      els.probabilityNote.lastElementChild.textContent = "打开开关后，概率会随每次操作实时更新。";
    } else if (state.probabilityResult?.exact) {
      els.probabilityNote.classList.remove("is-estimate");
      els.probabilityNote.lastElementChild.textContent = "当前数字约束已完成精确枚举。";
    } else {
      els.probabilityNote.classList.add("is-estimate");
      els.probabilityNote.lastElementChild.textContent = "局面较复杂，当前显示的是快速估算值。";
    }
    document.querySelectorAll("[data-editor-tool]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.editorTool === state.editorTool);
    });
    els.editorNumberInput.value = String(state.editorNumber);
  }

  function renderBoardTitle() {
    if (state.mode === "editor") {
      els.boardTitle.textContent = "在这里预览残局布局";
      return;
    }
    const titles = {
      ready: state.custom ? "残局已准备" : "等待你的第一步",
      playing: state.custom ? "残局进行中" : "雷区正在展开",
      won: "清空雷区，漂亮",
      lost: "这一步踩中了雷",
    };
    els.boardTitle.textContent = titles[state.status] || "扫雷棋盘";
  }

  function render() {
    const terminal = state.status === "lost" || state.status === "won";
    state.probabilityResult = state.mode === "editor"
      ? null
      : (state.showProbabilities && !terminal ? calculateProbabilities() : summarizeProbabilityCounts());
    renderPanels();
    renderBoardTitle();
    renderStats();
    renderBoard();
    updateTimer();
  }

  els.newGameButton.addEventListener("click", () => {
    if (state.mode === "editor") {
      const config = applyConfiguration();
      if (!config) return;
      makeEmptyBoard();
      state.customClues = null;
      setStatus("编辑残局", "editing");
      render();
    } else {
      startNewGame();
    }
  });
  els.playModeButton.addEventListener("click", enterPlayMode);
  els.editorModeButton.addEventListener("click", enterEditor);
  els.restartButton.addEventListener("click", restartRound);
  els.clearEditorButton.addEventListener("click", clearEditor);
  els.startCustomButton.addEventListener("click", startCustomGame);
  els.flagModeButton.addEventListener("click", () => {
    if (state.mode === "play") {
      state.flagMode = !state.flagMode;
      render();
    }
  });
  els.probabilityToggle.addEventListener("change", (event) => {
    state.showProbabilities = event.target.checked;
    render();
  });
  document.querySelectorAll("[data-editor-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editorTool = button.dataset.editorTool;
      renderPanels();
    });
  });
  els.editorNumberInput.addEventListener("change", () => {
    state.editorNumber = Math.max(1, Math.min(8, Number.parseInt(els.editorNumberInput.value, 10) || 1));
    els.editorNumberInput.value = String(state.editorNumber);
  });
  [els.rowsInput, els.colsInput, els.minesInput].forEach((input) => {
    input.addEventListener("change", () => {
      const config = applyConfiguration();
      if (!config) return;
      if (state.mode === "editor") {
        makeEmptyBoard();
        state.customClues = null;
        render();
      }
    });
  });

  makeEmptyBoard();
  placeRandomMines();
  beginTimerLoop();
  setStatus("准备开始", "ready");
  render();
})();
