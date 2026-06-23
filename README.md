# The Last Curtain: Theatre of Echoes

**CID:** 02607578

The Last Curtain is a deterministic, turn-based card game set in an original ritual theatre. Each poker hand becomes a scene in a five-scene act. The theatre remembers the previous scene: changing hand types builds Variety, while repetition removes the hand's base applause.

The project was designed for the Computing 2: Applications coursework. Its game rules are implemented as a browser-independent pure JavaScript module, tested with Mocha, and consumed by a semantic HTML/CSS/JavaScript interface.

## Run the game

Requires Node.js 18 or newer.

```sh
npm install
npm start
```

Open <http://127.0.0.1:8080/web-app/>.

Useful commands:

```sh
npm test       # domain tests
npm run docs   # generate JSDoc in /docs
npm run lint   # modern JavaScript source-quality check
npm run check  # tests, lint, and documentation
npm run simulate
```

`npm run check` is the authoritative quality gate. It runs the Mocha domain
tests, ESLint 10.5.0 using the flat configuration in `eslint.config.js`, and
JSDoc generation. The project uses ESLint because its ES-module and modern
JavaScript support matches the implemented source; historical JSLint template
comments are not part of the active toolchain.

## Rules

- Each act begins with eight cards, five performances, and three rehearsals.
- Select one to five cards and perform the best available poker hand.
- A different hand type raises Variety, up to Level 3; repetition resets Variety and removes base applause.
- Rehearsal replaces selected cards without consuming a scene.
- Reach the applause target after the fifth scene to continue.
- Before every act, invite one of three roles to the stage.
- Complete all three acts to win.

### Cast roles

- **The Last Entrant** stores half of the first two scenes and releases twice the stored applause at the finale.
- **The Faceless Understudy** absorbs one repeated hand before requiring a different hand type to recover.
- **The Veiled Witnesses** record new hand types and restore a rehearsal after every third discovery.
- **The Twin Mask** flips during rehearsal; five cards of the active colour may share a virtual suit.
- **The Curtain Director** watches the role immediately to the left; two cues restore a rehearsal.
- **The Marionette of Retakes** rewinds one scene per act but bans its final hand type.

## Architecture

```text
web-app/Module.js          pure game API and JSDoc
web-app/main.js            events and rendering only
web-app/index.html         semantic page structure
web-app/default.css        responsive visual system
web-app/tests/             domain and API behaviour tests
web-app/dev/simulate.mjs   deterministic balance simulator
web-app/assets/            original local WebP artwork
```

`Module.js` owns all game state, phase transitions, scoring, card evaluation, role effects, action availability, and seeded random behaviour. `main.js` does not calculate game rules; it calls the public API and renders the returned state.

The random generator is an explicit 32-bit LCG. A seed produces the same audition queue, deck order, and full sequence of state transitions. Previewing a scene never advances the random state.

## Testing scope

The automated suite covers:

- all nine poker hands using selections of one to five cards;
- ace-high and ace-low straights;
- frozen PRNG golden values;
- the complete title, audition, playing, pending, intermission, win, and loss lifecycle;
- repetition and Variety scoring;
- all six roles and their interaction order;
- audition queue rotation;
- discard recycling without immediately redrawing removed cards;
- Marionette snapshots and final-hand bans;
- wrong-phase and player-facing API errors;
- deep immutability and preview side-effect checks.

## Accessibility

- Every playing card and action is a native button.
- Selected cards use `aria-pressed`.
- Focus is deliberately transferred at auditions, retake decisions, act transitions, and results.
- Keyboard shortcuts support performing, rehearsing, keeping, rewinding, and arranging roles.
- Suit information is communicated by symbol, name, and colour.
- Status changes use a concise live region; errors use an alert region.
- All animation respects `prefers-reduced-motion`.
- The interface remains playable from 360px mobile layouts to wide desktop screens.

## Original visual direction

All artwork was created specifically for this project. It uses general theatrical and mysterious motifs—velvet curtains, masks, fog, cue threads, and stage lighting—without characters, names, marks, or visual assets from existing fictional properties. Character images are decorative; their names, rules, and live status are provided as HTML text.

The seven WebP assets total well below the 2.5MB project budget, and the page falls back to CSS gradients if the theatre background cannot load.

## Balance status

The calibrated act targets are 400, 500, and 600 applause, with three rehearsals per act. `npm run simulate` evaluates deterministic baseline, first-offer, random-offer, and heuristic policies. In the latest 2,000-seed calibration run, the heuristic policy passed Acts I/II/III at 99.9%, 95.2%, and 76.5% conditionally, with a 72.8% full-run win rate (random-offer 57.4%, first-offer 57.8%, baseline 21.5%). These targets should be changed only alongside the score constants, simulator output, tests, and this README.
