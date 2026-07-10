import { AppError, assert } from "../../lib/appError.js";
import { ErrorCode } from "../../constants/errorCodes.js";

function toDate(input) {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTimeParts(input, timeZone = "UTC") {
  const date = toDate(input);
  assert(date, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid date input",
    detail: { input },
  }));

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

export async function getCurrentTime() {
  return {
    currentTime: new Date().toISOString(),
  };
}

export async function isOnTheHour({ currentTime, timeZone = "UTC" }) {
  const { minute, second } = getTimeParts(currentTime, timeZone);
  return {
    isOnTheHour: minute === 0 && second === 0,
  };
}

export async function isOnAuctionStartTime({ currentTime, timeZone = "UTC" }) {
  const { minute, second } = getTimeParts(currentTime, timeZone);
  return {
    isAuctionStartTime: (minute === 0 || minute === 30) && second === 0,
  };
}

export async function isWithinTimeRange({ currentTime, startTime, endTime }) {
  const currentDate = toDate(currentTime);
  const startDate = toDate(startTime);
  const endDate = toDate(endTime);

  assert(currentDate && startDate && endDate, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid time range input",
    detail: { currentTime, startTime, endTime },
  }));

  return {
    isWithinRange: currentDate >= startDate && currentDate <= endDate,
  };
}

export async function calculateDurationMinutes({ startTime, endTime }) {
  const startDate = toDate(startTime);
  const endDate = toDate(endTime);

  assert(startDate && endDate, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid duration input",
    detail: { startTime, endTime },
  }));

  return {
    durationMinutes: Math.round((endDate.getTime() - startDate.getTime()) / 60000),
  };
}

export async function hasReachedTime({ currentTime, targetTime }) {
  const currentDate = toDate(currentTime);
  const targetDate = toDate(targetTime);

  assert(currentDate && targetDate, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Invalid target time input",
    detail: { currentTime, targetTime },
  }));

  return {
    hasReached: currentDate >= targetDate,
  };
}
