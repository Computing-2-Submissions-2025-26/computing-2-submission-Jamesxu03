import assert from "node:assert/strict";
import Game from "../Module.js";

export const card = (id) => Game.createDeck().find((item) => item.id === id);

export const cards = (ids) => ids.map(card);

export const startPlaying = function (seed = 123456) {
    const audition = Game.startGame(Game.createGame(seed));
    return Game.chooseRole(audition, audition.offeredRoleIds[0]);
};

export const withSelectedHand = function (game, ids) {
    const hand = cards(ids);
    const excluded = hand.map((item) => item.id);
    const drawPile = Game.createDeck().filter(
        (item) => !excluded.includes(item.id)
    );
    return {
        ...game,
        phase: "playing",
        hand,
        drawPile,
        discardPile: [],
        selectedCardIds: [...ids],
        lastError: null
    };
};

export const deepFreeze = function (value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.getOwnPropertyNames(value).forEach(function (name) {
            deepFreeze(value[name]);
        });
        Object.freeze(value);
    }
    return value;
};

export const assertUnchanged = function (before, after) {
    assert.deepEqual(after, before);
};

