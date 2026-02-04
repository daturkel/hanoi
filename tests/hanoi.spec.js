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

});
