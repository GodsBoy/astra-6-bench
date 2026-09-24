# Marble computer benchmark

A single-file, interactive 3D machine that adds two four-bit inputs by sending glass marbles through five brass toggles. Inspired by Wintergatan's marble machine and the Digi-Comp II.

The benchmark is about making the mechanism perform the addition. The application never adds the two input values or looks up their sum. Its decimal output is decoded from the five resting toggle states.

## Run

Open [index.html](index.html) in a current browser with WebGL 2 and hardware acceleration. There is no build step or package installation.

An internet connection is needed to load **Three.js 0.169.0** and its **OrbitControls** addon from jsDelivr through the embedded import map. All application code, styling, geometry, wood grain, lettering, reflections and sounds are contained in the HTML file. There are no external image, audio or font assets and no physics engine.

If your browser restricts modules in local files, serve this folder with any static HTTP server. For example, when Python is available:

```sh
python -m http.server 8080
```

Then open <http://localhost:8080>.

## Controls

- **A and B:** click the four switches in either row. Weights run from 8 to 1, left to right. Each input can represent 0 to 15.
- **RUN:** release one marble for each selected input bit. The lever on the board and the accessible control below it both work. An occupied register is cleared with reset marbles before the next addition.
- **Reset:** clear the register using grey marbles travelling through the same toggles and carry tracks.
- **DEMO:** automatically run 5 + 6, 9 + 7 and 15 + 15, with a settling pause and a marble-driven reset between examples. The final result remains visible. **STOP DEMO** lets the current run finish and prevents the next example.
- **Sound:** enable or mute the short toggle clicks. The Web Audio context is created only after a user click.
- **Camera:** follow the moving marble automatically, or drag to orbit and scroll to zoom. Use **Follow camera** to return to the automatic view.

Inputs are locked while the machine is running. The five bit indicators update on contact; the binary and decimal readout waits until the final marble has stopped inside the collector. The fallen-marble counter includes reset marbles when a run needs them.

## How the mechanism adds

Each selected input switch releases **one marble at its bit's weight**, rather than releasing a number of unit marbles equal to the operand. A marble arriving at a toggle has exactly two possible effects:

| Previous state | New state | Marble's destination |
| --- | --- | --- |
| 0 | 1 | Collector |
| 1 | 0 | Next higher bit via the downhill carry rail |

The same physical marble continues through every carry. Five toggles store weights **16, 8, 4, 2 and 1**, with the most significant on the left. A maximum input pair of 15 and 15 fits in this five-bit register.

There is only one assignment that changes a running register bit: the arrival handler reached at the end of a marble's track. No timer, input handler or reset button directly writes an answer into the register.

Reset also uses this mechanism. A grey marble enters the lowest occupied bit and follows the carry chain. Further reset marbles are released only while a bit remains occupied. Overflow from the highest toggle goes to the collector. This clears the register without directly assigning zero to its bits.

## Motion and rendering

- Cubic rail paths are sampled by distance. Gravity projected onto the track tangent, rolling inertia and drag determine marble speed.
- All marble paths descend. Track endpoints meet at the toggle contacts, so an outgoing carry starts where the incoming marble arrived.
- A fixed 120 Hz simulation step is independent of the display's frame rate. Hidden tabs pause; returning to the page does not jump the mechanism forward.
- Replenishing marbles descend from inside the feeder hoods. Spent marbles are removed from rendering only after stopping inside the opaque collector drawer.
- Procedural wood, brass hardware, glass, a studio reflection environment and soft contact shadows require no downloaded assets.
- Static hardware is combined by material, geometries are reused and pixel density adapts when rendering becomes slow.
- The camera slowly follows the active region while retaining the full board. The layout was designed for a square **1080 by 1080** recording and also adapts to narrow screens.

This is a scripted mechanical simulation, not a rigid-body physics simulation or a fabrication-ready machine design. The switch states and marble routing perform the computation; the paths provide deterministic, continuous animation.

## Benchmark requirements

The original brief required:

1. One HTML application file; Three.js 0.169.0 and OrbitControls through an import map; no other libraries, physics engine or external assets.
2. Two-state result toggles changed by marble contact, with carries physically continuing to the next toggle. No arithmetic calculation of the input sum in the application.
3. Continuous marble motion with believable gravity and timing.
4. Two clickable rows of four input switches, a RUN lever and a fallen-marble counter.
5. Five result toggles, most significant first, with a binary and decimal readout from their final states.
6. An unattended demo of 5 + 6, 9 + 7 and 15 + 15, resetting between runs.
7. A wooden board, brass toggles, glass marbles, warm lighting, soft shadows and a slow following camera suitable for square recording.
8. Short Web Audio toggle clicks, with audio started only after a user click.
9. A 60 fps target on a normal laptop and no application console errors.

## Reproduce the mechanism checks

The optional tests use Node.js 18 or later and its built-in test runner. They add no dependencies to the application:

```sh
node --test tests/mechanism.test.cjs
```

The tests extract the actual mechanism from `index.html` and advance it through the same fixed simulation steps used by the animation. They verify:

- JavaScript syntax for the complete application module.
- Downhill, finite paths and continuous joins between feeder, contact and carry paths.
- All **256 input pairs**, including zero inputs and the maximum sum.
- Every toggle change occurring with a marble at that toggle's contact point.
- Readout completion only after the active marble has stopped.
- Marble-driven clearing of every tested result.
- The three demo examples in sequence, including automatic clearing between them.

Ordinary addition appears only in the separate test harness as an independent expected-value oracle. It is never used by the application or its mechanism.

## Verification recorded on 24 September 2026

| Check | Observed result |
| --- | --- |
| Exhaustive mechanism test | All 256 input pairs passed |
| Reset tests | Every tested result cleared to `00000` using marbles |
| Track and contact checks | All paths descended; every tested flip occurred at contact |
| Demo 5 + 6 | `01011`, decimal 11 |
| Demo 9 + 7 | `10000`, decimal 16 |
| Demo 15 + 15 | `11110`, decimal 30 |
| Manual browser run, 13 + 6 | `10011`, decimal 19; five input marbles |
| Square viewport | 1080 by 1080; controls, board and output visible |
| Narrow viewport | 390 by 844; no horizontal overflow; input switches responded |
| Browser console | No application errors or warnings observed during the tested flows |
| Rendering sample | Approximately 140 to 144 fps reported on an NVIDIA GeForce RTX 4050 Laptop GPU |

The rendering sample is a measurement from one laptop and browser session, not a guarantee for all hardware. Automated tests cover the mechanism, not GPU performance, audible quality or a cross-browser compatibility matrix. No hosted deployment is required to use this repository.

## Files

| File | Purpose |
| --- | --- |
| [index.html](index.html) | Complete single-file application |
| [tests/mechanism.test.cjs](tests/mechanism.test.cjs) | Dependency-free, repeatable mechanism checks |
| [README.md](README.md) | Benchmark brief, usage, design and validation record |
