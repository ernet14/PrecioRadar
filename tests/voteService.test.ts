import assert from "node:assert/strict";
import test from "node:test";
import { summarizeVotes } from "../src/services/voteService";

test("summarizeVotes cuenta votos reales (1) y falsos (-1)", () => {
  assert.deepEqual(summarizeVotes([1, 1, -1, 1]), { real: 3, fake: 1, total: 4 });
});

test("summarizeVotes con lista vacía", () => {
  assert.deepEqual(summarizeVotes([]), { real: 0, fake: 0, total: 0 });
});

test("summarizeVotes ignora ceros como no contables", () => {
  assert.deepEqual(summarizeVotes([0, 1, -1]), { real: 1, fake: 1, total: 2 });
});
