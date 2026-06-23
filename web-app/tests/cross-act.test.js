import assert from "node:assert/strict";
import Game from "../Module.js";
import {startPlaying, withSelectedHand} from "./helpers.js";

describe("Act boundaries", function () {
    it("resets act state while preserving run state and cast", function () {
        let game = withSelectedHand({
            ...startPlaying(),
            sceneNumber: 5,
            actScore: 1000,
            runScore: 1200,
            varietyLevel: 3,
            witnessedHandTypes: ["Pair"],
            bannedHandTypes: ["Flush"]
        }, ["S-9"]);
        game = Game.performScene(game);
        assert.equal(game.phase, "act-complete");
        const audition = Game.continueAfterAct(game);
        const next = Game.chooseRole(audition, audition.offeredRoleIds[0]);
        assert.equal(next.currentAct, 2);
        assert.equal(next.sceneNumber, 1);
        assert.equal(next.actScore, 0);
        assert.equal(next.runScore > 1200, true);
        assert.equal(next.varietyLevel, 0);
        assert.deepEqual(next.timeline, []);
        assert.deepEqual(next.bannedHandTypes, []);
        assert.deepEqual(next.witnessedHandTypes, ["Pair", "HighCard"]);
        assert.equal(next.hand.length, 8);
        assert.equal(next.drawPile.length, 44);
    });
});
