import { AppError, assert } from "../../lib/appError.js";
import { ErrorCode } from "../../constants/errorCodes.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl ?? "").replace(/\/+$/, "");
}

function isPocketBaseRecordId(value) {
  return typeof value === "string" && /^[a-z0-9]{15}$/.test(value);
}

function sanitizeCreatePayload(data) {
  const payload = clone(data);
  if ("id" in payload && !isPocketBaseRecordId(payload.id)) {
    delete payload.id;
  }
  return payload;
}

function toPocketBaseLiteral(value) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value) || typeof value === "object") {
    return `"${JSON.stringify(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildFilterExpression(filterOptions = {}) {
  const entries = Object.entries(filterOptions).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => `${key} = ${toPocketBaseLiteral(value)}`)
    .join(" && ");
}

function normalizeQueryOptions(queryOptions = {}, defaultPerPage) {
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
    perPage: limit ?? defaultPerPage,
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export function createPocketBaseRestAdapter({
  baseUrl,
  adminEmail,
  adminPassword,
  authToken = null,
  fetchImpl = globalThis.fetch,
  defaultPerPage = 200,
  requireAuth = false,
} = {}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  assert(normalizedBaseUrl, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "PocketBase baseUrl is required",
  }));

  assert(typeof fetchImpl === "function", () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "A fetch implementation is required",
  }));

  let token = authToken;
  let authPromise = null;

  async function request(pathname, { method = "GET", body, query = {} } = {}) {
    const url = new URL(`${normalizedBaseUrl}${pathname}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetchImpl(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      throw new AppError({
        code: ErrorCode.INVALID_STATE,
        message: `PocketBase request failed: ${method} ${pathname}`,
        detail: {
          status: response.status,
          payload,
        },
      });
    }

    return payload;
  }

  async function ensureAuth() {
    if (token) {
      return token;
    }

    if (!adminEmail || !adminPassword) {
      if (requireAuth) {
        throw new AppError({
          code: ErrorCode.INVALID_INPUT,
          message: "Provide either authToken or adminEmail/adminPassword for PocketBase adapter",
        });
      }

      return null;
    }

    if (!authPromise) {
      authPromise = request("/api/collections/_superusers/auth-with-password", {
        method: "POST",
        body: {
          identity: adminEmail,
          password: adminPassword,
        },
      }).then((payload) => {
        token = payload.token;
        return token;
      }).finally(() => {
        authPromise = null;
      });
    }

    return authPromise;
  }

  async function create(collectionName, data) {
    await ensureAuth();
    return request(`/api/collections/${collectionName}/records`, {
      method: "POST",
      body: sanitizeCreatePayload(data),
    });
  }

  async function getById(collectionName, recordId) {
    await ensureAuth();
    try {
      return await request(`/api/collections/${collectionName}/records/${recordId}`);
    } catch (error) {
      if (error.detail?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async function updateById(collectionName, recordId, data) {
    await ensureAuth();
    try {
      return await request(`/api/collections/${collectionName}/records/${recordId}`, {
        method: "PATCH",
        body: clone(data),
      });
    } catch (error) {
      if (error.detail?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async function deleteById(collectionName, recordId) {
    await ensureAuth();
    try {
      await request(`/api/collections/${collectionName}/records/${recordId}`, {
        method: "DELETE",
      });
      return true;
    } catch (error) {
      if (error.detail?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async function list(collectionName, filterOptions = {}, queryOptions = {}) {
    await ensureAuth();
    const filter = buildFilterExpression(filterOptions);
    const normalizedQueryOptions = normalizeQueryOptions(queryOptions, defaultPerPage);
    const sort = normalizedQueryOptions.sortBy
      ? `${normalizedQueryOptions.sortDirection === "desc" ? "-" : "+"}${normalizedQueryOptions.sortBy}`
      : undefined;

    let page = 1;
    let items = [];
    while (true) {
      const payload = await request(`/api/collections/${collectionName}/records`, {
        query: {
          page,
          perPage: normalizedQueryOptions.perPage,
          filter,
          sort,
        },
      });

      items = items.concat(payload.items ?? []);

      const totalPages = payload.totalPages ?? 1;
      if (page >= totalPages) {
        break;
      }

      page += 1;
    }

    if (normalizedQueryOptions.offset > 0) {
      items = items.slice(normalizedQueryOptions.offset);
    }

    return normalizedQueryOptions.limit === null
      ? items
      : items.slice(0, normalizedQueryOptions.limit);
  }

  async function findOne(collectionName, filterOptions = {}, queryOptions = {}) {
    const items = await list(collectionName, filterOptions, {
      ...queryOptions,
      limit: 1,
    });
    return items[0] ?? null;
  }

  async function runOperation(operationName, operationData, handler) {
    if (typeof handler === "function") {
      return handler({
        operationName,
        operationData: clone(operationData),
        adapter: {
          create,
          getById,
          updateById,
          deleteById,
          list,
          findOne,
        },
      });
    }

    return {
      operationName,
      operationData: clone(operationData),
      mode: "no_transaction_support",
    };
  }

  return {
    create,
    getById,
    updateById,
    deleteById,
    list,
    findOne,
    runOperation,
    ensureAuth,
  };
}
