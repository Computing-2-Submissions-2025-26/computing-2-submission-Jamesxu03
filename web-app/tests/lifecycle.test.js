import assert from "node:assert/strict";
import Game from "../Module.js";

describe("Game lifecycle", function () {
    it("creates an undealt title state", function () {
        const game = Game.createGame("opening-night");
        assert.equal(game.phase, "title");
        assert.deepEqual(game.hand, []);
        assert.deepEqual(game.drawPile, []);
        assert.deepEqual(Game.getAvailableActions(game), ["start"]);
    });

    it("opens an audition without dealing cards", function () {
        const game = Game.startGame(Game.createGame(123456));
        assert.equal(game.phase, "audition");
        assert.equal(game.auditionType, "opening");
        assert.equal(game.offeredRoleIds.length, 3);
        assert.equal(game.hand.length, 0);
    });

    it("deals eight cards and leaves forty-four after choosing a role", function () {
        const audition = Game.startGame(Game.createGame(123456));
        const game = Game.chooseRole(audition, audition.offeredRoleIds[0]);
        assert.equal(game.phase, "playing");
        assert.equal(game.hand.length, 8);
        assert.equal(game.drawPile.length, 44);
        assert.equal(game.discardPile.length, 0);
        assert.equal(game.castSlots.length, 1);
    });

    it("restarts reproducibly from every phase", function () {
        const playing = Game.chooseRole(
            Game.startGame(Game.createGame(55)),
            Game.startGame(Game.createGame(55)).offeredRoleIds[0]
        );
        assert.deepEqual(Game.restartGame(playing), Game.createGame(55));
    });
});

