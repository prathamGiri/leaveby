// Drives LeaveBy through the main IDEA.json test scenarios.
const assert = (c, m) => { if (!c) throw new Error('Assertion failed: ' + m); };
const KEY = 'leaveby.v1';
const getS = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const shiftRun = (page, sec) => page.evaluate(([k, sec]) => {
  const s = JSON.parse(localStorage.getItem(k));
  s.activeRun.stepStartedAt -= sec * 1000; s.activeRun.startedAt -= sec * 1000;
  localStorage.setItem(k, JSON.stringify(s));
}, [KEY, sec]);

module.exports = async (page, shot) => {
  const click = async (sel) => { await page.click(sel); await page.waitForTimeout(350); };

  // 1. Starter routines + Morning totals
  const names = await page.$$eval('.routine-card .name', (els) => els.map((e) => e.textContent));
  assert(names.includes('Morning out-the-door') && names.includes('Quick errand'), 'starter routines');
  await click('.routine-card[data-id="r_morning"]');
  assert((await page.textContent('#tot-guess')).trim() === '35 min', 'morning total 35');
  await shot('editor-morning');
  await click('[data-act="back"]');

  // 2. Create Gym routine
  await click('[data-act="newRoutine"]');
  await page.fill('[data-in="routineName"]', 'Gym');
  await page.fill('[data-in="stepName"][data-i="0"]', 'Change clothes');
  // first step 5 min (default). Add two more.
  await click('[data-act="addStep"]');
  await page.fill('[data-in="stepName"][data-i="1"]', 'Fill bottle');
  for (let i = 0; i < 5; i++) await page.click('[data-act="est"][data-i="1"][data-v="1"]');
  await click('[data-act="addStep"]');
  await page.fill('[data-in="stepName"][data-i="2"]', 'Shoes');
  for (let i = 0; i < 2; i++) await page.click('[data-act="est"][data-i="2"][data-v="-1"]');
  await page.waitForTimeout(200);
  // move step 3 to top
  await click('[data-act="moveStep"][data-i="2"][data-v="-1"]');
  await click('[data-act="moveStep"][data-i="1"][data-v="-1"]');
  await shot('editor-gym');
  // delete "Fill bottle" (now index 2)
  await click('[data-act="delStep"][data-i="2"]');
  await page.reload(); await page.waitForTimeout(500);
  let S = await getS(page);
  const gym = S.routines.find((r) => r.name === 'Gym');
  assert(gym && gym.steps.map((s) => s.name).join(',') === 'Shoes,Change clothes', 'gym order persisted: ' + JSON.stringify(gym && gym.steps));
  // Add back a 10-minute step for plan test
  await click(`.routine-card[data-id="${gym.id}"]`);
  await click('[data-act="addStep"]');
  await page.fill('[data-in="stepName"][data-i="2"]', 'Fill bottle');
  for (let i = 0; i < 5; i++) await page.click('[data-act="est"][data-i="2"][data-v="1"]');
  await click('[data-act="back"]');

  // 3. Plan Gym: leave in 30 min, 5 min buffer
  await click(`[data-act="pickRoutine"][data-id="${gym.id}"]`);
  await click('[data-act="inMin"][data-v="30"]');
  await click('[data-act="buffer"][data-v="5"]');
  await shot('home-planned');
  await click('[data-act="openPlan"]');
  await shot('plan-preview');

  // 4. Start run, finish step 1 early
  await click('[data-act="startRun"]');
  await page.waitForTimeout(600);
  await shot('run-step1');
  await shiftRun(page, 20);
  await click('[data-act="doneStep"]');
  const pace = await page.textContent('#pace');
  assert(/ahead/.test(pace), 'pace ahead: ' + pace);
  await shot('run-ahead');

  // 5. Overtime: push step 2 past estimate (5 min)
  await shiftRun(page, 9 * 60); // step 1 banked ~2.7 min ahead; 4 min over erases it
  // 6. Reload mid-run: resumes on same step
  await page.reload(); await page.waitForTimeout(700);
  assert(/overtime/.test(await page.textContent('#remain-l')), 'overtime label');
  assert(/behind/.test(await page.textContent('#pace')), 'pace behind');
  await shot('run-overtime');

  // 7. +2 min, then skip
  await click('[data-act="plus2"]');
  await click('[data-act="doneStep"]');
  await click('[data-act="skipStep"]');
  await page.waitForTimeout(500);
  await shot('summary');
  assert(await page.$('.tag'), 'skipped tag');
  // 8. History
  await click('[data-act="back"]');
  await click('[data-act="tab"][data-tab="history"]');
  await shot('history');

  // 9. Second run to build learning; then editor shows hint
  S = await getS(page);
  assert(S.runs.length === 1, 'one run');
  await click('[data-act="tab"][data-tab="home"]');
  await click('[data-act="openPlan"]');
  await click('[data-act="startRun"]');
  await shiftRun(page, 9 * 60); await page.reload(); await page.waitForTimeout(400);
  await click('[data-act="doneStep"]');
  await shiftRun(page, 8 * 60); await page.reload(); await page.waitForTimeout(400);
  await click('[data-act="doneStep"]');
  await shiftRun(page, 12 * 60); await page.reload(); await page.waitForTimeout(400);
  await click('[data-act="doneStep"]');
  await page.waitForTimeout(400);
  await shot('summary-2');
  await click('[data-act="back"]');
  if (await page.isVisible('[data-act="tab"][data-tab="home"]')) await click('[data-act="tab"][data-tab="home"]');
  await click('[data-act="openPlan"]');
  await shot('plan-real-vs-guess');
  const before = await page.textContent('#plan-start');
  await click('[data-act="planMode"][data-v="guess"]');
  const guessBefore = await page.textContent('#plan-start');
  assert(before !== guessBefore, 'toggle changes start-by');
  await click('[data-act="back"]');
  await click(`.routine-card[data-id="${gym.id}"]`);
  assert(await page.$('.hint'), 'learning hint visible');
  await shot('editor-learned');
  await click('[data-act="applyReal"]');
  await click('[data-act="back"]');
  await click('[data-act="openPlan"]');
  const guessAfter = await page.textContent('#plan-start');
  assert(guessAfter !== guessBefore, 'guess start moved after apply');

  // 11. Export / reset / import
  await click('[data-act="back"]');
  await click('[data-act="tab"][data-tab="settings"]');
  await shot('settings');
  await click('[data-act="exportData"]');
  const json = await page.inputValue('#exp-ta');
  await shot('export');
  await click('[data-act="dlgCancel"]');
  await click('[data-act="resetData"]');
  await click('[data-act="dlgOk"]');
  S = await getS(page);
  assert(S.runs.length === 0 && S.routines.length === 2, 'reset');
  await click('[data-act="importData"]');
  await page.fill('#imp-ta', json);
  await click('[data-act="dlgOk"]');
  S = await getS(page);
  assert(S.runs.length === 2 && S.routines.length === 3, 'import restored');

  // 12. 24h toggle + vibration off
  await click('[data-act="toggleSet"][data-k="clock24"]');
  await click('[data-act="tab"][data-tab="home"]');
  const t = await page.textContent('#target-time');
  assert(!/AM|PM/.test(t), '24h format: ' + t);
  await shot('home-24h');
  await click('[data-act="tab"][data-tab="settings"]');
  await click('[data-act="toggleSet"][data-k="vibrate"]');
  await page.evaluate(() => { window.__vib = 0; window.Android = { vibrate: () => window.__vib++, share: () => {}, toast: () => {} }; });
  await click('[data-act="tab"][data-tab="home"]');
  await click('[data-act="openPlan"]');
  await click('[data-act="startRun"]');
  await click('[data-act="doneStep"]');
  assert((await page.evaluate(() => window.__vib)) === 0, 'no vibrate when disabled');
  await click('[data-act="runMenu"]');
  await shot('run-menu');
  await click('[data-act="dlgDiscard"]');
  await page.waitForTimeout(300);

  // ---- Edge cases ----
  const back = () => page.evaluate(() => window.onAndroidBack && window.onAndroidBack());
  // Back on home returns false (let Android exit)
  assert((await back()) === false, 'back on home returns false');
  // Back closes dialog, then leaves screen
  await click('[data-act="tab"][data-tab="settings"]');
  await click('[data-act="exportData"]');
  assert((await back()) === true, 'back with dialog returns true');
  await page.waitForTimeout(300);
  assert(!(await page.$('#exp-ta')), 'back closes dialog');

  // Long name + empty step name
  await click('[data-act="tab"][data-tab="home"]');
  await click('[data-act="newRoutine"]');
  const long = 'Supercalifragilistic extra long routine name!!';
  await page.fill('[data-in="routineName"]', long);
  await page.fill('[data-in="stepName"][data-i="0"]', '');
  await page.fill('[data-in="routineName"]', long + '<b>x</b>');
  S = await getS(page);
  const lr = S.routines[S.routines.length - 1];
  assert(lr.name.length <= 40, 'maxlength respected: ' + lr.name.length);
  assert(lr.steps[0].name === 'Step', 'empty step name falls back');
  await back(); await page.waitForTimeout(350);
  const ow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!ow, 'no horizontal overflow on home');
  await click(`[data-act="pickRoutine"][data-id="${lr.id}"]`);
  await click('[data-act="openPlan"]');
  const ow2 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  assert(!ow2, 'no horizontal overflow on plan');
  await shot('edge-long-name-plan');

  // Rapid double-tap on Done must not skip steps
  const lrId = lr.id;
  await back(); await page.waitForTimeout(350);
  await click(`.routine-card[data-id="${lrId}"]`);
  await click('[data-act="addStep"]'); await click('[data-act="addStep"]');
  await back(); await page.waitForTimeout(350);
  await click('[data-act="openPlan"]');
  await click('[data-act="startRun"]');
  await page.waitForTimeout(400);
  await shiftRun(page, 60);
  await page.dblclick('[data-act="doneStep"]');
  await page.waitForTimeout(200);
  S = await getS(page);
  assert(S.activeRun && S.activeRun.stepIndex === 1, 'double tap advanced only one step: ' + (S.activeRun && S.activeRun.stepIndex));
  // Back during run -> home with resume card; resume works; reload keeps run
  await back(); await page.waitForTimeout(350);
  assert(await page.$('[data-act="resume"]'), 'resume card shown');
  await page.reload(); await page.waitForTimeout(500);
  S = await getS(page);
  assert(S.activeRun && S.activeRun.stepIndex === 1, 'run persisted across reload');
  assert(await page.$('#ring'), 'reload resumes into run view');
  await click('[data-act="runMenu"]');
  await click('[data-act="dlgFinish"]');
  S = await getS(page);
  const last = S.runs[S.runs.length - 1];
  assert(!S.activeRun && last.steps.length === 3 && last.steps[2].skipped, 'finish early marks rest skipped');
  await shot('edge-finish-early');

  // Corrupt activeRun in import must not brick the app
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.activeRun = { steps: [], stepIndex: 5 }; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload(); await page.waitForTimeout(500);
  assert(await page.$('.routine-card'), 'app boots with corrupt activeRun');
  // Garbage import shows an error
  await click('[data-act="tab"][data-tab="settings"]');
  await click('[data-act="importData"]');
  await page.fill('#imp-ta', '{not json');
  await click('[data-act="dlgOk"]');
  assert(/look like/.test(await page.textContent('#imp-err')), 'import error shown');
  await click('[data-act="dlgCancel"]');
  // Settings persist after reload
  await page.reload(); await page.waitForTimeout(400);
  S = await getS(page);
  assert(S.settings.clock24 === true && S.settings.vibrate === false, 'settings persisted');
};
