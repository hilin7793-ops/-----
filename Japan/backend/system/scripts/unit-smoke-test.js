import assert from "node:assert/strict";

import { buildBlindBoxReviewQueryOptions, buildQueryOptions } from "../src/api/queryOptions.js";
import { failure, success } from "../src/utils/result.js";
import { TransportType, normalizeTransportType } from "../src/constants/transportTypes.js";
import { pickWeightedItem, randomNormal, randomSteppedNormal, snapToStep } from "../src/utils/random.js";
import { calculateDurationMinutes, hasReachedTime, isOnAuctionStartTime, isOnTheHour, isWithinTimeRange } from "../src/services/time/timeService.js";

async function run() {
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
  assert.equal(mixedQueryOptions.offset, 0);

  const overrideQueryOptions = buildQueryOptions({
    sortBy: "departureTime",
    sortDirection: "desc",
    limit: "11",
    offset: "12",
  });
  assert.equal(overrideQueryOptions.sortBy, "departureTime");
  assert.equal(overrideQueryOptions.sortDirection, "desc");
  assert.equal(overrideQueryOptions.limit, "11");
  assert.equal(overrideQueryOptions.offset, "12");

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
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.sortDirection, "desc");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.limit, null);
  assert.equal(mixedBlindBoxQueryOptions.blindBoxList.offset, 0);
  assert.equal(mixedBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, "effectCreatedAt");
  assert.equal(mixedBlindBoxQueryOptions.blindBoxEffectLogList.sortDirection, "asc");
  assert.equal(mixedBlindBoxQueryOptions.recordList.sortBy, "createdAt");
  assert.equal(mixedBlindBoxQueryOptions.recordList.sortDirection, "asc");
  assert.equal(mixedBlindBoxQueryOptions.recordList.limit, "4");
  assert.equal(mixedBlindBoxQueryOptions.recordList.offset, 0);

  const emptyBlindBoxQueryOptions = buildBlindBoxReviewQueryOptions({});
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.sortBy, null);
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.sortDirection, "asc");
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.limit, null);
  assert.equal(emptyBlindBoxQueryOptions.blindBoxList.offset, 0);
  assert.equal(emptyBlindBoxQueryOptions.blindBoxEffectLogList.sortBy, null);
  assert.equal(emptyBlindBoxQueryOptions.recordList.sortBy, null);

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

  const successPayload = success({ ok: true });
  assert.equal(successPayload.success, true);
  assert.deepEqual(successPayload.data, { ok: true });

  const failurePayload = failure("FORBIDDEN", "denied", { reason: "host only" });
  assert.equal(failurePayload.success, false);
  assert.equal(failurePayload.errorCode, "FORBIDDEN");
  assert.equal(failurePayload.message, "denied");
  assert.deepEqual(failurePayload.detail, { reason: "host only" });

  assert.equal(normalizeTransportType("shinkansen"), TransportType.SHINKANSEN);
  assert.equal(normalizeTransportType("新幹線"), TransportType.SHINKANSEN);
  assert.equal(normalizeTransportType("  taxi  "), TransportType.TAXI);
  assert.equal(normalizeTransportType("unknown"), null);
  assert.equal(normalizeTransportType(null), null);

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
  assert.equal(pickWeightedItem([["a", 1], ["b", 0], ["c", 2]], () => 0.5), "c");

  const onTheHour = await isOnTheHour({ currentTime: "2026-07-11T12:00:00.000Z" });
  assert.equal(onTheHour.isOnTheHour, true);

  const notOnTheHour = await isOnTheHour({ currentTime: "2026-07-11T12:34:00.000Z" });
  assert.equal(notOnTheHour.isOnTheHour, false);

  const auctionStartTime = await isOnAuctionStartTime({ currentTime: "2026-07-11T12:00:00.000Z" });
  assert.equal(auctionStartTime.isAuctionStartTime, true);

  const timeRange = await isWithinTimeRange({
    currentTime: "2026-07-11T12:30:00.000Z",
    startTime: "2026-07-11T12:00:00.000Z",
    endTime: "2026-07-11T13:00:00.000Z",
  });
  assert.equal(timeRange.isWithinRange, true);

  const outsideTimeRange = await isWithinTimeRange({
    currentTime: "2026-07-11T13:30:00.000Z",
    startTime: "2026-07-11T12:00:00.000Z",
    endTime: "2026-07-11T13:00:00.000Z",
  });
  assert.equal(outsideTimeRange.isWithinRange, false);

  const durationMinutes = await calculateDurationMinutes({
    startTime: "2026-07-11T12:00:00.000Z",
    endTime: "2026-07-11T12:45:00.000Z",
  });
  assert.equal(durationMinutes.durationMinutes, 45);

  const reachedTime = await hasReachedTime({
    currentTime: "2026-07-11T12:45:00.000Z",
    targetTime: "2026-07-11T12:30:00.000Z",
  });
  assert.equal(reachedTime.hasReached, true);

  const notReachedTime = await hasReachedTime({
    currentTime: "2026-07-11T12:15:00.000Z",
    targetTime: "2026-07-11T12:30:00.000Z",
  });
  assert.equal(notReachedTime.hasReached, false);
}

run();
