# High Score Board for Towers of Hanoi

## Overview
Add a locally cached high score board that tracks best times and best move counts for each difficulty level (3-10 disks). Display minimal possible moves for reference and show personal bests using localStorage persistence.

## Critical Files
- **index.html** - Add high score display section, localStorage functions, and score tracking logic

## Current State Analysis
- Game tracks `moveCount` and timer (elapsed seconds)
- Win detection happens in `handleWin()` (lines 442-457)
- No localStorage currently implemented
- Clean terminal aesthetic with ASCII art towers
- Single-file implementation makes this straightforward

## Feature Requirements

### 1. Data Storage (localStorage)

**Score Data Structure:**
```javascript
{
  "3": { moves: 7, time: 45, timestamp: 1234567890 },
  "4": { moves: 15, time: 120, timestamp: 1234567890 },
  // ... for each disk count 3-10
}
```

**Key Points:**
- Store in `localStorage` with key `hanoi_highscores`
- **Primary metric: move count** (closest to optimal 2^n - 1)
- Time is the time associated with that best move count score
- Only update if new move count is better (lower) OR same move count with better time
- Include timestamp for "when" the record was set
- Minimal moves formula: 2^n - 1 (e.g., 3 disks = 7 moves minimum)

### 2. UI Design

**High Score Board Placement:**
Place below the game controls, above instructions. Terminal-style table format:

```
┌────────────────────────────────────────────┐
│           HIGH SCORES                      │
├───────┬──────────┬──────────┬─────────────┤
│ DISKS │ MIN MOVES│ YOUR BEST│     TIME    │
├───────┼──────────┼──────────┼─────────────┤
│   3   │    7     │    7     │   00:15     │
│   4   │   15     │   18     │   00:45     │
│   5   │   31     │   --     │     --      │
│  ...  │   ...    │   ...    │    ...      │
└───────┴──────────┴──────────┴─────────────┘
```

**Scoring Logic:**
- **Primary metric**: Move count (lower is better)
- **Time displayed**: The time for achieving that best move count
- **Tiebreaker**: If you match your best move count, the time updates only if faster
- Example: If you complete 5 disks in 35 moves (2:30) then later do it in 35 moves (2:15), the time updates to 2:15

**Styling:**
- Use ASCII box-drawing characters (─│┌┐└┘├┤┬┴┼)
- Green terminal glow like rest of UI
- Monospace pre-formatted text
- Optional: highlight current disk count row
- Show "--" for levels not yet completed

**Toggle Button:**
- Add small button or keyboard shortcut ('H') to show/hide scores
- Default: visible, can collapse to save space

### 3. Core Functions

**New Functions to Add:**

```javascript
// Load scores from localStorage
function loadHighScores() {
  const stored = localStorage.getItem('hanoi_highscores');
  return stored ? JSON.parse(stored) : {};
}

// Save scores to localStorage
function saveHighScores(scores) {
  localStorage.setItem('hanoi_highscores', JSON.stringify(scores));
}

// Get minimal possible moves for disk count
function getMinimalMoves(diskCount) {
  return Math.pow(2, diskCount) - 1;
}

// Check if current game is a new record
// Returns: { type: 'none' | 'first' | 'moves' | 'time' | 'perfect', isPerfect: boolean }
function checkAndSaveHighScore(diskCount, moves, timeSeconds) {
  const scores = loadHighScores();
  const key = String(diskCount);
  const minMoves = getMinimalMoves(diskCount);
  const isPerfect = moves === minMoves;

  let recordType = 'none';

  if (!scores[key]) {
    // First completion for this disk count
    scores[key] = { moves: moves, time: timeSeconds, timestamp: Date.now() };
    recordType = 'first';
  } else {
    // Better move count (primary metric)
    if (moves < scores[key].moves) {
      scores[key].moves = moves;
      scores[key].time = timeSeconds;
      scores[key].timestamp = Date.now();
      recordType = 'moves';
    }
    // Same move count but better time (tiebreaker)
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

// Render high score board
function renderHighScores() {
  const scores = loadHighScores();
  const container = document.getElementById('highScoreBoard');

  // Generate ASCII table with all disk counts 3-10
  // Show minimal moves, best moves (or --), best time (or --)
  // Highlight if perfect score (bestMoves === minMoves)
}

// Clear all high scores (with confirmation)
function clearHighScores() {
  if (confirm('Clear all high scores? This cannot be undone.')) {
    localStorage.removeItem('hanoi_highscores');
    renderHighScores();
  }
}
```

### 4. Integration Points

**Modify `handleWin()` (line 442):**
- After displaying win message, call `checkAndSaveHighScore()`
- Show additional message based on result:
  - "NEW RECORD!" if move count improved (yellow glow)
  - "FASTER TIME!" if matched move count with better time (cyan glow)
  - "PERFECT SCORE!" if moves === minimal moves (bright cyan glow)
- Update high score display

**On Page Load:**
- Call `renderHighScores()` to display existing records

**New UI Elements:**
```html
<!-- Add after controls section, before instructions -->
<div class="high-score-section">
  <div class="high-score-header">
    <span>HIGH SCORES</span>
    <button id="toggleScoresBtn" class="small">Hide [H]</button>
    <button id="clearScoresBtn" class="small">Clear</button>
  </div>
  <pre id="highScoreBoard" class="high-score-board"></pre>
</div>
```

**Keyboard Shortcut:**
- 'H' key toggles high score visibility

### 5. Implementation Steps

1. **Add localStorage functions** (load, save, getMinimalMoves)
2. **Create renderHighScores()** to generate ASCII table
3. **Add HTML structure** for high score board
4. **Add CSS styling** matching terminal aesthetic
5. **Modify handleWin()** to check and save scores
6. **Add toggle/clear functionality**
7. **Add keyboard shortcut** for 'H' key
8. **Update instructions** to mention high scores
9. **Add tests** for localStorage operations and display

### 6. Edge Cases & Considerations

**Edge Cases:**
- First time user (no scores) - show "--" for all
- localStorage full/disabled - graceful fallback (don't crash)
- Invalid data in localStorage - clear and reset
- Multiple perfect scores - track most recent

**Visual Feedback:**
- Highlight new records with different color (yellow?)
- Show "PERFECT!" indicator if moves === minimal moves (2^n - 1)
- "NEW RECORD!" appears on better move count
- "FASTER TIME!" appears when matching move count with better time
- Optionally show timestamp for records ("Set 2 days ago")

**Data Management:**
- Consider adding export/import for sharing scores
- Could add optional "initials" or player name feature
- Keep data structure simple - just JSON object

## CSS Additions

```css
.high-score-section {
  margin: 20px 0;
  text-align: center;
}

.high-score-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
  font-size: 0.9em;
}

.high-score-board {
  display: inline-block;
  text-align: left;
  font-size: 0.75em;
  line-height: 1.3;
  text-shadow: 0 0 5px #00ff00;
  padding: 10px;
  background-color: rgba(0, 255, 0, 0.02);
  border-radius: 4px;
}

.high-score-board.hidden {
  display: none;
}

.record-highlight {
  color: #ffff00;
  text-shadow: 0 0 8px #ffff00;
}

.perfect-score {
  color: #00ffff;
  text-shadow: 0 0 8px #00ffff;
}
```

## Testing Strategy

### Manual Testing
1. **Initial state** - no scores, shows "--" for all levels
2. **Complete game** - verify score saved to localStorage
3. **Beat previous record** - verify update and "NEW RECORD!" message
4. **Perfect game** (minimal moves) - verify highlight
5. **Toggle visibility** - 'H' key and button work
6. **Clear scores** - confirmation dialog, all scores removed
7. **Multiple disk counts** - each tracked independently
8. **localStorage persistence** - refresh page, scores remain

### Playwright Tests
Add new test cases to `tests/hanoi.spec.js`:

```javascript
test('high scores persist in localStorage', async ({ page }) => {
  // Complete 3-disk game
  // Verify localStorage has score
  // Refresh page
  // Verify score still displayed
});

test('new record detection works', async ({ page }) => {
  // Set initial score
  // Beat it with better time/moves
  // Verify "NEW RECORD!" message
});

test('toggle high scores with H key', async ({ page }) => {
  // Press 'h'
  // Verify board hidden
  // Press 'h' again
  // Verify board visible
});
```

## Verification Plan

### End-to-End Verification
1. Open game in browser
2. Complete a 3-disk game (minimum 7 moves)
3. Verify high score appears in table
4. Refresh page - score should persist
5. Play again with better time - verify update
6. Toggle with 'H' key - verify show/hide
7. Complete games with different disk counts - verify all tracked separately
8. Clear scores - verify confirmation and removal
9. Check localStorage in browser DevTools - verify structure
10. Test with localStorage disabled - game should not crash

### Visual Verification
- ASCII table renders correctly with box-drawing characters
- Terminal aesthetic maintained (green glow, monospace)
- New records highlighted appropriately
- Perfect scores distinguished
- Table compact and readable

### Browser Compatibility
- Test localStorage in Chrome, Firefox, Safari
- Verify ASCII characters render correctly
- Test with localStorage disabled (private browsing)
