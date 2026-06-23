import assert from "node:assert/strict";
import Game from "../Module.js";
import {deepFreeze, startPlaying, withSelectedHand} from "./helpers.js";

describe("Domain invariants", function () {
    it("throws rather than drawing undefined when no cards remain", function () {
        const game = withSelectedHand(startPlaying(), ["S-2"]);
        const broken = {
            ...game,
            drawPile: [],
            discardPile: []
        };
        assert.throws(
            () => Game.rehearse(broken),
            /Deck invariant violated/
        );
    });

    it("does not mutate or advance preview state", function () {
        const game = deepFreeze(withSelectedHand(startPlaying(), ["S-2"]));
        const first = Game.previewScene(game);
        const second = Game.previewScene(game);
        assert.deepEqual(first, second);
        assert.equal(game.timeline.length, 0);
    });

    it("detects duplicate and missing selected cards", function () {
        const game = withSelectedHand(startPlaying(), ["S-2"]);
        assert.equal(Game.previewScene({
            ...game,
            selectedCardIds: ["S-2", "S-2"]
        }).errorCode, "DUPLICATE_CARD_SELECTION");
        assert.equal(Game.previewScene({
            ...game,
            selectedCardIds: ["missing"]
        }).errorCode, "CARD_NOT_IN_HAND");
    });
});

