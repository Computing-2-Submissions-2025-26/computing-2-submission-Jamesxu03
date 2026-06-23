import assert from "node:assert/strict";
import Game from "../Module.js";
import {startPlaying, withSelectedHand} from "./helpers.js";

describe("Scene resolution", function () {
    it("awards the frozen variety sequence", function () {
        const expectations = [0, 15, 30, 45, 45];
        expectations.forEach(function (expected, index) {
            const game = withSelectedHand({
                ...startPlaying(index + 1),
                sceneNumber: index + 1,
                varietyLevel: Math.max(0, index - 1),
                previousHandType: index === 0 ? null : "Pair"
            }, ["S-9"]);
            const preview = Game.previewScene(game);
            assert.equal(
                preview.scoreItems.find((item) => item.id === "variety").amount,
                expected
            );
        });
    });

    it("removes base and resets variety for repetition", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: [],
            sceneNumber: 2,
            varietyLevel: 2,
            previousHandType: "Pair"
        }, ["S-4", "H-4"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.repeated, true);
        assert.equal(preview.varietyAfter, 0);
        assert.equal(preview.scoreItems.find((item) => item.id === "base").amount, 0);
        assert.equal(preview.totalScore, 8);
    });

    it("uses one calculation source for preview and performance", function () {
        const game = withSelectedHand(startPlaying(), ["S-10", "H-10"]);
        const preview = Game.previewScene(game);
        const performed = Game.performScene(game);
        assert.deepEqual(performed.lastSceneResult, preview);
    });

    it("does not immediately redraw rehearsed cards", function () {
        const base = withSelectedHand(startPlaying(), ["S-2"]);
        const game = {
            ...base,
            hand: [base.hand[0], ...base.drawPile.slice(2, 9)],
            drawPile: [],
            discardPile: base.drawPile.slice(0, 2),
            selectedCardIds: ["S-2"]
        };
        const rehearsed = Game.rehearse(game);
        assert.equal(rehearsed.hand.some((card) => card.id === "S-2"), false);
        assert.equal(rehearsed.discardPile.some((card) => card.id === "S-2"), true);
    });

    it("returns player errors without changing the scene", function () {
        const game = startPlaying();
        const result = Game.performScene(game);
        assert.equal(result.lastError.code, "NO_CARDS_SELECTED");
        assert.equal(result.sceneNumber, 1);
        assert.equal(result.timeline.length, 0);
    });
});

