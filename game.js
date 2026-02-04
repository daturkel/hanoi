// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    MIN_DISKS: 3,
    MAX_DISKS: 10,
    DEFAULT_DISKS: 5,
    STORAGE_KEYS: {
        HIGH_SCORES: 'hanoi_highscores',
        SCORES_VISIBLE: 'hanoi_scores_visible',
        THEME: 'hanoi_theme',
        DISK_COUNT: 'hanoi_disk_count'
    }
};

// ============================================
// THEMES
// ============================================

const THEMES = {
    green: {
        colors: {
            bg: '#0a0a0a',
            text: '#00ff00',
            glow: '#00ff00',
            error: '#ff0000',
            win: '#ffff00',
            perfect: '#00ffff',
            bgTint: 'rgba(0, 255, 0, 0.02)'
        },
        ascii: 'classic'
    },
    amber: {
        colors: {
            bg: '#0a0a0a',
            text: '#ffb000',
            glow: '#ffb000',
            error: '#ff4444',
            win: '#ffffff',
            perfect: '#ffd700',
            bgTint: 'rgba(255, 176, 0, 0.02)'
        },
        ascii: 'classic'
    },
    blue: {
        colors: {
            bg: '#0a0a0a',
            text: '#00bfff',
            glow: '#00bfff',
            error: '#ff6b6b',
            win: '#ffd700',
            perfect: '#ff69b4',
            bgTint: 'rgba(0, 191, 255, 0.02)'
        },
        ascii: 'classic'
    },
    minimal: {
        colors: {
            bg: '#1a1a1a',
            text: '#e0e0e0',
            glow: '#888888',
            error: '#e74c3c',
            win: '#f1c40f',
            perfect: '#3498db',
            bgTint: 'rgba(224, 224, 224, 0.02)'
        },
        ascii: 'simple'
    }
};

const THEME_ORDER = ['green', 'amber', 'blue', 'minimal'];

// ============================================
// ASCII CHARACTER SETS
// ============================================

const ASCII_SETS = {
    classic: {
        pole: '|',
        diskLeft: '[',
        diskRight: ']',
        diskFill: '=',
        base: '=',
        table: {
            topLeft: '┌', topRight: '┐', bottomLeft: '└', bottomRight: '┘',
            horizontal: '─', vertical: '│',
            tLeft: '├', tRight: '┤', tTop: '┬', tBottom: '┴',
            cross: '┼'
        }
    },
    simple: {
        pole: '|',
        diskLeft: '<',
        diskRight: '>',
        diskFill: '#',
        base: '-',
        table: {
            topLeft: '+', topRight: '+', bottomLeft: '+', bottomRight: '+',
            horizontal: '-', vertical: '|',
            tLeft: '+', tRight: '+', tTop: '+', tBottom: '+',
            cross: '+'
        }
    }
};

// ============================================
// STATE
// ============================================

let gameState = {
    towers: [[], [], []],
    selectedTower: null,
    moveCount: 0,
    startTime: null,
    timerInterval: null,
    diskCount: CONFIG.DEFAULT_DISKS,
    gameWon: false
};

let selectedDiskCount = CONFIG.DEFAULT_DISKS;
let currentTheme = 'green';
let currentAsciiSet = ASCII_SETS.classic;

// ============================================
// STORAGE FUNCTIONS
// ============================================

function loadHighScores() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.HIGH_SCORES);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.warn('Could not load high scores:', e);
        return {};
    }
}

function saveHighScores(scores) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores));
    } catch (e) {
        console.warn('Could not save high scores:', e);
    }
}

function exportHighScores() {
    const scores = loadHighScores();

    if (Object.keys(scores).length === 0) {
        showMessage('No high scores to export');
        return;
    }

    const exportData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        scores: scores
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `hanoi-scores-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage('High scores exported');
}

function importHighScores() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const importedScores = validateAndExtractScores(data);

                if (!importedScores) {
                    showError('Invalid file format');
                    return;
                }

                mergeHighScores(importedScores);
                showMessage('High scores imported and merged');
            } catch (error) {
                showError('Could not read file: ' + error.message);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

function validateAndExtractScores(data) {
    let scores;

    // Handle wrapped format: { version: 1, scores: {...} }
    if (data.version && data.scores) {
        scores = data.scores;
    }
    // Handle raw format: { "5": { moves: 31, time: 120 }, ... }
    else if (typeof data === 'object' && !Array.isArray(data)) {
        scores = data;
    } else {
        return null;
    }

    // Validate each entry
    for (const [key, value] of Object.entries(scores)) {
        const diskCount = parseInt(key);

        // Validate disk count is in valid range
        if (isNaN(diskCount) || diskCount < CONFIG.MIN_DISKS || diskCount > CONFIG.MAX_DISKS) {
            return null;
        }

        // Validate score object has required fields
        if (typeof value !== 'object' ||
            typeof value.moves !== 'number' ||
            typeof value.time !== 'number') {
            return null;
        }

        // Validate moves is at least minimum possible
        const minMoves = getMinimalMoves(diskCount);
        if (value.moves < minMoves) {
            return null;
        }

        // Validate time is positive
        if (value.time < 0) {
            return null;
        }
    }

    return scores;
}

function mergeHighScores(importedScores) {
    const currentScores = loadHighScores();

    for (const [diskCount, importedScore] of Object.entries(importedScores)) {
        const current = currentScores[diskCount];

        if (!current) {
            // No existing score for this disk count
            currentScores[diskCount] = importedScore;
            // Add timestamp if missing
            if (!currentScores[diskCount].timestamp) {
                currentScores[diskCount].timestamp = Date.now();
            }
        } else {
            // Keep better score (fewer moves wins, time is tiebreaker)
            if (importedScore.moves < current.moves ||
                (importedScore.moves === current.moves && importedScore.time < current.time)) {
                currentScores[diskCount] = importedScore;
                if (!currentScores[diskCount].timestamp) {
                    currentScores[diskCount].timestamp = Date.now();
                }
            }
        }
    }

    saveHighScores(currentScores);
    renderHighScores();
}

// ============================================
// GLOBAL LEADERBOARD (FIREBASE)
// ============================================

const LEADERBOARD_SIZE = 10;

async function fetchGlobalLeaderboard(diskCount) {
    if (!window.firebaseDb) {
        console.warn('Firebase not initialized');
        return [];
    }

    try {
        const dbRef = window.firebaseRef(window.firebaseDb, `leaderboard/${diskCount}`);
        const snapshot = await window.firebaseGet(dbRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            // Convert object to array and sort
            const scores = Object.values(data);
            scores.sort((a, b) => {
                if (a.moves !== b.moves) return a.moves - b.moves;
                return a.time - b.time;
            });
            return scores.slice(0, LEADERBOARD_SIZE);
        }
        return [];
    } catch (e) {
        console.error('Error fetching leaderboard:', e);
        return [];
    }
}

function sanitizeName(name) {
    // Only allow alphanumeric characters, convert to uppercase, max 3 chars
    return name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 3);
}

function validateLeaderboardSubmission(diskCount, moves, time) {
    // Validate disk count is in valid range
    if (!Number.isInteger(diskCount) || diskCount < CONFIG.MIN_DISKS || diskCount > CONFIG.MAX_DISKS) {
        return { valid: false, reason: 'Invalid disk count' };
    }

    // Validate moves is at least the minimum possible
    const minMoves = getMinimalMoves(diskCount);
    if (!Number.isInteger(moves) || moves < minMoves) {
        return { valid: false, reason: 'Invalid move count' };
    }

    // Validate time is a positive integer (reasonable upper bound: 24 hours)
    if (!Number.isInteger(time) || time < 0 || time > 86400) {
        return { valid: false, reason: 'Invalid time' };
    }

    return { valid: true };
}

async function checkLeaderboardQualification(diskCount, moves, time) {
    // Validate inputs before checking qualification
    const validation = validateLeaderboardSubmission(diskCount, moves, time);
    if (!validation.valid) {
        return { qualifies: false, rank: null };
    }

    const leaderboard = await fetchGlobalLeaderboard(diskCount);

    if (leaderboard.length < LEADERBOARD_SIZE) {
        return { qualifies: true, rank: leaderboard.length + 1 };
    }

    // Check if better than worst score
    const worst = leaderboard[leaderboard.length - 1];
    if (moves < worst.moves || (moves === worst.moves && time < worst.time)) {
        // Find actual rank
        let rank = 1;
        for (const score of leaderboard) {
            if (moves < score.moves || (moves === score.moves && time < score.time)) {
                break;
            }
            rank++;
        }
        return { qualifies: true, rank };
    }

    return { qualifies: false, rank: null };
}

async function submitToLeaderboard(diskCount, name, moves, time) {
    if (!window.firebaseDb) {
        console.warn('Firebase not initialized');
        return false;
    }

    // Validate inputs
    const validation = validateLeaderboardSubmission(diskCount, moves, time);
    if (!validation.valid) {
        console.warn('Leaderboard submission rejected:', validation.reason);
        return false;
    }

    // Sanitize name
    const sanitizedName = sanitizeName(name);
    if (sanitizedName.length === 0) {
        console.warn('Leaderboard submission rejected: Empty name after sanitization');
        return false;
    }

    try {
        // Fetch current leaderboard
        const leaderboard = await fetchGlobalLeaderboard(diskCount);

        // Add new score
        const newScore = {
            name: sanitizedName,
            moves,
            time,
            timestamp: Date.now()
        };

        leaderboard.push(newScore);

        // Sort and trim to top 10
        leaderboard.sort((a, b) => {
            if (a.moves !== b.moves) return a.moves - b.moves;
            return a.time - b.time;
        });

        const trimmed = leaderboard.slice(0, LEADERBOARD_SIZE);

        // Save back to Firebase
        const dbRef = window.firebaseRef(window.firebaseDb, `leaderboard/${diskCount}`);
        await window.firebaseSet(dbRef, trimmed);

        return true;
    } catch (e) {
        console.error('Error submitting to leaderboard:', e);
        return false;
    }
}

async function renderGlobalLeaderboard() {
    const container = document.getElementById('globalLeaderboard');
    const diskCountLabel = document.getElementById('globalDiskCount');
    if (!container) return;

    const diskCount = gameState.diskCount || CONFIG.DEFAULT_DISKS;
    if (diskCountLabel) {
        diskCountLabel.textContent = diskCount;
    }

    const t = currentAsciiSet.table;
    const scores = await fetchGlobalLeaderboard(diskCount);

    const lines = [];

    // Header
    lines.push(`${t.topLeft}${t.horizontal.repeat(3)}${t.tTop}${t.horizontal.repeat(6)}${t.tTop}${t.horizontal.repeat(7)}${t.tTop}${t.horizontal.repeat(7)}${t.topRight}`);
    lines.push(`${t.vertical} # ${t.vertical} NAME ${t.vertical} MOVES ${t.vertical} SPEED ${t.vertical}`);
    lines.push(`${t.tLeft}${t.horizontal.repeat(3)}${t.cross}${t.horizontal.repeat(6)}${t.cross}${t.horizontal.repeat(7)}${t.cross}${t.horizontal.repeat(7)}${t.tRight}`);

    // Rows
    if (scores.length === 0) {
        lines.push(`${t.vertical}   ${t.vertical}      ${t.vertical}   -   ${t.vertical}   -   ${t.vertical}`);
    } else {
        for (let i = 0; i < scores.length; i++) {
            const score = scores[i];
            const rank = String(i + 1).padStart(2, ' ');
            const name = ' ' + score.name.padEnd(4, ' ');
            const moves = centerText(String(score.moves), 7);
            const time = centerText(formatTime(score.time), 7);
            lines.push(`${t.vertical}${rank} ${t.vertical}${name} ${t.vertical}${moves}${t.vertical}${time}${t.vertical}`);
        }
    }

    // Fill empty rows
    for (let i = scores.length; i < LEADERBOARD_SIZE && scores.length > 0; i++) {
        lines.push(`${t.vertical}   ${t.vertical}      ${t.vertical}   -   ${t.vertical}   -   ${t.vertical}`);
    }

    // Footer
    lines.push(`${t.bottomLeft}${t.horizontal.repeat(3)}${t.tBottom}${t.horizontal.repeat(6)}${t.tBottom}${t.horizontal.repeat(7)}${t.tBottom}${t.horizontal.repeat(7)}${t.bottomRight}`);

    container.innerHTML = lines.join('\n');
}

function showNameModal(diskCount, moves, time) {
    const modal = document.getElementById('nameModal');
    const input = document.getElementById('nameInput');
    const submitBtn = document.getElementById('submitNameBtn');

    modal.classList.remove('hidden');
    input.value = '';
    input.focus();

    const handleSubmit = async () => {
        const name = input.value.trim();
        if (name.length === 0) {
            input.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const success = await submitToLeaderboard(diskCount, name, moves, time);

        modal.classList.add('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';

        if (success) {
            await renderGlobalLeaderboard();
        }

        // Clean up listeners
        submitBtn.removeEventListener('click', handleSubmit);
        input.removeEventListener('keypress', handleKeySubmit);
    };

    const handleKeySubmit = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    submitBtn.addEventListener('click', handleSubmit);
    input.addEventListener('keypress', handleKeySubmit);
}

// ============================================
// THEME FUNCTIONS
// ============================================

function applyTheme(themeId, save = true) {
    const theme = THEMES[themeId];
    if (!theme) return;

    currentTheme = themeId;
    currentAsciiSet = ASCII_SETS[theme.ascii];

    // Apply CSS variables
    const root = document.documentElement;
    root.style.setProperty('--bg-color', theme.colors.bg);
    root.style.setProperty('--text-color', theme.colors.text);
    root.style.setProperty('--text-glow', theme.colors.glow);
    root.style.setProperty('--error-color', theme.colors.error);
    root.style.setProperty('--win-color', theme.colors.win);
    root.style.setProperty('--perfect-color', theme.colors.perfect);
    root.style.setProperty('--bg-tint', theme.colors.bgTint);

    // Update theme selector if it exists
    const themeSelect = document.getElementById('themeSelect');
    if (themeSelect) {
        if (themeSelect.value !== themeId) {
            themeSelect.value = themeId;
        }
        // Update dropdown arrow color
        const arrowColor = encodeURIComponent(theme.colors.text);
        themeSelect.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='${arrowColor}' d='M2 4l4 4 4-4'/%3E%3C/svg%3E")`;
    }

    // Save preference
    if (save) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.THEME, themeId);
        } catch (e) {
            console.warn('Could not save theme preference:', e);
        }
    }

    // Re-render with new ASCII characters
    renderGame();
    renderHighScores();
    renderGlobalLeaderboard();
}

function cycleTheme() {
    const currentIndex = THEME_ORDER.indexOf(currentTheme);
    const nextIndex = (currentIndex + 1) % THEME_ORDER.length;
    applyTheme(THEME_ORDER[nextIndex]);
}

function loadSavedTheme() {
    try {
        const savedTheme = localStorage.getItem(CONFIG.STORAGE_KEYS.THEME);
        if (savedTheme && THEMES[savedTheme]) {
            applyTheme(savedTheme, false);
        }
    } catch (e) {
        console.warn('Could not load theme preference:', e);
    }
}

// ============================================
// HIGH SCORE FUNCTIONS
// ============================================

function getMinimalMoves(diskCount) {
    return Math.pow(2, diskCount) - 1;
}

function formatTime(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function centerText(text, width) {
    const str = String(text);
    const pad = width - str.length;
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + str + ' '.repeat(right);
}

function rightPadText(text, width) {
    const str = String(text);
    return ' '.repeat(width - str.length - 2) + str + '  ';
}

function checkAndSaveHighScore(diskCount, moves, timeSeconds) {
    const scores = loadHighScores();
    const key = String(diskCount);
    const minMoves = getMinimalMoves(diskCount);
    const isPerfect = moves === minMoves;

    let recordType = 'none';

    if (!scores[key]) {
        scores[key] = { moves: moves, time: timeSeconds, timestamp: Date.now() };
        recordType = isPerfect ? 'perfect' : 'first';
    } else {
        if (moves < scores[key].moves) {
            scores[key].moves = moves;
            scores[key].time = timeSeconds;
            scores[key].timestamp = Date.now();
            recordType = isPerfect ? 'perfect' : 'moves';
        }
        else if (moves === scores[key].moves && timeSeconds < scores[key].time) {
            scores[key].time = timeSeconds;
            scores[key].timestamp = Date.now();
            recordType = 'time';
        }
    }

    if (recordType !== 'none') {
        saveHighScores(scores);
        renderHighScores();
    }

    return { type: recordType, isPerfect: isPerfect };
}

function renderHighScores() {
    const scores = loadHighScores();
    const container = document.getElementById('highScoreBoard');

    if (!container) return;

    const t = currentAsciiSet.table;
    const lines = [];

    // Header
    lines.push(`${t.topLeft}${t.horizontal.repeat(7)}${t.tTop}${t.horizontal.repeat(9)}${t.tTop}${t.horizontal.repeat(9)}${t.topRight}`);
    lines.push(`${t.vertical} DISKS ${t.vertical}  MOVES  ${t.vertical}  SPEED  ${t.vertical}`);
    lines.push(`${t.tLeft}${t.horizontal.repeat(7)}${t.cross}${t.horizontal.repeat(9)}${t.cross}${t.horizontal.repeat(9)}${t.tRight}`);

    // Rows for disk counts 3-10
    for (let diskCount = CONFIG.MIN_DISKS; diskCount <= CONFIG.MAX_DISKS; diskCount++) {
        const minMoves = getMinimalMoves(diskCount);
        const score = scores[String(diskCount)];

        let bestMoves = '-';
        let bestTime = '-';
        let rowClass = '';

        if (score) {
            bestMoves = String(score.moves);
            bestTime = formatTime(score.time);

            if (score.moves === minMoves) {
                rowClass = 'perfect-score';
            }
        }

        let movesDisplay = bestMoves;
        if (score) {
            movesDisplay = score.moves === minMoves ? bestMoves + '*' : bestMoves + ' ';
        }

        const movesCol = score ? rightPadText(movesDisplay, 9) : centerText(movesDisplay, 9);
        const timeCol = centerText(bestTime, 9);
        let row = `${t.vertical}${centerText(diskCount, 7)}${t.vertical}${movesCol}${t.vertical}${timeCol}${t.vertical}`;

        if (rowClass) {
            row = `<span class="${rowClass}">${row}</span>`;
        }

        lines.push(row);
    }

    // Footer
    lines.push(`${t.bottomLeft}${t.horizontal.repeat(7)}${t.tBottom}${t.horizontal.repeat(9)}${t.tBottom}${t.horizontal.repeat(9)}${t.bottomRight}`);
    lines.push('                  * = perfect');

    container.innerHTML = lines.join('\n');
}

function clearHighScores() {
    if (confirm('Clear all high scores? This cannot be undone.')) {
        try {
            localStorage.removeItem(CONFIG.STORAGE_KEYS.HIGH_SCORES);
            renderHighScores();
            showMessage('High scores cleared');
        } catch (e) {
            console.warn('Could not clear high scores:', e);
        }
    }
}

function toggleHighScores() {
    const container = document.querySelector('.leaderboards-container');
    const btn = document.getElementById('toggleScoresBtn');

    if (!container || !btn) return;

    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.SCORES_VISIBLE, 'true');
        } catch (e) {
            console.warn('Could not save visibility state:', e);
        }
    } else {
        container.classList.add('hidden');
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.SCORES_VISIBLE, 'false');
        } catch (e) {
            console.warn('Could not save visibility state:', e);
        }
    }
}

function initHighScoreVisibility() {
    const container = document.querySelector('.leaderboards-container');
    const btn = document.getElementById('toggleScoresBtn');

    if (!container || !btn) return;

    try {
        const visible = localStorage.getItem(CONFIG.STORAGE_KEYS.SCORES_VISIBLE);
        if (visible === 'false') {
            container.classList.add('hidden');
        }
    } catch (e) {
        console.warn('Could not load visibility state:', e);
    }
}

// ============================================
// GAME LOGIC
// ============================================

function initGame(numDisks, syncSelectedCount = true) {
    numDisks = Math.max(CONFIG.MIN_DISKS, Math.min(CONFIG.MAX_DISKS, numDisks));

    gameState.towers = [[], [], []];
    gameState.selectedTower = null;
    gameState.moveCount = 0;
    gameState.startTime = null;
    gameState.gameWon = false;
    gameState.diskCount = numDisks;

    if (syncSelectedCount) {
        selectedDiskCount = numDisks;
        updateDiskCountDisplay();
    }

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    for (let i = numDisks; i >= 1; i--) {
        gameState.towers[0].push(i);
    }

    renderGame();
    updateMoveCounter();
    updateTimer();
    showMessage('Press 1/F, 2/J, or 3/K to select a tower');
    renderGlobalLeaderboard();
}

function renderGame() {
    const maxHeight = gameState.diskCount + 3;
    const ascii = currentAsciiSet;

    for (let i = 0; i < 3; i++) {
        const towerElement = document.querySelector(`[data-tower="${i}"]`);
        const asciiContainer = towerElement.querySelector('.ascii-tower');

        const lines = [];
        const disks = gameState.towers[i];

        const emptyLines = maxHeight - disks.length - 1;
        const halfWidth = gameState.diskCount + 1;

        for (let j = 0; j < emptyLines; j++) {
            lines.push(' '.repeat(halfWidth) + ascii.pole + ' '.repeat(halfWidth));
        }

        for (let j = disks.length - 1; j >= 0; j--) {
            const diskSize = disks[j];
            const inner = ascii.diskFill.repeat(diskSize * 2 - 1);
            const diskString = ascii.diskLeft + inner + ascii.diskRight;
            const padding = ' '.repeat(halfWidth - diskSize);
            lines.push(padding + diskString + padding);
        }

        const baseChars = ascii.base.repeat(halfWidth * 2 + 1);
        lines.push(baseChars);

        asciiContainer.textContent = lines.join('\n');

        if (gameState.selectedTower === i) {
            towerElement.classList.add('selected');
        } else {
            towerElement.classList.remove('selected');
        }
    }
}

function handleKeyPress(event) {
    const key = event.key;

    // Handle new game key
    if (key === 'n' || key === 'N') {
        startNewGame();
        return;
    }

    // Handle disk count increment/decrement
    if (key === '+' || key === '=') {
        incrementDiskCount();
        return;
    }
    if (key === '-' || key === '_') {
        decrementDiskCount();
        return;
    }

    // Handle high score toggle
    if (key === 'h' || key === 'H') {
        toggleHighScores();
        return;
    }

    // Handle theme cycling
    if (key === 't' || key === 'T') {
        cycleTheme();
        return;
    }

    // Ignore other input if game is won
    if (gameState.gameWon) return;

    // Map keys to tower indices (1-2-3 and F-J-K)
    const towerMap = {
        '1': 0, '2': 1, '3': 2,
        'f': 0, 'j': 1, 'k': 2,
        'F': 0, 'J': 1, 'K': 2
    };

    if (!(key in towerMap)) return;

    const towerIndex = towerMap[key];

    // First selection - choose source tower
    if (gameState.selectedTower === null) {
        if (gameState.towers[towerIndex].length === 0) {
            showError("Can't select an empty tower");
            return;
        }

        // Start timer on first tower selection
        if (!gameState.startTime) {
            startTimer();
        }

        gameState.selectedTower = towerIndex;
        renderGame();
        showMessage(`Tower ${towerIndex + 1} selected. Choose destination tower.`);
    }
    // Second selection - choose destination tower
    else {
        const fromTower = gameState.selectedTower;
        const toTower = towerIndex;

        gameState.selectedTower = null;

        if (fromTower === toTower) {
            renderGame();
            showMessage('Press 1/F, 2/J, or 3/K to select a tower');
            return;
        }

        if (isValidMove(fromTower, toTower)) {
            moveDisk(fromTower, toTower);
        } else {
            renderGame();
        }
    }
}

function clearSelection() {
    gameState.selectedTower = null;
    renderGame();
}

function isValidMove(fromTower, toTower) {
    const fromDisks = gameState.towers[fromTower];
    const toDisks = gameState.towers[toTower];

    if (fromDisks.length === 0) {
        showError("Source tower is empty");
        return false;
    }

    const diskToMove = fromDisks[fromDisks.length - 1];

    if (toDisks.length === 0) {
        return true;
    }

    const topDiskOnDestination = toDisks[toDisks.length - 1];

    if (diskToMove > topDiskOnDestination) {
        showError("Cannot place larger disk on smaller disk");
        return false;
    }

    return true;
}

function moveDisk(fromTower, toTower) {
    const disk = gameState.towers[fromTower].pop();
    gameState.towers[toTower].push(disk);

    gameState.moveCount++;
    updateMoveCounter();

    renderGame();

    if (checkWin()) {
        handleWin();
    } else {
        showMessage('Press 1/F, 2/J, or 3/K to select a tower');
    }
}

function checkWin() {
    return gameState.towers[2].length === gameState.diskCount;
}

async function handleWin() {
    gameState.gameWon = true;

    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }

    const elapsedSeconds = Math.floor((Date.now() - gameState.startTime) / 1000);
    const result = checkAndSaveHighScore(gameState.diskCount, gameState.moveCount, elapsedSeconds);

    let message = `YOU WIN! Time: ${formatTime(elapsedSeconds)} | Moves: ${gameState.moveCount}`;
    let messageClass = 'win';

    if (result.type === 'perfect') {
        message += ' | PERFECT SCORE!';
        messageClass = 'perfect';
    } else if (result.type === 'moves') {
        message += ' | NEW RECORD!';
        messageClass = 'record';
    } else if (result.type === 'time') {
        message += ' | FASTER TIME!';
        messageClass = 'record';
    } else if (result.type === 'first') {
        message += ' | FIRST COMPLETION!';
        messageClass = 'record';
    } else if (result.isPerfect) {
        message += ' | PERFECT SCORE!';
        messageClass = 'perfect';
    }

    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${messageClass}`;

    // Check global leaderboard qualification
    const qualification = await checkLeaderboardQualification(
        gameState.diskCount,
        gameState.moveCount,
        elapsedSeconds
    );

    if (qualification.qualifies) {
        showNameModal(gameState.diskCount, gameState.moveCount, elapsedSeconds);
    }
}

// ============================================
// TIMER FUNCTIONS
// ============================================

function startTimer() {
    gameState.startTime = Date.now();
    gameState.timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedSeconds = gameState.startTime
        ? Math.floor((Date.now() - gameState.startTime) / 1000)
        : 0;
    document.getElementById('timer').textContent = `TIME: ${formatTime(elapsedSeconds)}`;
}

function updateMoveCounter() {
    document.getElementById('moveCounter').textContent = `MOVES: ${gameState.moveCount}`;
}

// ============================================
// UI FEEDBACK
// ============================================

function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message';
}

function showError(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message error';
}

// ============================================
// DISK COUNT CONTROLS
// ============================================

function incrementDiskCount() {
    if (selectedDiskCount < CONFIG.MAX_DISKS) {
        selectedDiskCount++;
        updateDiskCountDisplay();
        saveDiskCount();
    }
}

function decrementDiskCount() {
    if (selectedDiskCount > CONFIG.MIN_DISKS) {
        selectedDiskCount--;
        updateDiskCountDisplay();
        saveDiskCount();
    }
}

function updateDiskCountDisplay() {
    document.getElementById('diskCountDisplay').textContent = selectedDiskCount;
}

function saveDiskCount() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.DISK_COUNT, selectedDiskCount.toString());
    } catch (e) {
        console.warn('Could not save disk count:', e);
    }
}

function loadSavedDiskCount() {
    try {
        const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.DISK_COUNT);
        if (saved) {
            const count = parseInt(saved, 10);
            if (count >= CONFIG.MIN_DISKS && count <= CONFIG.MAX_DISKS) {
                return count;
            }
        }
    } catch (e) {
        console.warn('Could not load disk count:', e);
    }
    return CONFIG.DEFAULT_DISKS;
}

function startNewGame() {
    initGame(selectedDiskCount, true);
}

// ============================================
// INITIALIZATION
// ============================================

function handleKeyDown(event) {
    // Handle Escape key to deselect tower
    if (event.key === 'Escape' && gameState.selectedTower !== null) {
        clearSelection();
        showMessage('Press 1/F, 2/J, or 3/K to select a tower');
    }
}

function init() {
    // Event listeners
    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('keydown', handleKeyDown);
    document.getElementById('newGameBtn').addEventListener('click', startNewGame);
    document.getElementById('incrementBtn').addEventListener('click', incrementDiskCount);
    document.getElementById('decrementBtn').addEventListener('click', decrementDiskCount);
    document.getElementById('toggleScoresBtn').addEventListener('click', toggleHighScores);
    document.getElementById('clearScoresBtn').addEventListener('click', clearHighScores);
    document.getElementById('exportScoresBtn').addEventListener('click', exportHighScores);
    document.getElementById('importScoresBtn').addEventListener('click', importHighScores);
    document.getElementById('themeSelect').addEventListener('change', (e) => applyTheme(e.target.value));

    // Initialize theme first (before rendering)
    loadSavedTheme();

    // Load saved disk count
    const savedDiskCount = loadSavedDiskCount();
    selectedDiskCount = savedDiskCount;
    updateDiskCountDisplay();

    // Initialize game
    initGame(savedDiskCount);
    renderHighScores();
    initHighScoreVisibility();
}

document.addEventListener('DOMContentLoaded', init);
