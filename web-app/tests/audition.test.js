import assert from "node:assert/strict";
import Game from "../Module.js";

describe("Audition queue", function () {
    it("never offers the Director at the opening", function () {
        const game = Game.startGame(Game.createGame(123456));
        assert.equal(game.offeredRoleIds.includes("curtainDirector"), false);
    });

    it("moves unchosen roles behind untouched roles and inserts Director", function () {
        const audition = Game.startGame(Game.createGame(123456));
        const game = Game.chooseRole(audition, "faceless");
        assert.deepEqual(game.auditionQueue, [
            "marionette",
            "lastEntrant",
            "witnesses",
            "curtainDirector",
            "twinMask"
        ]);
        assert.equal(game.auditionQueue.includes("faceless"), false);
    });

    it("uses stable error precedence", function () {
        const audition = {
            ...Game.startGame(Game.createGame(1)),
            castSlots: ["witnesses"]
        };
        assert.equal(
            Game.chooseRole(audition, "witnesses").lastError.code,
            "ROLE_ALREADY_RECRUITED"
        );
        const full = {...audition, castSlots: ["witnesses", "faceless", "twinMask"]};
        assert.equal(Game.chooseRole(full, "marionette").lastError.code, "CAST_FULL");
        assert.equal(Game.chooseRole(audition, "unknown").lastError.code, "INVALID_CHOICE");
    });

    it("returns definitions only during an audition", function () {
        const title = Game.createGame(1);
        assert.deepEqual(Game.getAuditionCandidates(title), []);
        assert.equal(Game.getAuditionCandidates(Game.startGame(title)).length, 3);
    });
});

