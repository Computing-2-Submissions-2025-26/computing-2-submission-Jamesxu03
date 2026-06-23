import assert from "node:assert/strict";
import Game from "../Module.js";
import {startPlaying, withSelectedHand} from "./helpers.js";

describe("Marionette retakes", function () {
    it("applies a candidate without advancing until confirmation", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["marionette"]
        }, ["S-8"]);
        const pending = Game.performScene(game);
        assert.equal(pending.phase, "scene-pending");
        assert.equal(pending.sceneNumber, 1);
        assert.equal(pending.timeline.length, 1);
        assert.equal(pending.pendingScene.snapshotBefore.pendingScene, undefined);
        assert.equal(Game.confirmScene(pending).sceneNumber, 2);
    });

    it("restores every mutable field and bans the final hand", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["marionette"]
        }, ["S-8"]);
        const pending = Game.performScene(game);
        const rewound = Game.rewindScene(pending);
        assert.equal(rewound.phase, "playing");
        assert.deepEqual(rewound.hand, game.hand);
        assert.deepEqual(rewound.drawPile, game.drawPile);
        assert.deepEqual(rewound.selectedCardIds, game.selectedCardIds);
        assert.equal(rewound.rngState, game.rngState);
        assert.equal(rewound.roleState.marionette.rewindUsed, true);
        assert.deepEqual(rewound.bannedHandTypes, ["HighCard"]);
        assert.equal(Game.previewScene(rewound).errorCode, "HAND_TYPE_FORBIDDEN");
    });

    it("does not count Marionette as a passive trigger", function () {
        const game = withSelectedHand({
            ...startPlaying(),
            castSlots: ["marionette", "curtainDirector"]
        }, ["S-8"]);
        const pending = Game.performScene(game);
        assert.equal(pending.lastSceneResult.triggeredRoleIds.includes("marionette"), false);
        assert.equal(pending.roleState.curtainDirector.cueTokens, 0);
    });
});

