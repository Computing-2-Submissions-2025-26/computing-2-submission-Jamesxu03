import assert from "node:assert/strict";
import Game from "../Module.js";
import {deepFreeze, startPlaying} from "./helpers.js";

describe("Public API contract", function () {
    it("returns WRONG_PHASE from state transitions", function () {
        const title = Game.createGame(1);
        [
            Game.chooseRole(title, "faceless"),
            Game.moveRole(title, "faceless", "left"),
            Game.toggleCardSelection(title, "S-1"),
            Game.performScene(title),
            Game.confirmScene(title),
            Game.rewindScene(title),
            Game.rehearse(title),
            Game.continueAfterAct(title)
        ].forEach((state) => assert.equal(state.lastError.code, "WRONG_PHASE"));
    });

    it("provides dynamic action and card queries", function () {
        const game = startPlaying();
        assert.deepEqual(Game.getAvailableActions(game), ["toggle-card"]);
        assert.equal(Game.getSelectableCardIds(game).length, 8);
        const selected = Game.toggleCardSelection(game, game.hand[0].id);
        assert.equal(Game.getAvailableActions(selected).includes("perform"), true);
        assert.equal(Game.getAvailableActions(selected).includes("rehearse"), true);
    });

    it("reports role move errors and legal directions", function () {
        const game = {...startPlaying(), castSlots: ["witnesses", "faceless"]};
        assert.deepEqual(Game.getMovableDirections(game, "witnesses"), ["right"]);
        assert.equal(Game.moveRole(game, "witnesses", "left").lastError.code, "MOVE_OUT_OF_BOUNDS");
        assert.equal(Game.moveRole(game, "missing", "right").lastError.code, "ROLE_NOT_IN_CAST");
        assert.equal(Game.moveRole(game, "witnesses", "up").lastError.code, "INVALID_DIRECTION");
    });

    it("does not mutate frozen state", function () {
        const game = deepFreeze(startPlaying());
        const next = Game.toggleCardSelection(game, game.hand[0].id);
        assert.notEqual(next, game);
        assert.deepEqual(game.selectedCardIds, []);
    });
});

