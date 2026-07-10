export function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(payload)}\n`);
}

export async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function notFound(response, method, pathname) {
  json(response, 404, {
    success: false,
    errorCode: "NOT_FOUND",
    message: `Route not found: ${method} ${pathname}`,
  });
}

export function matchPath(pathname, template) {
  const pathParts = pathname.split("/").filter(Boolean);
  const templateParts = template.split("/").filter(Boolean);

  if (pathParts.length !== templateParts.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < templateParts.length; index += 1) {
    const templatePart = templateParts[index];
    const pathPart = pathParts[index];

    if (templatePart.startsWith(":")) {
      params[templatePart.slice(1)] = pathPart;
      continue;
    }

    if (templatePart !== pathPart) {
      return null;
    }
  }

  return params;
}
