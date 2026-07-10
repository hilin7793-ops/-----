import { randomUUID } from "node:crypto";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function matchesFilter(record, filterOptions = {}) {
  return Object.entries(filterOptions).every(([key, expected]) => record[key] === expected);
}

function normalizeQueryOptions(queryOptions = {}) {
  const sortDirection = String(queryOptions.sortDirection ?? "asc").toLowerCase() === "desc"
    ? "desc"
    : "asc";
  const limit = Number.isFinite(Number(queryOptions.limit)) ? Math.max(0, Number(queryOptions.limit)) : null;
  const offset = Number.isFinite(Number(queryOptions.offset)) ? Math.max(0, Number(queryOptions.offset)) : 0;

  return {
    sortBy: queryOptions.sortBy ?? null,
    sortDirection,
    limit,
    offset,
  };
}

function sortRecords(records, sortBy, sortDirection) {
  if (!sortBy) {
    return records;
  }

  const factor = sortDirection === "desc" ? -1 : 1;
  return [...records].sort((left, right) => {
    const leftValue = left?.[sortBy];
    const rightValue = right?.[sortBy];

    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === undefined || leftValue === null) {
      return 1;
    }

    if (rightValue === undefined || rightValue === null) {
      return -1;
    }

    return leftValue > rightValue ? factor : -factor;
  });
}

function paginateRecords(records, { offset, limit }) {
  const sliced = offset > 0 ? records.slice(offset) : records;
  return limit === null ? sliced : sliced.slice(0, limit);
}

export function createInMemoryDataAccessAdapter(seed = {}) {
  const collections = new Map(
    Object.entries(seed).map(([collectionName, rows]) => [collectionName, clone(rows)]),
  );

  function getCollection(collectionName) {
    if (!collections.has(collectionName)) {
      collections.set(collectionName, []);
    }

    return collections.get(collectionName);
  }

  return {
    async create(collectionName, data) {
      const collection = getCollection(collectionName);
      const record = { id: data.id ?? randomUUID(), ...clone(data) };
      collection.push(record);
      return clone(record);
    },

    async getById(collectionName, recordId) {
      const collection = getCollection(collectionName);
      const record = collection.find((item) => item.id === recordId);
      return record ? clone(record) : null;
    },

    async updateById(collectionName, recordId, data) {
      const collection = getCollection(collectionName);
      const index = collection.findIndex((item) => item.id === recordId);

      if (index === -1) {
        return null;
      }

      collection[index] = { ...collection[index], ...clone(data) };
      return clone(collection[index]);
    },

    async deleteById(collectionName, recordId) {
      const collection = getCollection(collectionName);
      const index = collection.findIndex((item) => item.id === recordId);

      if (index === -1) {
        return false;
      }

      collection.splice(index, 1);
      return true;
    },

    async list(collectionName, filterOptions = {}, queryOptions = {}) {
      const collection = getCollection(collectionName);
      const normalizedQueryOptions = normalizeQueryOptions(queryOptions);
      const filtered = collection.filter((item) => matchesFilter(item, filterOptions));
      const sorted = sortRecords(
        filtered,
        normalizedQueryOptions.sortBy,
        normalizedQueryOptions.sortDirection,
      );
      return clone(paginateRecords(sorted, normalizedQueryOptions));
    },

    async findOne(collectionName, filterOptions = {}, queryOptions = {}) {
      const items = await this.list(collectionName, filterOptions, {
        ...queryOptions,
        limit: 1,
      });
      return items[0] ?? null;
    },

    async runOperation(operationName, operationData, handler) {
      if (typeof handler === "function") {
        return handler({ operationName, operationData });
      }

      return {
        operationName,
        operationData: clone(operationData),
      };
    },
  };
}
