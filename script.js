const boardElement = document.getElementById('board');
const sizeInput = document.getElementById('size');
const minesInput = document.getElementById('mines');
const seedRandomInput = document.getElementById('seed-random-input');
const seedSize = document.getElementById('seed-size');
const seedMines = document.getElementById('seed-mines');
const generateSeedButton = document.getElementById('generate-seed-button');
const minesLeftElement = document.getElementById('mines-left');
const timerElement = document.getElementById('timer');
const toggleSidebarButton = document.getElementById('toggle-sidebar-button');
const toggleInfoSidebarButton = document.getElementById('toggle-info-sidebar-button');
const toggleProbabilitiesButton = document.getElementById('toggle-probabilities-button');
const newGameButton = document.getElementById('new-game-button');
const leftPanel = document.getElementById('left-panel');
const rightInfoPanel = document.getElementById('right-info-panel');
const sizeInputField = document.getElementById('size-input');
const minesInputField = document.getElementById('mines-input');

let board = [];
let size = 10;
let mines = 15;
let seed = '000000';
let gameOver = false;
let timerInterval = null;
let seconds = 0;
let flags = 0;
let firstClick = true;
let showProbabilities = false;

function updateSliderLimits() {
    const maxCells = size * size;
    const minMines = Math.max(5, Math.floor(maxCells * 0.15));
    const maxMines = Math.min(150, Math.floor(maxCells * 0.85));
    minesInput.min = minMines;
    minesInput.max = maxMines;
    minesInput.value = Math.min(Math.max(minMines, mines), maxMines);
    minesInputField.value = minesInput.value;

    const minSize = 5;
    const maxSize = 25;
    const maxPossibleMines = Math.floor(size * size * 0.85);
    if (mines > maxPossibleMines) {
        mines = maxPossibleMines;
        minesInput.value = mines;
        minesInputField.value = mines;
    }
    sizeInput.value = size;
    sizeInputField.value = size;
    updateDisplay();
}

sizeInput.addEventListener('input', () => {
    size = parseInt(sizeInput.value);
    updateSliderLimits();
    seedSize.textContent = size;
});

minesInput.addEventListener('input', () => {
    mines = parseInt(minesInput.value);
    updateSliderLimits();
    seedMines.textContent = mines;
});

sizeInputField.addEventListener('input', () => {
    sizeInputField.value = sizeInputField.value.replace(/\D/g, '');
    size = parseInt(sizeInputField.value) || 5;
    size = Math.max(5, Math.min(25, size));
    sizeInput.value = size;
    sizeInputField.value = size;
    updateSliderLimits();
    seedSize.textContent = size;
});

minesInputField.addEventListener('input', () => {
    minesInputField.value = minesInputField.value.replace(/\D/g, '');
    mines = parseInt(minesInputField.value) || 5;
    updateSliderLimits();
    seedMines.textContent = mines;
});

function initGame() {
    size = parseInt(sizeInput.value);
    mines = Math.min(parseInt(minesInput.value), size * size - 1);
    seed = seedRandomInput.value;
    gameOver = false;
    firstClick = true;
    flags = 0;
    seconds = 0;
    showProbabilities = false;
    toggleProbabilitiesButton.classList.remove('active');
    updateSliderLimits();
    generateBoard();
    renderBoard();
    stopTimer();
}

function generateSeed() {
    const randomSeed = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    seedRandomInput.value = randomSeed;
    updateSeedDisplay();
}

function updateSeedDisplay() {
    seedSize.textContent = sizeInput.value;
    seedMines.textContent = minesInput.value;
    seedRandomInput.value = seedRandomInput.value.padStart(6, '0');
}

function seedRandom(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
    }
    return () => {
        hash = (hash * 1664525 + 1013904223) & 0x7fffffff;
        return hash / 0x7fffffff;
    };
}

function generateBoard() {
    board = Array(size).fill().map(() => Array(size).fill(0));
}

function placeMines(excludeX, excludeY) {
    const random = seedRandom(seed + size + mines);
    let minesToPlace = mines;
    const cells = [];
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (Math.abs(i - excludeX) > 1 || Math.abs(j - excludeY) > 1) {
                cells.push([i, j]);
            }
        }
    }
    while (minesToPlace > 0 && cells.length > 0) {
        const idx = Math.floor(random() * cells.length);
        const [x, y] = cells.splice(idx, 1)[0];
        board[x][y] = -1;
        minesToPlace--;
    }
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (board[i][j] === -1) continue;
            board[i][j] = countAdjacentMines(i, j);
        }
    }
}

function countAdjacentMines(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && board[nx][ny] === -1) {
                count++;
            }
        }
    }
    return count;
}

function renderBoard() {
    boardElement.style.gridTemplateColumns = `repeat(${size}, var(--cell-size))`;
    boardElement.innerHTML = '';
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.x = i;
            cell.dataset.y = j;
            cell.addEventListener('click', handleClick);
            cell.addEventListener('contextmenu', handleRightClick);
            boardElement.appendChild(cell);
        }
    }
    updateDisplay();
}

function handleClick(e) {
    if (gameOver) return;
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);
    if (e.target.classList.contains('revealed') || e.target.classList.contains('flag')) return;
    if (firstClick) {
        firstClick = false;
        placeMines(x, y);
        startTimer();
    }
    revealCell(x, y);
    updateProbabilities();
    checkWin();
}

function handleRightClick(e) {
    e.preventDefault();
    if (gameOver || firstClick) return;
    const cell = e.target;
    if (cell.classList.contains('revealed')) return;
    if (cell.classList.contains('flag')) {
        cell.classList.remove('flag');
        cell.textContent = '';
        flags--;
    } else {
        cell.classList.add('flag');
        cell.textContent = '🚩';
        flags++;
    }
    updateDisplay();
    updateProbabilities();
    checkWin();
}

function revealCell(x, y) {
    const cell = boardElement.children[x * size + y];
    if (cell.classList.contains('revealed') || cell.classList.contains('flag')) return;
    cell.classList.add('revealed');
    if (board[x][y] === -1) {
        cell.classList.add('mine-hit');
        endGame(false);
        return;
    }
    if (board[x][y] > 0) {
        cell.textContent = board[x][y];
        cell.classList.add(`number-${board[x][y]}`);
    } else {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nx = x + dx, ny = y + dy;
                if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                    revealCell(nx, ny);
                }
            }
        }
    }
}

function endGame(won) {
    gameOver = true;
    stopTimer();
    revealAllMines();
    alert(won ? 'Победа!' : 'Игра окончена!');
}

function revealAllMines() {
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = boardElement.children[i * size + j];
            if (board[i][j] === -1) {
                cell.classList.add('mine');
                cell.textContent = '💣';
            } else if (cell.classList.contains('flag') && board[i][j] !== -1) {
                cell.classList.add('wrong-flag');
                cell.textContent = '❌';
            }
        }
    }
}

function checkWin() {
    let revealedCount = 0;
    let correctFlags = 0;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = boardElement.children[i * size + j];
            if (cell.classList.contains('revealed')) revealedCount++;
            if (cell.classList.contains('flag') && board[i][j] === -1) correctFlags++;
        }
    }
    if (revealedCount === size * size - mines || correctFlags === mines) {
        endGame(true);
    }
}

function hasAdjacentRevealed(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                const cell = boardElement.children[nx * size + ny];
                if (cell.classList.contains('revealed') && board[nx][ny] > 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

function calculateProbabilities() {
    if (gameOver || firstClick) return;

    // Очистим текущие вероятности
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = boardElement.children[i * size + j];
            const probElement = cell.querySelector('.probability');
            if (probElement) probElement.remove();
        }
    }

    // Собираем ограничения от всех раскрытых ячеек
    const constraints = [];
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = boardElement.children[i * size + j];
            if (cell.classList.contains('revealed') && board[i][j] > 0) {
                let unrevealedNeighbors = [];
                let flaggedCount = 0;
                for (let dx = -1; dx <= 1; dx++) {
                    for (let dy = -1; dy <= 1; dy++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = i + dx, ny = j + dy;
                        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
                            const neighborCell = boardElement.children[nx * size + ny];
                            if (!neighborCell.classList.contains('revealed')) {
                                if (neighborCell.classList.contains('flag')) flaggedCount++;
                                else unrevealedNeighbors.push([nx, ny]);
                            }
                        }
                    }
                }
                const minesNeeded = board[i][j] - flaggedCount;
                if (minesNeeded > 0 && unrevealedNeighbors.length > 0) {
                    constraints.push({
                        minesNeeded,
                        unrevealedNeighbors
                    });
                }
            }
        }
    }

    // Рассчитываем вероятности для каждой нераскрытой ячейки
    const probabilities = new Map();
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            const cell = boardElement.children[i * size + j];
            if (cell.classList.contains('revealed') || cell.classList.contains('flag')) continue;
            if (!hasAdjacentRevealed(i, j)) continue;

            // Проверяем, является ли ячейка единственной для какого-либо ограничения
            let maxProbability = 0;
            let isCertainMine = false;
            const coords = `${i},${j}`;
            for (const constraint of constraints) {
                const { minesNeeded, unrevealedNeighbors } = constraint;
                const neighborCoords = unrevealedNeighbors.map(([nx, ny]) => `${nx},${ny}`);
                if (neighborCoords.includes(coords)) {
                    // Если ячейка — единственная в ограничении
                    if (unrevealedNeighbors.length === 1 && minesNeeded === 1) {
                        isCertainMine = true;
                        break;
                    }
                    // Проверяем, является ли ячейка общей для нескольких ограничений
                    let overlappingConstraints = 1;
                    for (const otherConstraint of constraints) {
                        if (otherConstraint === constraint) continue;
                        const otherNeighbors = otherConstraint.unrevealedNeighbors.map(([nx, ny]) => `${nx},${ny}`);
                        if (otherNeighbors.includes(coords) && otherConstraint.minesNeeded > 0) {
                            // Проверяем, является ли ячейка единственной общей
                            const commonCells = neighborCoords.filter(cell => otherNeighbors.includes(cell));
                            if (commonCells.length === 1 && commonCells[0] === coords && minesNeeded === 1 && otherConstraint.minesNeeded === 1) {
                                isCertainMine = true;
                                break;
                            }
                            overlappingConstraints++;
                        }
                    }
                    if (isCertainMine) break;
                    // Иначе рассчитываем вероятность
                    const probability = (minesNeeded / unrevealedNeighbors.length) * 100;
                    maxProbability = Math.max(maxProbability, probability * overlappingConstraints);
                }
            }

            if (isCertainMine) {
                probabilities.set(coords, 100);
            } else if (maxProbability > 0) {
                probabilities.set(coords, Math.min(maxProbability, 100));
            }
        }
    }

    // Отображаем вероятности
    probabilities.forEach((probability, coords) => {
        const [i, j] = coords.split(',').map(Number);
        const cell = boardElement.children[i * size + j];
        const probElement = document.createElement('span');
        probElement.classList.add('probability');
        probElement.textContent = Math.round(probability) + '%';
        cell.appendChild(probElement);
    });
}

function updateProbabilities() {
    if (showProbabilities) {
        calculateProbabilities();
    } else {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const cell = boardElement.children[i * size + j];
                const probElement = cell.querySelector('.probability');
                if (probElement) probElement.remove();
            }
        }
    }
}

function startTimer() {
    stopTimer();
    timerElement.parentElement.classList.add('running');
    timerInterval = setInterval(() => {
        seconds++;
        timerElement.textContent = formatTime(seconds);
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerElement.parentElement.classList.remove('running');
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60).toString().padStart(2, '0');
    const sec = (seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

function updateDisplay() {
    minesLeftElement.textContent = mines - flags;
    timerElement.textContent = formatTime(seconds);
    sizeInputField.value = sizeInput.value;
    minesInputField.value = minesInput.value;
}

seedRandomInput.addEventListener('input', () => {
    seedRandomInput.value = seedRandomInput.value.replace(/\D/g, '').slice(0, 6);
});

generateSeedButton.addEventListener('click', generateSeed);

toggleSidebarButton.addEventListener('click', () => {
    leftPanel.classList.toggle('collapsed');
});

toggleInfoSidebarButton.addEventListener('click', () => {
    rightInfoPanel.classList.toggle('collapsed');
});

toggleProbabilitiesButton.addEventListener('click', () => {
    showProbabilities = !showProbabilities;
    toggleProbabilitiesButton.classList.toggle('active', showProbabilities);
    updateProbabilities();
});

newGameButton.addEventListener('click', initGame);

initGame();