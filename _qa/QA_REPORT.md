# LeaveBy — QA Report

**Result: PASS**: `_qa/test/report.json` shows `"ok": true`, 0 JS errors and 19 screenshots. `assembleRelease` succeeded (`app/build/outputs/apk/release/app-release.apk`).

## What was tested (`_qa/scenario.js`)
All 12 `test_scenarios` from IDEA.json:
1. Starter routines are present, and the Morning total is 35 min (the sum of its step estimates).
2. Create Gym (5/10/3 min), move step 3 to the top, delete a step, reload: the order persists.
3. Plan Gym 30 min out with a 5 min buffer: Start-by and the timeline are correct.
4. Run: Done early gives a green "ahead" chip.
5. Overtime: coral ring, "overtime" label, red "behind" chip.
6. Reload mid-run: the run resumes on the same step, and elapsed time comes from timestamps.
7. +2 min and Skip: the skipped step is tagged in the summary.
8. Summary, History and streak.
9. Two runs give the "You guess X, you actually take ~Y" hint. "Use my real times" moves the guess start-by.
10. The guesses-vs-real toggle changes start-by.
11. Export, reset, import: routines and runs are restored.
12. 24h clock: no AM/PM. Vibration off: 0 `Android.vibrate` calls.

Edge cases added:
- Android back handler: returns `false` on Home and closes an open dialog first.
- Very long routine name: `maxlength` is respected, there is no horizontal overflow on Home or Plan, and the header is ellipsized.
- Empty step name falls back to "Step".
- Rapid double-tap on Done advances only one step.
- Back during a run shows the Resume card. After a reload the app goes back into the run view.
- "Finish now" from the run menu marks the remaining steps as skipped.
- Corrupt `activeRun` in storage: the app still boots.
- Garbage import text shows an error message.
- Settings persist after a reload.

## Bugs found and fixed
1. **Double-tap on Done/Skip skipped a step and polluted the learning data.** The second tap logged a ~0 s "actual" duration, which then went into the median. `advance()` now ignores taps within 300 ms of a step starting.
2. **Ghost taps after navigation.** A rapid second tap could land on a control on the newly rendered screen (for example, a double-tap on "New routine" made two routines, and a double-tap on the last Done hit the summary). Clicks inside `#screen` are now ignored for 250 ms after a screen transition.
3. **A corrupt or hand-edited `activeRun` (in storage or an import) crashed the app on boot**: `screens.run` read `steps[stepIndex]` when it was undefined. `normalize()` now validates `activeRun` (index in range, planned times above 0, finite timestamps) and drops it if it's invalid.
4. **Sub-30-second durations showed as "~0 min"** in the History chart and stats. `fmtMin` now shows "<1 min".
5. **History badge read "+30 early"**, with no unit. It now reads "30 min early".
6. **The run banner split the leave time across lines** ("1:09" / "AM"). The time is now `nowrap`.

## Known limitations
- The double-tap guard does not apply to step 1. That step is covered by the navigation tap-lock instead, because the run screen opens with a screen transition.
- Skipping a step credits its planned time as "ahead" in the pace chip. This is intentional, but it can look optimistic.
- On narrow screens the run banner shows "Leave at" and the time on two lines.
- Vibration, share and wake-lock were only checked through a JS stub of the `Android` bridge. They were not tested on a device.
- If the leave-by time is more than 1 minute in the past, it rolls to tomorrow. There is no explicit date picker.
