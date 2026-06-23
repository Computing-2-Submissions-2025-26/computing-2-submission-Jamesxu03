import Game from "../Module.js";

const RUNS = Number(process.env.SIM_RUNS || 2000);
const POLICY_OFFSET = 2654435761;

const nextPolicyRandom = function (state) {
    const next = (
        Math.imul(1664525, state >>> 0) + 1013904223
    ) >>> 0;
    return {state: next, value: next / 4294967296};
};

const combinations = function (items, maximum = 5) {
    const output = [];
    const visit = function (start, selected) {
        if (selected.length > 0) {
            output.push(selected);
        }
        if (selected.length === maximum) {
            return;
        }
        let index = start;
        while (index < items.length) {
            visit(index + 1, [...selected, items[index]]);
            index += 1;
        }
    };
    visit(0, []);
    return output;
};

const bestScene = function (game, heuristic) {
    return combinations(game.hand.map((card) => card.id)).map(function (ids) {
        const candidate = {...game, selectedCardIds: ids};
        const preview = Game.previewScene(candidate);
        const novelty = (
            preview.valid &&
            !game.timeline.some((entry) => entry.final === preview.finalEvaluation.type)
            ? 7
            : 0
        );
        return {
            candidate,
            preview,
            utility: preview.valid
                ? preview.totalScore + (heuristic ? novelty : 0)
                : -Infinity
        };
    }).sort((left, right) => right.utility - left.utility)[0];
};

const roleWeight = function (roleId, cast) {
    const base = {
        lastEntrant: 7,
        faceless: 5,
        witnesses: 6,
        twinMask: 6,
        marionette: 4,
        curtainDirector: 2
    }[roleId];
    if (roleId === "curtainDirector" && cast.length > 0) {
        return base + 7;
    }
    if (roleId === "faceless" && cast.includes("witnesses")) {
        return base + 2;
    }
    return base;
};

const chooseOfferedRole = function (game, policy, policyRandom) {
    if (policy === "first" || policy === "baseline") {
        return {roleId: game.offeredRoleIds[0], policyRandom};
    }
    if (policy === "random") {
        const random = nextPolicyRandom(policyRandom);
        return {
            roleId: game.offeredRoleIds[
                Math.floor(random.value * game.offeredRoleIds.length)
            ],
            policyRandom: random.state
        };
    }
    return {
        roleId: [...game.offeredRoleIds].sort(
            (left, right) => (
                roleWeight(right, game.castSlots) -
                roleWeight(left, game.castSlots)
            )
        )[0],
        policyRandom
    };
};

const arrangeDirector = function (game) {
    const directorIndex = game.castSlots.indexOf("curtainDirector");
    if (directorIndex < 0) {
        return game;
    }
    const triggerOrder = ["lastEntrant", "witnesses", "twinMask", "faceless"];
    const desiredLeft = triggerOrder.find((roleId) => game.castSlots.includes(roleId));
    if (!desiredLeft) {
        return game;
    }
    const remaining = game.castSlots.filter(
        (roleId) => roleId !== desiredLeft && roleId !== "curtainDirector"
    );
    return {
        ...game,
        castSlots: [desiredLeft, "curtainDirector", ...remaining]
    };
};

const rehearseLowCards = function (game) {
    const ids = [...game.hand].sort((left, right) => left.value - right.value)
        .slice(0, Math.min(5, game.hand.length))
        .map((card) => card.id);
    return Game.rehearse({...game, selectedCardIds: ids});
};

const playRun = function (seed, policy) {
    let game = Game.startGame(Game.createGame(seed));
    let policyRandom = (Number(seed) + POLICY_OFFSET) >>> 0;
    const reached = [false, false, false];
    const passed = [false, false, false];
    let repeatedScenes = 0;
    let varietyThreeScenes = 0;
    const triggers = {};
    const actScores = [null, null, null];
    let safety = 0;

    while (!Game.isGameOver(game) && safety < 80) {
        safety += 1;
        if (game.phase === "audition") {
            const choice = chooseOfferedRole(game, policy, policyRandom);
            policyRandom = choice.policyRandom;
            game = Game.chooseRole(game, choice.roleId);
            if (policy === "baseline") {
                game = {...game, castSlots: []};
            } else if (policy === "heuristic") {
                game = arrangeDirector(game);
            }
            reached[game.currentAct - 1] = true;
            continue;
        }
        if (game.phase === "act-complete") {
            actScores[game.currentAct - 1] = game.actScore;
            passed[game.currentAct - 1] = true;
            game = Game.continueAfterAct(game);
            continue;
        }
        if (game.phase === "scene-pending") {
            const requiredPace = (
                Game.getActTarget(game) - game.actScore
            ) / Math.max(1, 5 - game.sceneNumber);
            const shouldRewind = (
                policy === "heuristic" &&
                game.pendingScene.resolution.totalScore < requiredPace * 0.7
            );
            game = shouldRewind
                ? Game.rewindScene(game)
                : Game.confirmScene(game);
            continue;
        }
        if (game.phase !== "playing") {
            break;
        }
        const best = bestScene(game, policy === "heuristic");
        const requiredPace = (
            Game.getActTarget(game) - game.actScore
        ) / Math.max(1, 6 - game.sceneNumber);
        if (
            game.rehearsals > 0 &&
            best.preview.totalScore < requiredPace * 0.72
        ) {
            game = rehearseLowCards(game);
            continue;
        }
        game = Game.performScene(best.candidate);
        const result = game.lastSceneResult;
        if (result) {
            repeatedScenes += result.repeated ? 1 : 0;
            varietyThreeScenes += result.varietyAfter === 3 ? 1 : 0;
            result.triggeredRoleIds.forEach(function (roleId) {
                triggers[roleId] = (triggers[roleId] || 0) + 1;
            });
        }
    }
    if (game.phase === "won") {
        actScores[2] = game.actScore;
        passed[2] = true;
    } else if (game.phase === "lost") {
        actScores[game.currentAct - 1] = game.actScore;
    }
    return {
        reached,
        passed,
        won: game.phase === "won",
        repeatedScenes,
        varietyThreeScenes,
        triggers,
        actScores
    };
};

const summarise = function (policy) {
    const results = Array.from({length: RUNS}, (_, index) => (
        playRun(index + 1, policy)
    ));
    const count = (predicate) => results.filter(predicate).length;
    const reached = [0, 1, 2].map((act) => count((result) => result.reached[act]));
    const passed = [0, 1, 2].map((act) => count((result) => result.passed[act]));
    const totalScenes = reached.reduce((sum, value) => sum + value * 5, 0);
    const triggers = {};
    results.forEach((result) => Object.entries(result.triggers).forEach(
        ([roleId, amount]) => {
            triggers[roleId] = (triggers[roleId] || 0) + amount;
        }
    ));
    return {
        runs: RUNS,
        actOnePass: passed[0] / RUNS,
        actTwoConditional: reached[1] ? passed[1] / reached[1] : 0,
        actThreeConditional: reached[2] ? passed[2] / reached[2] : 0,
        fullRunWin: count((result) => result.won) / RUNS,
        repeatedSceneRate: results.reduce(
            (sum, result) => sum + result.repeatedScenes,
            0
        ) / Math.max(1, totalScenes),
        varietyThreeRate: results.reduce(
            (sum, result) => sum + result.varietyThreeScenes,
            0
        ) / Math.max(1, totalScenes),
        triggers,
        averageActScores: [0, 1, 2].map(function (act) {
            const scores = results.map((result) => result.actScores[act]).filter(
                (score) => score !== null
            );
            return scores.reduce((sum, score) => sum + score, 0) /
                Math.max(1, scores.length);
        })
    };
};

const report = {
    baseline: summarise("baseline"),
    firstOffer: summarise("first"),
    randomOffer: summarise("random"),
    heuristic: summarise("heuristic")
};

console.log(JSON.stringify(report, null, 2));
