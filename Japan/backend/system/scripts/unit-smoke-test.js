import assert from "node:assert/strict";

import { buildBlindBoxReviewQueryOptions, buildQueryOptions } from "../src/api/queryOptions.js";
import { pickWeightedItem, randomNormal, randomSteppedNormal, snapToStep } from "../src/utils/random.js";

function run() {
  const basicQueryOptions = buildQueryOptions({
    sortBy: "createdAt",
    sortDirection: "desc",
    limit: "2",
    offset: "3",
  });
  assert.equal(basicQueryOptions.sortBy, "createdAt");
  assert.equal(basicQueryOptions.sortDirection, "desc");
  assert.equal(basicQueryOptions.limit, "2");
  assert.equal(basicQueryOptions.offset, "3");

  const blindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortBy: "createdAt",
    sortDirection: "desc",
    limit: "5",
    offset: "1",
    effectLogLimit: "2",
    recordSortBy: "updatedAt",
    recordSortDirection: "asc",
  });
  assert.equal(blindBoxQueryOptions.blindBoxList.sortBy, "createdAt");
  assert.equal(blindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(blindBoxQueryOptions.blindBoxList.limit, "5");
  assert.equal(blindBoxQueryOptions.blindBoxList.offset, "1");
  assert.equal(blindBoxQueryOptions.blindBoxEffectLogList.limit, "2");
  assert.equal(blindBoxQueryOptions.recordList.sortBy, "updatedAt");
  assert.equal(blindBoxQueryOptions.recordList.sortDirection, "asc");

  const normalValue = randomNormal({
    average: 10,
    standardDeviation: 2,
    rng: () => 0.5,
  });
  assert.equal(Number.isFinite(normalValue), true);

  assert.equal(snapToStep(12, 5, 0), 10);
  assert.equal(snapToStep(13, 5, 0), 15);
  assert.equal(snapToStep(13, 0, 0), 13);

  const steppedValue = randomSteppedNormal({
    average: 11,
    standardDeviation: 0,
    step: 5,
    minValue: 0,
    maxValue: 20,
    rng: () => 0.5,
  });
  assert.equal(steppedValue, 10);

  assert.equal(pickWeightedItem([["a", 0], ["b", -1]]), null);
  assert.equal(pickWeightedItem([["a", 1], ["b", 2]], () => 0), "a");
  assert.equal(pickWeightedItem([["a", 1], ["b", 2]], () => 0.9999), "b");
}

run();
