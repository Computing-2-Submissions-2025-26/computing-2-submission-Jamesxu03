import assert from "node:assert/strict";
import Game from "../Module.js";
import {startPlaying, withSelectedHand} from "./helpers.js";

describe("Resolution pipeline", function () {
    it("uses Twin Mask's final type for Faceless memory", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["twinMask", "faceless"],
            sceneNumber: 2,
            previousHandType: "StraightFlush"
        }, ["H-2", "D-3", "H-4", "D-5", "H-6"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.finalEvaluation.type, "StraightFlush");
        assert.equal(preview.repeated, false);
        assert.equal(preview.triggeredRoleIds.includes("faceless"), true);
    });

    it("short-circuits a banned final type before role resources", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["witnesses"],
            bannedHandTypes: ["HighCard"]
        }, ["S-9"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.valid, false);
        assert.equal(preview.errorCode, "HAND_TYPE_FORBIDDEN");
        assert.deepEqual(preview.triggeredRoleIds, []);
        assert.deepEqual(preview.resourceChanges.witnessedHandTypesAdded, []);
    });
});

