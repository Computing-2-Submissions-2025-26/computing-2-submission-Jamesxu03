import assert from "node:assert/strict";
import Game from "../Module.js";
import {cards} from "./helpers.js";

const cases = [
    [["S-13"], "HighCard"],
    [["S-2", "H-2", "C-13"], "Pair"],
    [["S-2", "H-2", "C-5", "D-5"], "TwoPair"],
    [["S-7", "H-7", "D-7"], "ThreeOfAKind"],
    [["S-1", "H-2", "D-3", "C-4", "S-5"], "Straight"],
    [["H-2", "H-5", "H-8", "H-11", "H-13"], "Flush"],
    [["S-4", "H-4", "D-4", "C-9", "H-9"], "FullHouse"],
    [["S-6", "H-6", "D-6", "C-6", "H-12"], "FourOfAKind"],
    [["C-9", "C-10", "C-11", "C-12", "C-13"], "StraightFlush"]
];

describe("Natural hand evaluation", function () {
    cases.forEach(function ([ids, expected]) {
        it(`recognises ${expected}`, function () {
            assert.equal(Game.classifyNaturalHand(cards(ids)).type, expected);
        });
    });

    it("recognises ace-high and ace-low straights", function () {
        assert.equal(Game.classifyNaturalHand(cards([
            "S-1", "H-10", "D-11", "C-12", "S-13"
        ])).type, "Straight");
        assert.equal(Game.classifyNaturalHand(cards([
            "S-1", "H-2", "D-3", "C-4", "S-5"
        ])).type, "Straight");
    });

    it("does not recognise four suited cards as a flush", function () {
        assert.equal(Game.classifyNaturalHand(cards([
            "H-2", "H-4", "H-6", "H-8"
        ])).type, "HighCard");
    });

    it("does not recognise repeated ranks as a straight", function () {
        assert.notEqual(Game.classifyNaturalHand(cards([
            "S-2", "H-2", "D-3", "C-4", "S-5"
        ])).type, "Straight");
    });

    it("rejects zero or more than five cards", function () {
        assert.throws(() => Game.classifyNaturalHand([]), RangeError);
        assert.throws(() => Game.classifyNaturalHand(cards([
            "S-1", "S-2", "S-3", "S-4", "S-5", "S-6"
        ])), RangeError);
    });
});

