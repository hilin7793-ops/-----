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

  const defaultQueryOptions = buildQueryOptions({});
  assert.equal(defaultQueryOptions.sortBy, null);
  assert.equal(defaultQueryOptions.sortDirection, "asc");
  assert.equal(defaultQueryOptions.limit, null);
  assert.equal(defaultQueryOptions.offset, 0);

  const mixedQueryOptions = buildQueryOptions({
    sortBy: undefined,
    sortDirection: null,
    limit: undefined,
    offset: null,
  });
  assert.equal(mixedQueryOptions.sortBy, null);
  assert.equal(mixedQueryOptions.sortDirection, "asc");
  assert.equal(mixedQueryOptions.limit, null);
  assert.equal(mixedQueryOptions.offset, null);

  const fallbackBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortDirection: "desc",
    limit: "9",
    offset: "4",
  });
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.sortBy, null);
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.limit, "9");
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxList.offset, "4");
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, null);
  assert.equal(fallbackBlindBoxQueryOptions.blindBoxEffectLogList.sortDirection, "desc");
  assert.equal(fallbackBlindBoxQueryOptions.recordList.sortBy, null);
  assert.equal(fallbackBlindBoxQueryOptions.recordList.sortDirection, "desc");

  const mixedBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortBy: "createdAt",
    sortDirection: null,
    limit: undefined,
    offset: undefined,
    blindBoxSortBy: undefined,
    blindBoxSortDirection: "desc",
    effectLogSortBy: "effectCreatedAt",
    recordLimit: "4",
  });
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.sortBy, "createdAt");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.sortDirection, "asc");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.limit, null);
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.offset, 0);
  assert.equal(mixedBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, "effectCreatedAt");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxEffectLogList.sortDirection, "desc");
  assert.equal(mixedBlindBoxQueryOptions.recordList.sortBy, "createdAt");
  assert.equal(mixedBlindBoxQueryOptions.recordList.sortDirection, "asc");
  assert.equal(mixedBlindBoxQueryOptions.recordList.limit, "4");
  assert.equal(mixedBlindBoxQueryOptions.recordList.offset, 0);

  const overrideBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({
    sortBy: "createdAt",
    sortDirection: "asc",
    limit: "7",
    offset: "2",
    blindBoxSortBy: "openedAt",
    blindBoxSortDirection: "desc",
    blindBoxLimit: "1",
    blindBoxOffset: "5",
    effectLogSortBy: "effectCreatedAt",
    effectLogSortDirection: "asc",
    effectLogLimit: "3",
    effectLogOffset: "6",
    recordSortBy: "recordCreatedAt",
    recordSortDirection: "desc",
    recordLimit: "4",
    recordOffset: "8",
  });
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.sortBy, "openedAt");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.limit, "1");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxList.offset, "5");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, "effectCreatedAt");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.sortDirection, "asc");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.limit, "3");
  assert.equal(overrideBlindBoxQueryOptions.blindBoxEffectLogList.offset, "6");
  assert.equal(overrideBlindBoxQueryOptions.recordList.sortBy, "recordCreatedAt");
  assert.equal(overrideBlindBoxQueryOptions.recordList.sortDirection, "desc");
  assert.equal(overrideBlindBoxQueryOptions.recordList.limit, "4");
  assert.equal(overrideBlindBoxQueryOptions.recordList.offset, "8");

  const normalValue = randomNormal({
    average: 10,
    standardDeviation: 2,
    rng: (() => {
      const values = [0.25, 0.75];
      let index = 0;
      return () => values[index++] ?? 0.5;
    })(),
  });
  assert.equal(Number.isFinite(normalValue), true);

  assert.equal(snapToStep(12, 5, 0), 10);
  assert.equal(snapToStep(13, 5, 0), 15);
  assert.equal(snapToStep(13, 5, 3), 13);
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
  assert.equal(
    randomSteppedNormal({
      average: 999,
      standardDeviation: 0,
      step: 5,
      minValue: 0,
      maxValue: 20,
      rng: () => 0.5,
    }),
    20,
  );

  assert.equal(pickWeightedItem([["a", 0], ["b", -1]]), null);
  assert.equal(pickWeightedItem([["a", 1], ["b", 2]], () => 0), "a");
  assert.equal(pickWeightedItem([["a", 1], ["b", 2]], () => 0.9999), "b");
  assert.equal(pickWeightedItem([["a", 1], ["b", 0], ["c", 2]], () => 0.33), "b");
}

run();
