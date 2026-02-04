const { test, expect } = require('@playwright/test');
const path = require('path');

// Helper function to get the file URL
const getFileUrl = () => {
  return 'file://' + path.resolve(__dirname, '../index.html');
};

test.describe('Towers of Hanoi Game', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(getFileUrl());
  });

  test('initial state loads correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle('Towers of Hanoi - Terminal Edition');

    // Check header is visible
    await expect(page.locator('h1')).toContainText('Towers of Hanoi');

    // Check timer shows 00:00
    await expect(page.locator('#timer')).toContainText('TIME: 00:00');

    // Check move counter shows 0
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 0');

    // Check Tower 1 has ASCII art content (disks rendered)
    const tower1Content = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1Content).toContain('[');
    expect(tower1Content).toContain(']');

    // Check Tower 2 and 3 have only pole and base (no disks)
    const tower2Content = await page.locator('[data-tower="1"] .ascii-tower').textContent();
    const tower3Content = await page.locator('[data-tower="2"] .ascii-tower').textContent();
    expect(tower2Content).toContain('|');
    expect(tower3Content).toContain('|');

    // Check initial message (now includes FJK keys)
    await expect(page.locator('#message')).toContainText('Press 1/F, 2/J, or 3/K to select a tower');
  });

  test('keyboard controls work correctly', async ({ page }) => {
    // Get initial tower content
    const tower1Before = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    const tower3Before = await page.locator('[data-tower="2"] .ascii-tower').textContent();

    // Press '1' to select Tower 1
    await page.keyboard.press('1');
    await expect(page.locator('#message')).toContainText('Tower 1 selected');

    // Verify Tower 1 has 'selected' class
    const tower1 = page.locator('[data-tower="0"]');
    await expect(tower1).toHaveClass(/selected/);

    // Press '3' to move disk to Tower 3
    await page.keyboard.press('3');

    // Verify disk moved - Tower 1 and Tower 3 content should have changed
    const tower1After = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    const tower3After = await page.locator('[data-tower="2"] .ascii-tower').textContent();
    expect(tower1After).not.toBe(tower1Before);
    expect(tower3After).not.toBe(tower3Before);

    // Verify move counter incremented
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 1');
  });

  test('invalid keys are ignored', async ({ page }) => {
    // Get initial state
    const initialContent = await page.locator('[data-tower="0"] .ascii-tower').textContent();

    // Press invalid keys (except 'r' which resets)
    await page.keyboard.press('4');
    await page.keyboard.press('a');
    await page.keyboard.press('0');

    // Verify game state unchanged
    const afterContent = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(afterContent).toBe(initialContent);
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 0');
  });

  test('cannot move from empty tower', async ({ page }) => {
    // Try to select empty Tower 2
    await page.keyboard.press('2');

    // Should show error message
    await expect(page.locator('#message')).toContainText("Can't select an empty tower");

    // Verify no selection
    const tower2 = page.locator('[data-tower="1"]');
    await expect(tower2).not.toHaveClass(/selected/);
  });

  test('cannot place larger disk on smaller disk', async ({ page }) => {
    // Move smallest disk from Tower 1 to Tower 3
    await page.keyboard.press('1');
    await page.keyboard.press('3');

    // Move second smallest disk from Tower 1 to Tower 2
    await page.keyboard.press('1');
    await page.keyboard.press('2');

    // Get state before invalid move
    const tower2Before = await page.locator('[data-tower="1"] .ascii-tower').textContent();
    const tower3Before = await page.locator('[data-tower="2"] .ascii-tower').textContent();

    // Try to move larger disk from Tower 2 to Tower 3 (should fail)
    await page.keyboard.press('2');
    await page.keyboard.press('3');

    // Should show error message
    await expect(page.locator('#message')).toContainText('Cannot place larger disk on smaller disk');

    // Verify disks didn't move
    const tower2After = await page.locator('[data-tower="1"] .ascii-tower').textContent();
    const tower3After = await page.locator('[data-tower="2"] .ascii-tower').textContent();
    expect(tower2After).toBe(tower2Before);
    expect(tower3After).toBe(tower3Before);
  });

  test('timer starts on first tower selection and updates', async ({ page }) => {
    // Timer should be at 00:00
    await expect(page.locator('#timer')).toContainText('TIME: 00:00');

    // Select first tower (timer starts here)
    await page.keyboard.press('1');

    // Wait 2 seconds
    await page.waitForTimeout(2000);

    // Timer should have updated (even before completing a move)
    const timerText = await page.locator('#timer').textContent();
    expect(timerText).toMatch(/TIME: 00:0[1-3]/);
  });

  test('move counter increments correctly', async ({ page }) => {
    // Initial state
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 0');

    // Make first move
    await page.keyboard.press('1');
    await page.keyboard.press('3');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 1');

    // Make second move
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 2');

    // Make third move
    await page.keyboard.press('3');
    await page.keyboard.press('2');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 3');
  });

  test('win condition detected for 3-disk game', async ({ page }) => {
    // Start a new game with 3 disks using decrement button
    await page.locator('#decrementBtn').click();
    await page.locator('#decrementBtn').click();
    await page.locator('#newGameBtn').click();

    // Solve the 3-disk puzzle (7 moves)
    // Move 1: Tower 1 -> Tower 3
    await page.keyboard.press('1');
    await page.keyboard.press('3');

    // Move 2: Tower 1 -> Tower 2
    await page.keyboard.press('1');
    await page.keyboard.press('2');

    // Move 3: Tower 3 -> Tower 2
    await page.keyboard.press('3');
    await page.keyboard.press('2');

    // Move 4: Tower 1 -> Tower 3
    await page.keyboard.press('1');
    await page.keyboard.press('3');

    // Move 5: Tower 2 -> Tower 1
    await page.keyboard.press('2');
    await page.keyboard.press('1');

    // Move 6: Tower 2 -> Tower 3
    await page.keyboard.press('2');
    await page.keyboard.press('3');

    // Move 7: Tower 1 -> Tower 3
    await page.keyboard.press('1');
    await page.keyboard.press('3');

    // Check win message appears
    await expect(page.locator('#message')).toContainText('YOU WIN!');
    await expect(page.locator('#message')).toContainText('Time:');
    await expect(page.locator('#message')).toContainText('Moves: 7');
  });

  test('new game button restarts game', async ({ page }) => {
    // Get initial state
    const tower1Initial = await page.locator('[data-tower="0"] .ascii-tower').textContent();

    // Make a few moves
    await page.keyboard.press('1');
    await page.keyboard.press('3');
    await page.keyboard.press('1');
    await page.keyboard.press('2');

    // Verify state changed
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 2');

    // Click new game
    await page.locator('#newGameBtn').click();

    // Verify game restarted
    await expect(page.locator('#timer')).toContainText('TIME: 00:00');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 0');

    const tower1After = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1After).toBe(tower1Initial);
  });

  test('new game with different disk count works', async ({ page }) => {
    // Get initial 5-disk state
    const tower1Initial = await page.locator('[data-tower="0"] .ascii-tower').textContent();

    // Change disk count to 3 using decrement button
    await page.locator('#decrementBtn').click();
    await page.locator('#decrementBtn').click();
    await page.locator('#newGameBtn').click();

    // Verify 3-disk game (content should be different)
    const tower1With3 = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1With3).not.toBe(tower1Initial);

    // Change disk count to 8 using increment button
    for (let i = 0; i < 5; i++) {
      await page.locator('#incrementBtn').click();
    }
    await page.locator('#newGameBtn').click();

    // Verify 8-disk game (content should be different from 3-disk)
    const tower1With8 = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1With8).not.toBe(tower1With3);
  });

  test('disk selection highlights tower visually', async ({ page }) => {
    // No tower selected initially
    const tower1 = page.locator('[data-tower="0"]');
    const tower2 = page.locator('[data-tower="1"]');
    const tower3 = page.locator('[data-tower="2"]');

    await expect(tower1).not.toHaveClass(/selected/);
    await expect(tower2).not.toHaveClass(/selected/);
    await expect(tower3).not.toHaveClass(/selected/);

    // Select Tower 1
    await page.keyboard.press('1');
    await expect(tower1).toHaveClass(/selected/);
    await expect(tower2).not.toHaveClass(/selected/);
    await expect(tower3).not.toHaveClass(/selected/);

    // Complete move - selection should clear
    await page.keyboard.press('3');
    await expect(tower1).not.toHaveClass(/selected/);
    await expect(tower2).not.toHaveClass(/selected/);
    await expect(tower3).not.toHaveClass(/selected/);
  });

  test('valid moves to empty tower work correctly', async ({ page }) => {
    // Get initial states
    const tower1Initial = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    const tower2Initial = await page.locator('[data-tower="1"] .ascii-tower').textContent();

    // Move disk from Tower 1 to empty Tower 2
    await page.keyboard.press('1');
    await page.keyboard.press('2');

    // Verify move succeeded
    const tower1After1 = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    const tower2After1 = await page.locator('[data-tower="1"] .ascii-tower').textContent();
    expect(tower1After1).not.toBe(tower1Initial);
    expect(tower2After1).not.toBe(tower2Initial);

    // Move another disk from Tower 1 to empty Tower 3
    await page.keyboard.press('1');
    await page.keyboard.press('3');

    const tower3After = await page.locator('[data-tower="2"] .ascii-tower').textContent();
    // Tower 3 should now have content (disk brackets)
    expect(tower3After).toContain('[');
    expect(tower3After).toContain(']');
  });

  test('game prevents input after winning', async ({ page }) => {
    // Start 3-disk game and win it
    await page.locator('#decrementBtn').click();
    await page.locator('#decrementBtn').click();
    await page.locator('#newGameBtn').click();

    // Complete the puzzle
    const moves = ['13', '12', '32', '13', '21', '23', '13'];
    for (const move of moves) {
      await page.keyboard.press(move[0]);
      await page.keyboard.press(move[1]);
    }

    // Verify win
    await expect(page.locator('#message')).toContainText('YOU WIN!');

    // Try to make another move
    const moveCountBefore = await page.locator('#moveCounter').textContent();
    await page.keyboard.press('3');
    await page.keyboard.press('1');

    // Move count should not change
    const moveCountAfter = await page.locator('#moveCounter').textContent();
    expect(moveCountBefore).toBe(moveCountAfter);
  });

  test('N key starts new game', async ({ page }) => {
    // Get initial state
    const tower1Initial = await page.locator('[data-tower="0"] .ascii-tower').textContent();

    // Make a few moves
    await page.keyboard.press('1');
    await page.keyboard.press('3');
    await page.keyboard.press('1');
    await page.keyboard.press('2');

    // Verify state changed
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 2');
    const tower1Changed = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1Changed).not.toBe(tower1Initial);

    // Press N to start new game
    await page.keyboard.press('n');

    // Verify new game started
    await expect(page.locator('#timer')).toContainText('TIME: 00:00');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 0');
    const tower1After = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1After).toBe(tower1Initial);
  });

  test('supports up to 10 disks', async ({ page }) => {
    // Change disk count to 10 using increment button
    for (let i = 0; i < 5; i++) {
      await page.locator('#incrementBtn').click();
    }
    await page.locator('#newGameBtn').click();

    // Verify 10-disk game loads (disks use brackets)
    const tower1Content = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1Content).toContain('[');
    expect(tower1Content).toContain(']');
    expect(tower1Content).toContain('=');

    // Verify we can make a move
    await page.keyboard.press('1');
    await page.keyboard.press('3');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 1');
  });

  test('disks and base use distinct characters', async ({ page }) => {
    // Start 5-disk game (default)
    const tower1Content = await page.locator('[data-tower="0"] .ascii-tower').textContent();

    // Should contain disk brackets and base (both use = but disks have brackets)
    expect(tower1Content).toContain('[');
    expect(tower1Content).toContain(']');
    expect(tower1Content).toContain('=');
  });

  test('changing disk count with +/- buttons updates display', async ({ page }) => {
    // Initial display should show 5
    await expect(page.locator('#diskCountDisplay')).toContainText('5');

    // Click increment
    await page.locator('#incrementBtn').click();
    await expect(page.locator('#diskCountDisplay')).toContainText('6');

    // Click decrement twice
    await page.locator('#decrementBtn').click();
    await page.locator('#decrementBtn').click();
    await expect(page.locator('#diskCountDisplay')).toContainText('4');
  });

  test('disk count change does not affect current game until new game starts', async ({ page }) => {
    // Get initial 5-disk state
    const tower1Initial = await page.locator('[data-tower="0"] .ascii-tower').textContent();

    // Change displayed disk count to 7
    await page.locator('#incrementBtn').click();
    await page.locator('#incrementBtn').click();
    await expect(page.locator('#diskCountDisplay')).toContainText('7');

    // Make a move in current game
    await page.keyboard.press('1');
    await page.keyboard.press('3');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 1');

    // Current game should still be playable as a 5-disk game
    // Make another move to verify game mechanics work
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 2');

    // Now start new game - should use the selected 7 disks
    await page.locator('#newGameBtn').click();
    const tower1With7 = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1With7).not.toBe(tower1Initial);

    // Verify disk count display still shows 7 after new game
    await expect(page.locator('#diskCountDisplay')).toContainText('7');
  });

  test('keyboard +/- keys change disk count', async ({ page }) => {
    // Initial display should show 5
    await expect(page.locator('#diskCountDisplay')).toContainText('5');

    // Press + key (or = which doesn't need shift)
    await page.keyboard.press('=');
    await expect(page.locator('#diskCountDisplay')).toContainText('6');

    // Press + key with shift
    await page.keyboard.press('+');
    await expect(page.locator('#diskCountDisplay')).toContainText('7');

    // Press - key
    await page.keyboard.press('-');
    await expect(page.locator('#diskCountDisplay')).toContainText('6');

    // Press - key again
    await page.keyboard.press('-');
    await expect(page.locator('#diskCountDisplay')).toContainText('5');
  });

  test('selecting the same tower twice cancels selection without moving', async ({ page }) => {
    // Get initial state
    const tower1Initial = await page.locator('[data-tower="0"] .ascii-tower').textContent();

    // Select Tower 1
    await page.keyboard.press('1');
    await expect(page.locator('#message')).toContainText('Tower 1 selected');

    // Select Tower 1 again (same tower)
    await page.keyboard.press('1');

    // Should cancel selection, no move should happen
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 0');
    await expect(page.locator('#message')).toContainText('Press 1/F, 2/J, or 3/K to select a tower');

    // Tower state should be unchanged
    const tower1After = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    expect(tower1After).toBe(tower1Initial);

    // Timer should have started on first selection (even though move was cancelled)
    // Just verify the timer element exists and shows a time format
    await expect(page.locator('#timer')).toContainText('TIME:');
  });

  test('FJK keys work as alternative tower selection', async ({ page }) => {
    // Get initial state
    const tower1Before = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    const tower3Before = await page.locator('[data-tower="2"] .ascii-tower').textContent();

    // Use F to select Tower 1
    await page.keyboard.press('f');
    await expect(page.locator('#message')).toContainText('Tower 1 selected');

    // Use K to move to Tower 3
    await page.keyboard.press('k');

    // Verify disk moved
    const tower1After = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    const tower3After = await page.locator('[data-tower="2"] .ascii-tower').textContent();
    expect(tower1After).not.toBe(tower1Before);
    expect(tower3After).not.toBe(tower3Before);

    // Verify move counter incremented
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 1');

    // Use J to select Tower 2 (should fail - empty)
    await page.keyboard.press('j');
    await expect(page.locator('#message')).toContainText("Can't select an empty tower");
  });

  test('T key cycles through themes', async ({ page }) => {
    // Check initial theme (green)
    await expect(page.locator('#themeSelect')).toHaveValue('green');

    // Press T to cycle to next theme
    await page.keyboard.press('t');
    await expect(page.locator('#themeSelect')).toHaveValue('amber');

    // Press T again
    await page.keyboard.press('t');
    await expect(page.locator('#themeSelect')).toHaveValue('blue');

    // Press T again
    await page.keyboard.press('t');
    await expect(page.locator('#themeSelect')).toHaveValue('minimal');

    // Press T again - should cycle back to green
    await page.keyboard.press('t');
    await expect(page.locator('#themeSelect')).toHaveValue('green');
  });

  test('theme selector dropdown changes theme', async ({ page }) => {
    // Select amber theme from dropdown
    await page.locator('#themeSelect').selectOption('amber');
    await expect(page.locator('#themeSelect')).toHaveValue('amber');

    // Select minimal theme
    await page.locator('#themeSelect').selectOption('minimal');
    await expect(page.locator('#themeSelect')).toHaveValue('minimal');
  });

  test('H key toggles high score visibility', async ({ page }) => {
    // Scores should be visible initially
    const container = page.locator('.leaderboards-container');
    await expect(container).toBeVisible();
    await expect(page.locator('#toggleScoresBtn')).toContainText('Toggle Scores');

    // Press H to hide
    await page.keyboard.press('h');
    await expect(container).not.toBeVisible();

    // Press H to show again
    await page.keyboard.press('h');
    await expect(container).toBeVisible();
  });

  test('high score toggle button works', async ({ page }) => {
    const container = page.locator('.leaderboards-container');

    // Click to hide
    await page.locator('#toggleScoresBtn').click();
    await expect(container).not.toBeVisible();

    // Click to show
    await page.locator('#toggleScoresBtn').click();
    await expect(container).toBeVisible();
  });

  test('export and import buttons exist', async ({ page }) => {
    await expect(page.locator('#exportScoresBtn')).toBeVisible();
    await expect(page.locator('#importScoresBtn')).toBeVisible();
    await expect(page.locator('#clearScoresBtn')).toBeVisible();
  });

  test('leaderboards display side by side', async ({ page }) => {
    // Check both leaderboard sections exist
    await expect(page.locator('.local-scores')).toBeVisible();
    await expect(page.locator('.global-scores')).toBeVisible();

    // Check titles
    await expect(page.locator('.local-scores .leaderboard-title')).toContainText('YOUR SCORES');
    await expect(page.locator('.global-scores .leaderboard-title')).toContainText('GLOBAL SCORES');

    // Check tables exist
    await expect(page.locator('#highScoreBoard')).toBeVisible();
    await expect(page.locator('#globalLeaderboard')).toBeVisible();
  });

  test('global leaderboard updates when disk count changes', async ({ page }) => {
    // Initial should show 5 disks
    await expect(page.locator('#globalDiskCount')).toContainText('5');

    // Change to 3 disks and start new game
    await page.locator('#decrementBtn').click();
    await page.locator('#decrementBtn').click();
    await page.locator('#newGameBtn').click();

    // Global leaderboard should now show 3 disks
    await expect(page.locator('#globalDiskCount')).toContainText('3');
  });

  test('Escape key deselects tower without counting as a move', async ({ page }) => {
    // Select Tower 1
    await page.keyboard.press('1');
    await expect(page.locator('#message')).toContainText('Tower 1 selected');
    await expect(page.locator('[data-tower="0"]')).toHaveClass(/selected/);

    // Press Escape to deselect
    await page.keyboard.press('Escape');

    // Should deselect and show default message
    await expect(page.locator('#message')).toContainText('Press 1/F, 2/J, or 3/K to select a tower');
    await expect(page.locator('[data-tower="0"]')).not.toHaveClass(/selected/);

    // Move count should still be 0
    await expect(page.locator('#moveCounter')).toContainText('MOVES: 0');
  });

  test('disk count persists across page reload', async ({ page }) => {
    // Change disk count to 7
    await page.locator('#incrementBtn').click();
    await page.locator('#incrementBtn').click();
    await expect(page.locator('#diskCountDisplay')).toContainText('7');

    // Reload the page
    await page.reload();

    // Disk count should still be 7
    await expect(page.locator('#diskCountDisplay')).toContainText('7');

    // Game should have started with 7 disks
    const tower1Content = await page.locator('[data-tower="0"] .ascii-tower').textContent();
    // 7-disk game has more content than 5-disk game
    expect(tower1Content.length).toBeGreaterThan(100);
  });

  test('name input modal exists and is hidden by default', async ({ page }) => {
    // Modal should exist but be hidden
    const modal = page.locator('#nameModal');
    await expect(modal).toHaveClass(/hidden/);

    // Modal elements should exist
    await expect(page.locator('#nameInput')).toBeAttached();
    await expect(page.locator('#submitNameBtn')).toBeAttached();
  });

  test('name input has maxlength of 3', async ({ page }) => {
    // Check that the input has maxlength attribute
    const maxLength = await page.locator('#nameInput').getAttribute('maxlength');
    expect(maxLength).toBe('3');
  });

  test('sanitizeName function filters non-alphanumeric characters', async ({ page }) => {
    // Test the sanitizeName function via evaluate
    const result = await page.evaluate(() => {
      // Access the function (it's in global scope due to how game.js is loaded)
      return typeof sanitizeName === 'function' ? sanitizeName('A@B#C!') : null;
    });
    expect(result).toBe('ABC');
  });

  test('sanitizeName function converts to uppercase', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof sanitizeName === 'function' ? sanitizeName('abc') : null;
    });
    expect(result).toBe('ABC');
  });

  test('sanitizeName function limits to 3 characters', async ({ page }) => {
    const result = await page.evaluate(() => {
      return typeof sanitizeName === 'function' ? sanitizeName('ABCDEF') : null;
    });
    expect(result).toBe('ABC');
  });

  test('validateLeaderboardSubmission rejects invalid disk count', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof validateLeaderboardSubmission !== 'function') return null;
      // Disk count of 2 is below minimum (3)
      return validateLeaderboardSubmission(2, 7, 60);
    });
    expect(result).toEqual({ valid: false, reason: 'Invalid disk count' });
  });

  test('validateLeaderboardSubmission rejects impossible move count', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof validateLeaderboardSubmission !== 'function') return null;
      // 3 disks requires minimum 7 moves, 5 is impossible
      return validateLeaderboardSubmission(3, 5, 60);
    });
    expect(result).toEqual({ valid: false, reason: 'Invalid move count' });
  });

  test('validateLeaderboardSubmission rejects negative time', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof validateLeaderboardSubmission !== 'function') return null;
      return validateLeaderboardSubmission(3, 7, -1);
    });
    expect(result).toEqual({ valid: false, reason: 'Invalid time' });
  });

  test('validateLeaderboardSubmission rejects excessive time', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof validateLeaderboardSubmission !== 'function') return null;
      // Over 24 hours (86401 seconds)
      return validateLeaderboardSubmission(3, 7, 86401);
    });
    expect(result).toEqual({ valid: false, reason: 'Invalid time' });
  });

  test('validateLeaderboardSubmission accepts valid submission', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof validateLeaderboardSubmission !== 'function') return null;
      // 3 disks, 7 moves (minimum), 60 seconds
      return validateLeaderboardSubmission(3, 7, 60);
    });
    expect(result).toEqual({ valid: true });
  });

  test('getMinimalMoves calculates correct minimum for each disk count', async ({ page }) => {
    const results = await page.evaluate(() => {
      if (typeof getMinimalMoves !== 'function') return null;
      return {
        disk3: getMinimalMoves(3),   // 2^3 - 1 = 7
        disk4: getMinimalMoves(4),   // 2^4 - 1 = 15
        disk5: getMinimalMoves(5),   // 2^5 - 1 = 31
        disk10: getMinimalMoves(10)  // 2^10 - 1 = 1023
      };
    });
    expect(results).toEqual({
      disk3: 7,
      disk4: 15,
      disk5: 31,
      disk10: 1023
    });
  });

  test('theme persists across page reload', async ({ page }) => {
    // Change to amber theme
    await page.locator('#themeSelect').selectOption('amber');
    await expect(page.locator('#themeSelect')).toHaveValue('amber');

    // Reload the page
    await page.reload();

    // Theme should still be amber
    await expect(page.locator('#themeSelect')).toHaveValue('amber');
  });

  test('scores visibility persists across page reload', async ({ page }) => {
    // Hide scores
    await page.locator('#toggleScoresBtn').click();
    await expect(page.locator('.leaderboards-container')).not.toBeVisible();

    // Reload the page
    await page.reload();

    // Scores should still be hidden
    await expect(page.locator('.leaderboards-container')).not.toBeVisible();
  });

});
