import assert from "node:assert/strict";
import Game from "../Module.js";

describe("Deterministic random state", function () {
    it("matches the frozen ABCDE shuffle", function () {
        assert.deepEqual(Game.shuffleWithSeed(123456, [
            "A", "B", "C", "D", "E"
        ]), {
            shuffled: ["C", "B", "D", "E", "A"],
            rngState: 2406627700
        });
    });

    it("matches the frozen deck sample", function () {
        const result = Game.shuffleWithSeed(123456, Game.createDeck());
        assert.deepEqual(result.shuffled.slice(0, 5).map((card) => card.id), [
            "D-1", "C-7", "H-5", "H-2", "D-4"
        ]);
        assert.equal(result.rngState, 974027225);
    });

    it("does not consume state for lists shorter than two", function () {
        assert.deepEqual(Game.shuffleWithSeed(99, []), {
            rngState: 99,
            shuffled: []
        });
        assert.deepEqual(Game.shuffleWithSeed(99, ["A"]), {
            rngState: 99,
            shuffled: ["A"]
        });
    });

    it("creates the frozen opening queue", function () {
        const game = Game.createGame(123456);
        assert.equal(game.rngState, 2406627700);
        assert.deepEqual(game.auditionQueue, [
            "witnesses", "faceless", "twinMask", "marionette", "lastEntrant"
        ]);
    });
});

