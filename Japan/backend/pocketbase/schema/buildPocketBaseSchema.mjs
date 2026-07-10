import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import coreCollectionsDraft from "./coreCollectionsDraft.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pocketbaseRoot = path.resolve(__dirname, "..");
const generatedDir = path.join(__dirname, "generated");
const migrationsDir = path.join(pocketbaseRoot, "pb_migrations");

function makeDeterministicId(prefix, name) {
  const normalized = `${prefix}_${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.slice(0, 15).padEnd(15, "x");
}

function defaultFieldOptions(field) {
  return {
    hidden: false,
    presentable: false,
    required: false,
    system: false,
    ...field,
  };
}

function convertField(field, collectionIdByName) {
  const fieldId = makeDeterministicId("f", field.name);
  const base = defaultFieldOptions({
    id: fieldId,
    name: field.name,
    type: field.type,
    hidden: false,
    presentable: false,
    system: false,
  });

  if (field.type === "relation") {
    return {
      ...base,
      collectionId: collectionIdByName[field.collection],
      cascadeDelete: false,
      minSelect: field.minSelect ?? null,
      maxSelect: field.maxSelect ?? 1,
    };
  }

  if (field.type === "select") {
    return {
      ...base,
      maxSelect: field.maxSelect ?? 1,
      values: field.values ?? [],
    };
  }

  if (field.type === "text") {
    return {
      ...base,
      min: field.min ?? 0,
      max: field.max ?? 0,
      pattern: field.pattern ?? "",
      required: field.required ?? false,
    };
  }

  if (field.type === "number") {
    return {
      ...base,
      min: field.min ?? null,
      max: field.max ?? null,
      onlyInt: field.onlyInt ?? false,
      required: field.required ?? false,
    };
  }

  if (field.type === "bool") {
    return {
      ...base,
      required: field.required ?? false,
    };
  }

  if (field.type === "json") {
    return {
      ...base,
      maxSize: field.maxSize ?? 0,
      required: field.required ?? false,
    };
  }

  if (field.type === "date") {
    return {
      ...base,
      min: field.min ?? "",
      max: field.max ?? "",
      required: field.required ?? false,
    };
  }

  return base;
}

function convertCollection(draftCollection, collectionIdByName) {
  return {
    id: collectionIdByName[draftCollection.name],
    name: draftCollection.name,
    type: "base",
    system: false,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: draftCollection.fields.map((field) => convertField(field, collectionIdByName)),
    indexes: draftCollection.indexes ?? [],
  };
}

function buildImportPayload() {
  const collectionIdByName = Object.fromEntries(
    coreCollectionsDraft.map((collection) => [collection.name, makeDeterministicId("c", collection.name)]),
  );

  const collections = coreCollectionsDraft.map((collection) =>
    convertCollection(collection, collectionIdByName),
  );

  return {
    generatedAt: new Date().toISOString(),
    collections,
  };
}

function buildMigrationSource(collections) {
  const importJson = JSON.stringify(collections, null, 2);
  const collectionNames = collections.map((collection) => collection.name);

  return `/// <reference path="../pb_data/types.d.ts" />
const collections = ${importJson}

migrate((app) => {
  app.importCollections(collections, false)
}, (app) => {
  const names = ${JSON.stringify(collectionNames, null, 2)}
  for (let index = names.length - 1; index >= 0; index -= 1) {
    const name = names[index]
    try {
      const collection = app.findCollectionByNameOrId(name)
      if (collection) {
        app.delete(collection)
      }
    } catch (error) {
      // Ignore missing collection during rollback.
    }
  }
})
`;
}

async function main() {
  const payload = buildImportPayload();

  await mkdir(generatedDir, { recursive: true });
  await mkdir(migrationsDir, { recursive: true });

  const jsonPath = path.join(generatedDir, "pb_collections.generated.json");
  const migrationPath = path.join(migrationsDir, "1783563200_import_japan_core_schema.js");

  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(migrationPath, buildMigrationSource(payload.collections), "utf8");

  console.log(`Generated ${jsonPath}`);
  console.log(`Generated ${migrationPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
