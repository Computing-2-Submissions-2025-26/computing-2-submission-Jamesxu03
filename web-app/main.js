/*jslint browser */
import Game from "./Module.js";

const element = (id) => document.getElementById(id);
const suitSymbols = {S: "♠", H: "♥", D: "♦", C: "♣"};
const suitNames = {S: "spades", H: "hearts", D: "diamonds", C: "clubs"};
const rankNames = {
    1: "Ace",
    11: "Jack",
    12: "Queen",
    13: "King"
};
const rankLabels = {1: "A", 11: "J", 12: "Q", 13: "K"};
const phaseNames = {
    title: "The theatre awaits",
    audition: "Audition",
    playing: "Performance",
    "scene-pending": "Retake decision",
    "act-complete": "Act complete",
    won: "Final curtain",
    lost: "The lights go dark"
};

let game = Game.createGame(`opening-${Date.now()}`);
let eventMessages = [
    "The house is quiet. Begin when you are ready."
];
let nextFocus = "start";
let uiBusy = false;
let activeAnimations = [];

const escapeHtml = function (value) {
    const span = document.createElement("span");
    span.textContent = String(value);
    return span.innerHTML;
};

const announce = function (message) {
    const region = element("live-status");
    region.textContent = "";
    window.setTimeout(function () {
        region.textContent = message;
    }, 20);
};

const showError = function () {
    const alert = element("error-alert");
    alert.textContent = game.lastError ? game.lastError.message : "";
};

const pushEvents = function (messages) {
    if (messages.length > 0) {
        eventMessages = [...messages, ...eventMessages].slice(0, 8);
    }
};

const cardName = (card) => (
    `${rankNames[card.rank] || card.rank} of ${suitNames[card.suit]}`
);

const cardMarkup = function (card, index, selectable) {
    const selected = game.selectedCardIds.includes(card.id);
    const disabled = !selectable.includes(card.id);
    const label = rankLabels[card.rank] || card.rank;
    return `
        <button
            class="playing-card ${card.color} ${selected ? "selected" : ""}"
            type="button"
            data-action="toggle-card"
            data-card-id="${card.id}"
            aria-label="${cardName(card)}"
            aria-pressed="${selected}"
            style="--card-index:${index};--card-count:${game.hand.length}"
            ${disabled ? "disabled" : ""}
        >
            <span class="card-corner card-corner-top" aria-hidden="true">
                <strong>${label}</strong><span>${suitSymbols[card.suit]}</span>
            </span>
            <span class="card-suit" aria-hidden="true">${suitSymbols[card.suit]}</span>
            <span class="card-corner card-corner-bottom" aria-hidden="true">
                <strong>${label}</strong><span>${suitSymbols[card.suit]}</span>
            </span>
        </button>`;
};

const renderSummary = function () {
    const target = Game.getActTarget(game);
    element("run-summary").innerHTML = `
        <div><span>Act</span><strong>${game.currentAct} / 3</strong></div>
        <div><span>Applause</span><strong>${game.actScore} / ${target}</strong></div>
        <div><span>Scene</span><strong>${game.sceneNumber} / 5</strong></div>`;
};

const renderLog = function () {
    element("event-log").innerHTML = eventMessages.map(function (message, index) {
        return `<li class="${index === 0 ? "latest" : ""}">${escapeHtml(message)}</li>`;
    }).join("");
};

const renderStatus = function () {
    const target = Game.getActTarget(game);
    const progress = Math.min(100, Math.round(game.actScore / target * 100));
    element("act-status").innerHTML = `
        <div class="status-orbit">
            <div class="progress-ring" style="--progress:${progress * 3.6}deg">
                <span>${progress}%</span>
            </div>
            <p>towards the ritual target</p>
        </div>
        <dl class="status-list">
            <div><dt>Rehearsals</dt><dd>${game.rehearsals} / 3</dd></div>
            <div><dt>Variety</dt><dd>${game.varietyLevel} / 3</dd></div>
            <div><dt>Run applause</dt><dd>${game.runScore}</dd></div>
            <div><dt>Phase</dt><dd>${phaseNames[game.phase]}</dd></div>
        </dl>
        ${game.bannedHandTypes.length > 0 ? `
            <div class="banned-card">
                <span>Banned this act</span>
                <strong>${game.bannedHandTypes.join(", ")}</strong>
            </div>` : ""}`;
};

const renderCast = function () {
    const roles = Game.getCastRoleViews(game);
    const emptySlots = 3 - roles.length;
    const roleMarkup = roles.map(function (role) {
        const directions = Game.getMovableDirections(game, role.id);
        return `
            <article class="role-card ${role.dormant ? "dormant" : ""}" data-role-id="${role.id}">
                <div class="role-image-wrap">
                    <img src="${role.image}" alt="" loading="lazy">
                    <span class="role-number">0${role.slot + 1}</span>
                </div>
                <div class="role-copy">
                    <h3>${role.name}</h3>
                    <p>${role.description}</p>
                    <strong class="role-state">${role.status}</strong>
                </div>
                <div class="role-moves">
                    <button type="button" data-action="move-role" data-role-id="${role.id}" data-direction="left" aria-label="Move ${role.name} left" ${directions.includes("left") ? "" : "disabled"}>←</button>
                    <button type="button" data-action="move-role" data-role-id="${role.id}" data-direction="right" aria-label="Move ${role.name} right" ${directions.includes("right") ? "" : "disabled"}>→</button>
                </div>
            </article>`;
    }).join("");
    const emptyMarkup = Array.from({length: emptySlots}, function (_, index) {
        return `<div class="empty-role"><span>Empty cue</span><strong>0${roles.length + index + 1}</strong></div>`;
    }).join("");
    element("cast-stage").innerHTML = roleMarkup + emptyMarkup;
};

const timelineMarkup = function (entry, index) {
    if (!entry) {
        return `<li class="timeline-slot empty"><span>Scene ${index + 1}</span><strong>Awaiting</strong></li>`;
    }
    const finalLine = entry.natural === entry.final
        ? `<strong>${entry.final}</strong>`
        : `<span>${entry.natural}</span><strong>${entry.final}</strong>`;
    return `<li class="timeline-slot filled">
        <span>Scene ${entry.scene}</span>
        ${finalLine}
        ${entry.modifier ? `<small>${entry.modifier}</small>` : ""}
        <b>+${entry.totalScore}</b>
    </li>`;
};

const renderTimeline = function () {
    element("timeline").innerHTML = Array.from({length: 5}, function (_, index) {
        return timelineMarkup(game.timeline[index], index);
    }).join("");
};

const renderPreview = function () {
    const preview = Game.previewScene(game);
    if (!preview.valid) {
        const waitingMessages = {
            title: "Raise the curtain to begin the ritual.",
            audition: "Choose a role before the next act begins.",
            "scene-pending": "Keep the performed scene or ask the Marionette to rewind it.",
            "act-complete": "The next audition waits beyond the interval.",
            won: "The final curtain has risen.",
            lost: "The house has fallen silent."
        };
        const message = game.phase === "playing" && preview.errorCode === "NO_CARDS_SELECTED"
            ? "Select up to five cards to compose the next scene."
            : waitingMessages[game.phase] || preview.errorMessage || "The next scene is waiting.";
        element("preview").innerHTML = `
            <div class="preview-empty ${preview.errorCode === "HAND_TYPE_FORBIDDEN" ? "forbidden" : ""}">
                <span class="preview-symbol" aria-hidden="true">◇</span>
                <div><h2 id="preview-heading">${preview.errorCode === "HAND_TYPE_FORBIDDEN" ? "Forbidden after retake" : "Compose a scene"}</h2><p>${message}</p></div>
            </div>`;
        return;
    }
    const natural = preview.naturalEvaluation.type;
    const finalType = preview.finalEvaluation.type;
    const handTitle = preview.repeated ? `${finalType} — Repeated` : finalType;
    element("preview").innerHTML = `
        <div class="preview-title">
            <span>${natural === finalType ? "Projected hand" : `Natural: ${natural}`}</span>
            <h2 id="preview-heading">${handTitle}</h2>
            ${preview.finalEvaluation.modificationLabel ? `<em>${preview.finalEvaluation.modificationLabel}</em>` : ""}
        </div>
        <dl class="score-breakdown">
            ${preview.scoreItems.map((item) => `<div class="score-${item.id}"><dt>${item.label}</dt><dd>${item.amount >= 0 ? "+" : ""}${item.amount}</dd></div>`).join("")}
            <div class="score-total"><dt>Projected Applause</dt><dd>${preview.totalScore}</dd></div>
        </dl>`;
};

const renderHand = function () {
    const selectable = Game.getSelectableCardIds(game);
    element("selection-count").textContent = `${game.selectedCardIds.length} / 5 selected`;
    element("hand").innerHTML = game.hand.map(function (card, index) {
        return cardMarkup(card, index, selectable);
    }).join("");
};

const renderControls = function () {
    const actions = Game.getAvailableActions(game);
    element("controls").innerHTML = `
        <button class="primary-action" type="button" data-action="perform" ${actions.includes("perform") ? "" : "disabled"}>
            <span>Perform scene</span><kbd>P</kbd>
        </button>
        <button class="secondary-action" type="button" data-action="rehearse" ${actions.includes("rehearse") ? "" : "disabled"}>
            <span>Rehearse</span><small>${game.rehearsals} left</small><kbd>R</kbd>
        </button>`;
};

const auditionMarkup = function () {
    const candidates = Game.getAuditionCandidates(game);
    return `
        <span class="overlay-kicker">${game.auditionType === "opening" ? "Opening audition" : "Intermission audition"}</span>
        <h2 id="overlay-title">Choose the next role</h2>
        <p class="overlay-lead">Every role changes how the theatre remembers your scenes.</p>
        <div class="audition-grid">
            ${candidates.map((role) => `
                <button class="audition-card" type="button" data-action="choose-role" data-role-id="${role.id}">
                    <img src="${role.image}" alt="">
                    <span class="audition-card-copy"><strong>${role.name}</strong><small>${role.description}</small><b>Invite to stage</b></span>
                </button>`).join("")}
        </div>`;
};

const resultOverlayMarkup = function () {
    if (game.phase === "title") {
        return `
            <span class="overlay-kicker">A deterministic card ritual</span>
            <h2 id="overlay-title">The theatre remembers.</h2>
            <p class="overlay-lead">Build poker scenes, resist repetition, and direct a cast of impossible performers through three acts.</p>
            <div class="title-features"><span>52 cards</span><span>3 acts</span><span>6 roles</span></div>
            <button class="overlay-action" type="button" data-action="start">Raise the curtain</button>`;
    }
    if (game.phase === "audition") {
        return auditionMarkup();
    }
    if (game.phase === "scene-pending") {
        const result = game.pendingScene.resolution;
        return `
            <span class="overlay-kicker">The Marionette of Retakes</span>
            <h2 id="overlay-title">Keep this scene?</h2>
            <p class="overlay-lead"><strong>${result.finalEvaluation.type}</strong> earned ${result.totalScore} applause. Rewinding restores the previous state but bans this hand for the act.</p>
            <div class="pending-actions">
                <button class="overlay-action" type="button" data-action="confirm">Keep scene <kbd>K</kbd></button>
                <button class="danger-action" type="button" data-action="rewind">Rewind <kbd>Z</kbd></button>
            </div>`;
    }
    if (game.phase === "act-complete") {
        return `
            <span class="overlay-kicker">Act ${game.currentAct} complete</span>
            <h2 id="overlay-title">The witnesses are listening.</h2>
            <p class="overlay-lead">You earned ${game.actScore} applause. Invite another role before the next act.</p>
            <button class="overlay-action" type="button" data-action="continue">Enter intermission</button>`;
    }
    const won = game.phase === "won";
    return `
        <span class="overlay-kicker">${won ? "The final curtain" : "The lights go dark"}</span>
        <h2 id="overlay-title">${won ? "The ritual is complete." : "The theatre remains hungry."}</h2>
        <p class="overlay-lead">${won ? `A final ovation of ${game.runScore} echoes through the house.` : `Act ${game.currentAct} ended at ${game.actScore} of ${Game.getActTarget(game)} required applause.`}</p>
        <button class="overlay-action" type="button" data-action="restart">Return to title</button>`;
};

const renderOverlay = function () {
    const overlay = element("phase-overlay");
    const visible = game.phase !== "playing";
    overlay.hidden = !visible;
    document.body.dataset.phase = game.phase;
    if (visible) {
        element("overlay-content").innerHTML = resultOverlayMarkup();
    }
};

const focusRequestedElement = function () {
    let target;
    if (nextFocus === "first-card") {
        target = document.querySelector("[data-action='toggle-card']");
    } else if (nextFocus === "selected-card") {
        target = document.querySelector("[data-action='toggle-card'][aria-pressed='true']") || document.querySelector("[data-action='perform']");
    } else if (nextFocus === "first-role") {
        target = document.querySelector("[data-action='choose-role']");
    } else {
        target = document.querySelector(`[data-action='${nextFocus}']`);
    }
    if (target) {
        target.focus();
    }
    nextFocus = null;
};

const render = function () {
    renderSummary();
    renderLog();
    renderStatus();
    renderCast();
    renderTimeline();
    renderPreview();
    renderHand();
    renderControls();
    renderOverlay();
    showError();
    if (!uiBusy) {
        window.requestAnimationFrame(focusRequestedElement);
    }
};

const acceptState = function (nextGame, focus, message) {
    const previousResult = game.lastSceneResult;
    game = nextGame;
    nextFocus = focus;
    if (game.lastError) {
        pushEvents([game.lastError.message]);
        announce(game.lastError.message);
    } else if (message) {
        pushEvents([message]);
        announce(message);
    }
    if (
        game.lastSceneResult &&
        game.lastSceneResult !== previousResult &&
        game.lastSceneResult.effectLog.length > 0
    ) {
        pushEvents(game.lastSceneResult.effectLog.map((entry) => entry.message));
    }
    render();
};

const prefersReducedMotion = function () {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const focusForState = function (nextGame, preferred) {
    if (nextGame.phase === "scene-pending") {
        return "confirm";
    }
    if (nextGame.phase === "act-complete") {
        return "continue";
    }
    if (nextGame.phase === "won" || nextGame.phase === "lost") {
        return "restart";
    }
    return preferred;
};

const setBusy = function (busy) {
    const gameElement = element("game");
    if (busy) {
        uiBusy = true;
        gameElement.inert = true;
        gameElement.setAttribute("aria-busy", "true");
        gameElement.classList.add("is-busy");
        return;
    }
    gameElement.inert = false;
    gameElement.removeAttribute("aria-busy");
    gameElement.classList.remove("is-busy");
    uiBusy = false;
};

const runAnimation = async function (target, keyframes, options) {
    if (typeof target.animate !== "function") {
        return;
    }
    let animation;
    let timeoutId;
    let timedOut = false;
    try {
        animation = target.animate(keyframes, {
            ...options,
            fill: "none"
        });
        activeAnimations = [...activeAnimations, animation];
        const timeout = new Promise(function (resolve) {
            timeoutId = window.setTimeout(function () {
                timedOut = true;
                resolve();
            }, options.duration + (options.delay || 0) + 100);
        });
        await Promise.race([
            animation.finished.catch(function () {
                return undefined;
            }),
            timeout
        ]);
        if (timedOut) {
            animation.cancel();
        }
    } catch (error) {
        if (animation) {
            animation.cancel();
        }
        console.warn("A card animation was skipped.", error);
    } finally {
        window.clearTimeout(timeoutId);
        activeAnimations = activeAnimations.filter(function (item) {
            return item !== animation;
        });
    }
};

const runAnimationPhase = async function (label, callback) {
    try {
        await callback();
    } catch (error) {
        console.warn(`${label} animation was skipped.`, error);
    }
};

const cardElementById = function (cardId) {
    return Array.from(element("hand").querySelectorAll("[data-card-id]")).find(function (card) {
        return card.dataset.cardId === cardId;
    });
};

const captureCardRects = function (cardIds) {
    return cardIds.reduce(function (rects, cardId) {
        const card = cardElementById(cardId);
        if (card) {
            rects[cardId] = card.getBoundingClientRect();
        }
        return rects;
    }, {});
};

const stripCloneIdentity = function (clone) {
    ["id", "name", "data-action", "data-card-id", "aria-pressed"].forEach(function (attribute) {
        clone.removeAttribute(attribute);
    });
    clone.querySelectorAll("[id]").forEach(function (child) {
        child.removeAttribute("id");
    });
    clone.querySelectorAll("a, button, input, select, textarea, [tabindex]").forEach(function (child) {
        child.setAttribute("tabindex", "-1");
    });
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("tabindex", "-1");
    clone.inert = true;
};

const createFlightCard = function (source) {
    const rect = source.getBoundingClientRect();
    const clone = source.cloneNode(true);
    stripCloneIdentity(clone);
    clone.classList.remove("selected", "card-source-hidden");
    clone.classList.add("flight-card");
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = "0";
    clone.style.transform = "none";
    element("flight-layer").append(clone);
    source.classList.add("card-source-hidden");
    return {clone, rect};
};

const animateSelectedExit = async function (previousGame, kind) {
    const previewRect = element("preview").getBoundingClientRect();
    const selected = previousGame.selectedCardIds.map(cardElementById).filter(Boolean);
    await Promise.all(selected.map(function (source, index) {
        const flight = createFlightCard(source);
        const delay = index * 16;
        const duration = 260 - delay;
        const centreX = flight.rect.left + flight.rect.width / 2;
        const centreY = flight.rect.top + flight.rect.height / 2;
        let endX;
        let endY;
        let rotation;
        let keyframes;
        if (kind === "perform") {
            endX = previewRect.left + previewRect.width / 2 - centreX;
            endY = previewRect.top + previewRect.height / 2 - centreY;
            rotation = (index - (selected.length - 1) / 2) * 9;
            flight.clone.classList.add("card-performing");
            keyframes = [
                {transform: "translate(0, 0) scale(1)", opacity: 1, filter: "brightness(1)"},
                {transform: `translate(${endX * 0.35}px, ${endY * 0.3 - 34}px) scale(1.06)`, opacity: 1, filter: "brightness(1.15)", offset: 0.48},
                {transform: `translate(${endX}px, ${endY}px) scale(0.28) rotate(${rotation}deg)`, opacity: 0, filter: "brightness(1.8) blur(2px)"}
            ];
        } else {
            endX = (index % 2 === 0 ? -1 : 1) * Math.max(180, window.innerWidth * 0.22);
            endY = window.innerHeight - flight.rect.top + 100;
            rotation = (index % 2 === 0 ? -1 : 1) * (34 + index * 5);
            flight.clone.classList.add("card-rehearsing");
            keyframes = [
                {transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1},
                {transform: `translate(${endX * 0.28}px, 22px) rotate(${rotation * 0.28}deg) scale(0.96)`, opacity: 1, offset: 0.4},
                {transform: `translate(${endX}px, ${endY}px) rotate(${rotation}deg) scale(0.68)`, opacity: 0}
            ];
        }
        return runAnimation(flight.clone, keyframes, {
            duration,
            delay,
            easing: "cubic-bezier(.3,.05,.35,1)"
        });
    }));
    element("flight-layer").replaceChildren();
};

const animateCardTransform = function (card, keyframes, duration, delay) {
    return runAnimation(card, keyframes, {
        duration,
        delay,
        easing: "cubic-bezier(.2,.8,.2,1)",
        composite: "add"
    });
};

const animateCardOpacity = function (card, duration, delay) {
    return runAnimation(card, [{opacity: 0}, {opacity: 1}], {
        duration,
        delay,
        easing: "ease-out"
    });
};

const animatePostRender = async function (oldHandIds, oldRects, oldScrollLeft, kind) {
    const handElement = element("hand");
    handElement.scrollLeft = oldScrollLeft;
    const newHandIds = game.hand.map(function (card) {
        return card.id;
    });
    const enteringIds = newHandIds.filter(function (cardId) {
        return !oldHandIds.includes(cardId);
    });
    const retainedIds = newHandIds.filter(function (cardId) {
        return Boolean(oldRects[cardId]);
    });
    const animations = [];
    retainedIds.forEach(function (cardId) {
        const card = cardElementById(cardId);
        if (card) {
            const nextRect = card.getBoundingClientRect();
            const deltaX = oldRects[cardId].left - nextRect.left;
            const deltaY = oldRects[cardId].top - nextRect.top;
            card.classList.add("card-retained");
            animations.push(animateCardTransform(card, [
                {transform: `translate(${deltaX}px, ${deltaY}px)`},
                {transform: "translate(0, 0)"}
            ], 190, 0));
        }
    });
    enteringIds.forEach(function (cardId, index) {
        const card = cardElementById(cardId);
        if (card) {
            const delay = index * 12;
            const duration = 190 - delay;
            const fromX = kind === "rehearse" ? 55 : 0;
            card.classList.add("card-entering");
            animations.push(animateCardTransform(card, [
                {transform: `translate(${fromX}px, 58px) scale(.82)`},
                {transform: "translate(0, 0) scale(1)"}
            ], duration, delay));
            animations.push(animateCardOpacity(card, duration, delay));
        }
    });
    await Promise.all(animations);
};

const animateRewindBefore = async function () {
    const overlay = element("phase-overlay");
    const overlayContent = element("overlay-content");
    overlay.classList.add("is-animation-closing");
    await runAnimation(overlayContent, [
        {transform: "scale(1)", opacity: 1, filter: "blur(0)"},
        {transform: "scale(.96)", opacity: 0, filter: "blur(5px)"}
    ], {
        duration: 100,
        easing: "ease-in"
    });
    overlay.hidden = true;
    const handElement = element("hand");
    handElement.classList.add("hand-rewinding");
    await runAnimation(handElement, [
        {transform: "scale(1)", opacity: 1, filter: "blur(0)"},
        {transform: "scale(.92) translateY(12px)", opacity: 0.35, filter: "blur(6px)"}
    ], {
        duration: 180,
        easing: "cubic-bezier(.4,0,.8,.25)"
    });
};

const animateRewindAfter = async function (oldScrollLeft) {
    const handElement = element("hand");
    handElement.scrollLeft = oldScrollLeft;
    const cards = Array.from(handElement.querySelectorAll("[data-card-id]"));
    await Promise.all(cards.flatMap(function (card, index) {
        const delay = index * 12;
        const duration = 270 - delay;
        card.classList.add("card-entering");
        return [
            animateCardTransform(card, [
                {transform: `translateY(-42px) scale(.84) rotate(${(index - 3.5) * -2}deg)`},
                {transform: "translateY(0) scale(1) rotate(0deg)"}
            ], duration, delay),
            animateCardOpacity(card, duration, delay)
        ];
    }));
};

const cleanupAnimationState = function () {
    activeAnimations.forEach(function (animation) {
        animation.cancel();
    });
    activeAnimations = [];
    element("flight-layer").replaceChildren();
    document.querySelectorAll(".card-source-hidden, .card-entering, .card-retained, .hand-rewinding").forEach(function (target) {
        target.classList.remove("card-source-hidden", "card-entering", "card-retained", "hand-rewinding");
    });
    const overlay = element("phase-overlay");
    overlay.classList.remove("is-animation-closing");
    overlay.hidden = game.phase === "playing";
    setBusy(false);
};

const runAnimatedAction = async function (action, options) {
    if (uiBusy) {
        return;
    }
    const previousGame = game;
    const nextGame = action(previousGame);
    const focus = focusForState(nextGame, options.preferredFocus);
    const message = nextGame.lastError
        ? null
        : typeof options.message === "function"
        ? options.message(previousGame, nextGame)
        : options.message;
    if (nextGame.lastError || prefersReducedMotion()) {
        acceptState(nextGame, focus, message);
        return;
    }
    const oldHandIds = previousGame.hand.map(function (card) {
        return card.id;
    });
    const retainedIds = oldHandIds.filter(function (cardId) {
        return !previousGame.selectedCardIds.includes(cardId);
    });
    const oldRects = captureCardRects(retainedIds);
    const oldScrollLeft = element("hand").scrollLeft;
    setBusy(true);
    try {
        if (options.kind === "rewind") {
            await runAnimationPhase("Rewind exit", animateRewindBefore);
        } else {
            await runAnimationPhase("Card exit", function () {
                return animateSelectedExit(previousGame, options.kind);
            });
        }
        acceptState(nextGame, focus, message);
        element("hand").scrollLeft = oldScrollLeft;
        if (options.kind === "rewind") {
            await runAnimationPhase("Rewind return", function () {
                return animateRewindAfter(oldScrollLeft);
            });
        } else if (nextGame.phase === "playing") {
            await runAnimationPhase("Card layout", function () {
                return animatePostRender(oldHandIds, oldRects, oldScrollLeft, options.kind);
            });
        }
    } finally {
        cleanupAnimationState();
        focusRequestedElement();
    }
};

const handleAction = function (action, target) {
    if (action === "start") {
        acceptState(Game.startGame(game), "first-role", "The opening audition begins.");
    } else if (action === "choose-role") {
        const roleId = target.dataset.roleId;
        const name = Game.getAuditionCandidates(game).find((role) => role.id === roleId).name;
        acceptState(Game.chooseRole(game, roleId), "first-card", `${name} joins the cast.`);
    } else if (action === "toggle-card") {
        acceptState(Game.toggleCardSelection(game, target.dataset.cardId), null, null);
    } else if (action === "perform") {
        runAnimatedAction(Game.performScene, {
            kind: "perform",
            preferredFocus: "first-card",
            message: function (previousGame, nextGame) {
                return `Scene ${previousGame.sceneNumber} performed for ${nextGame.lastSceneResult.totalScore} applause.`;
            }
        });
    } else if (action === "rehearse") {
        runAnimatedAction(Game.rehearse, {
            kind: "rehearse",
            preferredFocus: "first-card",
            message: "The selected cards were rehearsed and replaced."
        });
    } else if (action === "confirm") {
        const nextGame = Game.confirmScene(game);
        acceptState(nextGame, focusForState(nextGame, "first-card"), "The scene remains in the programme.");
    } else if (action === "rewind") {
        runAnimatedAction(Game.rewindScene, {
            kind: "rewind",
            preferredFocus: "selected-card",
            message: "The scene was restored. The previous selection remains active."
        });
    } else if (action === "continue") {
        acceptState(Game.continueAfterAct(game), "first-role", "Intermission audition opened.");
    } else if (action === "restart") {
        acceptState(Game.restartGame(game), "start", "The theatre has been reset.");
    } else if (action === "move-role") {
        const roleId = target.dataset.roleId;
        acceptState(Game.moveRole(game, roleId, target.dataset.direction), null, `${roleId} moved ${target.dataset.direction}.`);
    }
};

document.addEventListener("click", function (event) {
    if (uiBusy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
    }
    const target = event.target.closest("[data-action]");
    if (target && !target.disabled) {
        handleAction(target.dataset.action, target);
    }
});

document.addEventListener("keydown", function (event) {
    if (uiBusy) {
        const blockedKeys = ["tab", " ", "enter", "p", "r", "k", "z", "arrowleft", "arrowright"];
        if (blockedKeys.includes(event.key.toLowerCase())) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        return;
    }
    const tag = event.target.tagName;
    if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || event.target.isContentEditable) {
        return;
    }
    const key = event.key.toLowerCase();
    const actions = Game.getAvailableActions(game);
    if (event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        const roleCard = event.target.closest("[data-role-id]");
        if (roleCard) {
            event.preventDefault();
            acceptState(Game.moveRole(game, roleCard.dataset.roleId, event.key === "ArrowLeft" ? "left" : "right"), null, "Cast order changed.");
        }
        return;
    }
    if (!event.shiftKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        const cards = [...document.querySelectorAll("[data-action='toggle-card']:not(:disabled)")];
        const index = cards.indexOf(document.activeElement);
        if (index >= 0) {
            event.preventDefault();
            const delta = event.key === "ArrowLeft" ? -1 : 1;
            cards[(index + delta + cards.length) % cards.length].focus();
        }
        return;
    }
    const shortcuts = {
        p: ["perform", "perform"],
        r: ["rehearse", "rehearse"],
        k: ["confirm", "confirm"],
        z: ["rewind", "rewind"]
    };
    if (shortcuts[key] && actions.includes(shortcuts[key][0])) {
        event.preventDefault();
        const button = document.querySelector(`[data-action='${shortcuts[key][1]}']`);
        if (button && !button.disabled) {
            button.click();
        }
    }
});

render();
