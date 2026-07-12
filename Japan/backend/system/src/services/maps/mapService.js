import { CollectionName } from "../../constants/collectionNames.js";
import { ErrorCode } from "../../constants/errorCodes.js";
import { normalizeTransportType } from "../../constants/transportTypes.js";
import { AppError, assert } from "../../lib/appError.js";

function normalizeTransportTypeList(transportTypeList = []) {
  return transportTypeList
    .map(normalizeTransportType)
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
}

export async function createMap({
  dataAccessLayer,
  mapName,
  description = "",
  countryOrRegion = "",
  customRules = {},
  availableTransportTypes = [],
}) {
  const normalizedTransportTypes = normalizeTransportTypeList(availableTransportTypes);
  assert(mapName, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Map name is required",
  }));

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.MAPS,
    data: {
      name: mapName,
      description,
      countryOrRegion,
      customRules,
      availableTransportTypes: normalizedTransportTypes,
    },
  });
}

export async function updateMap({
  dataAccessLayer,
  mapId,
  mapName,
  description,
  countryOrRegion,
  customRules,
  availableTransportTypes,
}) {
  const updateData = {};
  if (mapName !== undefined) updateData.name = mapName;
  if (description !== undefined) updateData.description = description;
  if (countryOrRegion !== undefined) updateData.countryOrRegion = countryOrRegion;
  if (customRules !== undefined) updateData.customRules = customRules;
  if (availableTransportTypes !== undefined) {
    updateData.availableTransportTypes = normalizeTransportTypeList(availableTransportTypes);
  }

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
    data: updateData,
  });
}

export async function deleteMap({ dataAccessLayer, mapId }) {
  const success = await dataAccessLayer.deleteRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
  });

  return {
    success,
    deletedMapId: success ? mapId : null,
  };
}

export async function getMap({ dataAccessLayer, mapId }) {
  const mapData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
  });

  assert(mapData, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Map not found",
    detail: { mapId },
  }));

  return mapData;
}

export async function listMaps({ dataAccessLayer, filterOptions = {}, queryOptions = {} }) {
  const {
    name,
    hasStartLocation,
    hasGoalLocation,
    ...recordFilterOptions
  } = filterOptions;

  const mapList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.MAPS,
    filterOptions: recordFilterOptions,
    queryOptions,
  });

  return {
    mapList: mapList.filter((mapData) => {
      if (name && mapData.name !== name) {
        return false;
      }

      if (hasStartLocation === true && !mapData.startLocation) {
        return false;
      }

      if (hasStartLocation === false && mapData.startLocation) {
        return false;
      }

      if (hasGoalLocation === true && !mapData.goalLocation) {
        return false;
      }

      if (hasGoalLocation === false && mapData.goalLocation) {
        return false;
      }

      return true;
    }),
  };
}

export async function addLocation({
  dataAccessLayer,
  mapId,
  locationName,
  locationType = "",
  metadata = {},
}) {
  assert(locationName, () => new AppError({
    code: ErrorCode.INVALID_INPUT,
    message: "Location name is required",
    detail: { mapId },
  }));

  return dataAccessLayer.createRecordInCollection({
    collectionName: CollectionName.LOCATIONS,
    data: {
      mapId,
      name: locationName,
      locationType,
      metadata,
    },
  });
}

export async function updateLocation({
  dataAccessLayer,
  locationId,
  locationName,
  locationType,
  metadata,
}) {
  const updateData = {};
  if (locationName !== undefined) updateData.name = locationName;
  if (locationType !== undefined) updateData.locationType = locationType;
  if (metadata !== undefined) updateData.metadata = metadata;

  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.LOCATIONS,
    recordId: locationId,
    data: updateData,
  });
}

export async function removeLocation({ dataAccessLayer, mapId, locationId }) {
  const locationData = await dataAccessLayer.getRecordById({
    collectionName: CollectionName.LOCATIONS,
    recordId: locationId,
  });

  assert(locationData?.mapId === mapId, () => new AppError({
    code: ErrorCode.NOT_FOUND,
    message: "Location not found in map",
    detail: { mapId, locationId },
  }));

  const success = await dataAccessLayer.deleteRecordById({
    collectionName: CollectionName.LOCATIONS,
    recordId: locationId,
  });

  return {
    success,
    removedLocationId: success ? locationId : null,
  };
}

export async function listLocations({ dataAccessLayer, mapId, filterOptions = {}, queryOptions = {} }) {
  const {
    locationName,
    locationType,
    ...recordFilterOptions
  } = filterOptions;

  const locationList = await dataAccessLayer.listRecords({
    collectionName: CollectionName.LOCATIONS,
    filterOptions: { mapId, ...recordFilterOptions },
    queryOptions,
  });

  return {
    locationList: locationList.filter((locationData) => {
      if (locationName && locationData.name !== locationName) {
        return false;
      }

      if (locationType && locationData.locationType !== locationType) {
        return false;
      }

      return true;
    }),
  };
}

export async function setStartLocation({ dataAccessLayer, mapId, locationId }) {
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
    data: { startLocation: locationId },
  });
}

export async function setGoalLocation({ dataAccessLayer, mapId, locationId }) {
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
    data: { goalLocation: locationId },
  });
}

export async function getStartLocation({ dataAccessLayer, mapId }) {
  const mapData = await getMap({ dataAccessLayer, mapId });
  return { startLocation: mapData.startLocation ?? null };
}

export async function getGoalLocation({ dataAccessLayer, mapId }) {
  const mapData = await getMap({ dataAccessLayer, mapId });
  return { goalLocation: mapData.goalLocation ?? null };
}

export async function setAvailableTransportTypes({
  dataAccessLayer,
  mapId,
  transportTypeList,
}) {
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
    data: {
      availableTransportTypes: normalizeTransportTypeList(transportTypeList),
    },
  });
}

export async function getAvailableTransportTypes({ dataAccessLayer, mapId }) {
  const mapData = await getMap({ dataAccessLayer, mapId });
  return {
    transportTypeList: mapData.availableTransportTypes ?? [],
  };
}

export async function setSpecialRules({ dataAccessLayer, mapId, specialRules }) {
  return dataAccessLayer.updateRecordById({
    collectionName: CollectionName.MAPS,
    recordId: mapId,
    data: {
      customRules: specialRules ?? {},
    },
  });
}

export async function getSpecialRules({ dataAccessLayer, mapId }) {
  const mapData = await getMap({ dataAccessLayer, mapId });
  return {
    specialRules: mapData.customRules ?? {},
  };
}
