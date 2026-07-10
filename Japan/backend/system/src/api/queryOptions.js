export function buildQueryOptions(query = {}) {
  return {
    sortBy: query.sortBy ?? null,
    sortDirection: query.sortDirection ?? "asc",
    limit: query.limit ?? null,
    offset: query.offset ?? 0,
  };
}

export function buildBlindBoxReviewQueryOptions(query = {}) {
  return {
    blindBoxList: {
      sortBy: query.blindBoxSortBy ?? query.sortBy ?? null,
      sortDirection: query.blindBoxSortDirection ?? query.sortDirection ?? "asc",
      limit: query.blindBoxLimit ?? query.limit ?? null,
      offset: query.blindBoxOffset ?? query.offset ?? 0,
    },
    blindBoxEffectLogList: {
      sortBy: query.effectLogSortBy ?? query.sortBy ?? null,
      sortDirection: query.effectLogSortDirection ?? query.sortDirection ?? "asc",
      limit: query.effectLogLimit ?? query.limit ?? null,
      offset: query.effectLogOffset ?? query.offset ?? 0,
    },
    recordList: {
      sortBy: query.recordSortBy ?? query.sortBy ?? null,
      sortDirection: query.recordSortDirection ?? query.sortDirection ?? "asc",
      limit: query.recordLimit ?? query.limit ?? null,
      offset: query.recordOffset ?? query.offset ?? 0,
    },
  };
}
