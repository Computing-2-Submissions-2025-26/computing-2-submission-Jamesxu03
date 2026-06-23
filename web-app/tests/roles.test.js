import assert from "node:assert/strict";
import Game from "../Module.js";
import {startPlaying, withSelectedHand} from "./helpers.js";

describe("Role effects", function () {
    it("stores the Last Entrant's first-scene applause", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["lastEntrant"]
        }, ["S-10"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.totalScore, 7);
        assert.equal(preview.resourceChanges.delayedApplause.after, 8);
        assert.equal(preview.triggeredRoleIds.includes("lastEntrant"), true);
    });

    it("lets Faceless absorb one repeated final hand", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["faceless"],
            sceneNumber: 2,
            previousHandType: "Pair",
            varietyLevel: 0
        }, ["S-5", "H-5"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.repeated, false);
        assert.equal(preview.varietyAfter, 1);
        assert.equal(preview.triggeredRoleIds.includes("faceless"), true);
    });

    it("records new hands and restores every third Witness discovery", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["witnesses"],
            witnessedHandTypes: ["Pair", "TwoPair"],
            rehearsals: 0
        }, ["S-9"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.triggeredRoleIds.includes("witnesses"), true);
        assert.equal(preview.resourceChanges.rehearsals.after, 1);
        assert.deepEqual(preview.resourceChanges.witnessedHandTypesAdded, ["HighCard"]);
    });

    it("uses Twin Mask virtual suits only for a strict upgrade", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["twinMask"]
        }, ["H-2", "D-3", "H-4", "D-5", "H-6"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.naturalEvaluation.type, "Straight");
        assert.equal(preview.finalEvaluation.type, "StraightFlush");
        assert.equal(preview.triggeredRoleIds.includes("twinMask"), true);
    });

    it("lets Director observe only its left neighbour's trigger", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["witnesses", "curtainDirector"],
            roleState: {
                ...startPlaying().roleState,
                curtainDirector: {cueTokens: 0}
            }
        }, ["S-9"]);
        const preview = Game.previewScene(game);
        assert.equal(preview.resourceChanges.directorCueTokens.after, 1);
        assert.equal(preview.triggeredRoleIds.includes("curtainDirector"), true);
    });

    it("flips Twin Mask only after a valid rehearsal", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["twinMask"]
        }, ["S-9"]);
        assert.equal(Game.rehearse(game).roleState.twinMask.face, "tragedy");
    });
});

