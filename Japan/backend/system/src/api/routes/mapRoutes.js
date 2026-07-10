import {
  addLocation,
  createMap,
  deleteMap,
  getMap,
  listLocations,
  listMaps,
  removeLocation,
  setGoalLocation,
  setStartLocation,
  updateLocation,
  updateMap,
} from "../../index.js";
import { buildQueryOptions } from "../queryOptions.js";

export function createMapRoutes({ dataAccessLayer }) {
  return [
    {
      method: "GET",
      template: "/maps",
      handler: async ({ query }) => ({
        statusCode: 200,
        payload: {
          success: true,
          ...(await listMaps({
            dataAccessLayer,
            queryOptions: buildQueryOptions(query),
          })),
        },
      }),
    },
    {
      method: "POST",
      template: "/maps",
      handler: async ({ body }) => ({
        statusCode: 201,
        payload: {
          success: true,
          data: await createMap({ dataAccessLayer, ...body }),
        },
      }),
    },
    {
      method: "GET",
      template: "/maps/:mapId",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await getMap({ dataAccessLayer, mapId: params.mapId }),
        },
      }),
    },
    {
      method: "PATCH",
      template: "/maps/:mapId",
      handler: async ({ params, body }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await updateMap({
            dataAccessLayer,
            mapId: params.mapId,
            ...body,
          }),
        },
      }),
    },
    {
      method: "DELETE",
      template: "/maps/:mapId",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await deleteMap({
            dataAccessLayer,
            mapId: params.mapId,
          }),
        },
      }),
    },
    {
      method: "POST",
      template: "/maps/:mapId/locations",
      handler: async ({ params, body }) => ({
        statusCode: 201,
        payload: {
          success: true,
          data: await addLocation({
            dataAccessLayer,
            mapId: params.mapId,
            ...body,
          }),
        },
      }),
    },
    {
      method: "GET",
      template: "/maps/:mapId/locations",
      handler: async ({ params, query }) => ({
        statusCode: 200,
        payload: {
          success: true,
          ...(await listLocations({
            dataAccessLayer,
            mapId: params.mapId,
            queryOptions: buildQueryOptions(query),
          })),
        },
      }),
    },
    {
      method: "PATCH",
      template: "/maps/:mapId/locations/:locationId",
      handler: async ({ params, body }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await updateLocation({
            dataAccessLayer,
            locationId: params.locationId,
            ...body,
          }),
        },
      }),
    },
    {
      method: "DELETE",
      template: "/maps/:mapId/locations/:locationId",
      handler: async ({ params }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await removeLocation({
            dataAccessLayer,
            mapId: params.mapId,
            locationId: params.locationId,
          }),
        },
      }),
    },
    {
      method: "POST",
      template: "/maps/:mapId/start-location",
      handler: async ({ params, body }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await setStartLocation({
            dataAccessLayer,
            mapId: params.mapId,
            locationId: body.locationId,
          }),
        },
      }),
    },
    {
      method: "POST",
      template: "/maps/:mapId/goal-location",
      handler: async ({ params, body }) => ({
        statusCode: 200,
        payload: {
          success: true,
          data: await setGoalLocation({
            dataAccessLayer,
            mapId: params.mapId,
            locationId: body.locationId,
          }),
        },
      }),
    },
  ];
}
