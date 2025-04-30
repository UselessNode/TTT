let board = [];
let mines = [];
let gameOver = false;
let timer;
let startTime;
let rows, cols, minesCount;

function startGame() {
    clearInterval(timer);
    const timerEl = document.getElementById('timer');
    timerEl.textContent = '0';
    timerEl.classList.remove('running');
    gameOver = false;
    board = [];
    mines = [];
    document.getElementById('board').innerHTML = '';
    
    rows = cols = parseInt(document.getElementById('size').value);
    minesCount = parseInt(document.getElementById('mines').value);
    
    if (isNaN(rows) || isNaN(minesCount) || rows < 5 || minesCount < 5) {
        alert('Неверные параметры!');
        return;
    }

    if (minesCount >= rows * cols - 1) {
        alert('Слишком много мин!');
        return;
    }

    createBoard();
    placeMines();
    calculateNumbers();
    renderBoard();
    updateMinesLeft();
}

function createBoard() {
    for (let i = 0; i < rows; i++) {
        board[i] = [];
        for (let j = 0; j < cols; j++) {
            board[i][j] = {
                mine: false,
                revealed: false,
                flagged: false,
                neighborMines: 0
            };
        }
    }
}

function placeMines() {
    let placed = 0;
    while (placed < minesCount) {
        const x = Math.floor(Math.random() * rows);
        const y = Math.floor(Math.random() * cols);
        
        if (!board[x][y].mine) {
            board[x][y].mine = true;
            mines.push([x, y]);
            placed++;
        }
    }
}

function calculateNumbers() {
    mines.forEach(([x, y]) => {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < rows && ny >= 0 && ny < cols) {
                    board[nx][ny].neighborMines++;
                }
            }
        }
    });
}

function renderBoard() {
    const boardEl = document.getElementById('board');
    boardEl.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;
    
    board.forEach((row, x) => {
        row.forEach((cell, y) => {
            const div = document.createElement('div');
            div.className = 'cell';
            div.dataset.x = x;
            div.dataset.y = y;
            
            div.addEventListener('click', handleClick);
            div.addEventListener('contextmenu', handleRightClick);
            
            boardEl.appendChild(div);
        });
    });
}

function handleClick(e) {
    if (gameOver) return;
    
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);
    const cell = board[x][y];
    
    if (cell.flagged || cell.revealed) return;

    if (!board.some(row => row.some(c => c.revealed))) {
        while (cell.mine) {
            resetMines();
            calculateNumbers();
            document.getElementById('board').innerHTML = '';
            renderBoard();
        }
        startTimer();
    }

    revealCell(x, y);
    checkWin();
}

function handleRightClick(e) {
    e.preventDefault();
    if (gameOver) return;
    
    const x = parseInt(e.target.dataset.x);
    const y = parseInt(e.target.dataset.y);
    const cell = board[x][y];
    
    if (!cell.revealed) {
        cell.flagged = !cell.flagged;
        e.target.textContent = cell.flagged ? '🚩' : '';
        updateMinesLeft();
        checkWin();
    }
}

function revealCell(x, y) {
    const cell = board[x][y];
    if (cell.revealed || cell.flagged) return;
    
    cell.revealed = true;
    const div = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    div.classList.add('revealed');
    
    if (cell.mine) {
        div.textContent = '💥';
        gameOver = true;
        clearInterval(timer);
        document.getElementById('timer').classList.remove('running');
        revealAllMines();
        showMessage('Игра окончена!');
        return;
    }

    if (cell.neighborMines > 0) {
        div.textContent = cell.neighborMines;
        div.classList.add(`number-${cell.neighborMines}`);
    } else {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < rows && ny >= 0 && ny < cols) {
                    if (!board[nx][ny].revealed) {
                        revealCell(nx, ny);
                    }
                }
            }
        }
    }
}

function revealAllMines() {
    mines.forEach(([x, y]) => {
        const div = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
        div.classList.add('mine');
        div.textContent = '💣';
    });
}

function checkWin() {
    const safeCellsOpened = board.every(row => 
        row.every(cell => 
            cell.mine || (!cell.mine && cell.revealed)
        )
    );
    
    if (safeCellsOpened) {
        board.forEach((row, x) => {
            row.forEach((cell, y) => {
                if (cell.mine && !cell.flagged) {
                    cell.flagged = true;
                    const div = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
                    div.textContent = '🚩';
                    div.classList.add('flagged');
                }
            });
        });
        
        gameOver = true;
        clearInterval(timer);
        document.getElementById('timer').classList.remove('running');
        showMessage('Победа! 🎉');
    }
}

function updateMinesLeft() {
    const flags = board.flat().filter(c => c.flagged).length;
    document.getElementById('mines-left').textContent = minesCount - flags;
}

function startTimer() {
    startTime = Date.now();
    const timerEl = document.getElementById('timer');
    timerEl.classList.add('running');
    timer = setInterval(() => {
        const time = Math.floor((Date.now() - startTime) / 1000);
        timerEl.textContent = time;
    }, 1000);
}

function resetMines() {
    mines = [];
    board.forEach(row => row.forEach(cell => cell.mine = false));
    placeMines();
}

function showMessage(text) {
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.background = '#333';
    modal.style.padding = '2rem';
    modal.style.borderRadius = '8px';
    modal.style.color = '#fff';
    modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
    modal.style.zIndex = '1000';
    modal.textContent = text;
    document.body.appendChild(modal);
    setTimeout(() => modal.remove(), 3000);
}

function toggleSidebar() {
    const leftPanel = document.getElementById('left-panel');
    leftPanel.classList.toggle('collapsed');
}

window.addEventListener('DOMContentLoaded', startGame);