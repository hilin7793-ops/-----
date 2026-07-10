/// <reference path="../pb_data/types.d.ts" />
const collections = [
  {
    "id": "c_ticketsxxxxxx",
    "name": "tickets",
    "type": "base",
    "system": false,
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_gameidxxxxxxx",
        "name": "gameId",
        "type": "relation",
        "collectionId": "c_gamesxxxxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": true,
        "system": false,
        "id": "f_transporttype",
        "name": "transportType",
        "type": "text",
        "min": 0,
        "max": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_transportlabe",
        "name": "transportLabel",
        "type": "text",
        "min": 0,
        "max": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": true,
        "system": false,
        "id": "f_usableminutes",
        "name": "usableMinutes",
        "type": "number",
        "min": 0,
        "max": null,
        "onlyInt": false
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_pricexxxxxxxx",
        "name": "price",
        "type": "number",
        "min": 0,
        "max": null,
        "onlyInt": false
      },
      {
        "hidden": false,
        "presentable": false,
        "required": true,
        "system": false,
        "id": "f_statusxxxxxxx",
        "name": "status",
        "type": "select",
        "maxSelect": 1,
        "values": [
          "generated",
          "shop_available",
          "auction_available",
          "owned",
          "reserved",
          "consumed",
          "destroyed"
        ]
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_ticketsourcex",
        "name": "ticketSource",
        "type": "text",
        "min": 0,
        "max": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_ownerplayerid",
        "name": "ownerPlayerId",
        "type": "relation",
        "collectionId": "c_playersxxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_ownergameplay",
        "name": "ownerGamePlayerId",
        "type": "relation",
        "collectionId": "c_game_playersx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_sourceauction",
        "name": "sourceAuctionId",
        "type": "relation",
        "collectionId": "c_auctionsxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_sourcejourney",
        "name": "sourceJourneyId",
        "type": "relation",
        "collectionId": "c_journeysxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_metadataxxxxx",
        "name": "metadata",
        "type": "json",
        "maxSize": 0
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_acquiredatxxx",
        "name": "acquiredAt",
        "type": "date",
        "min": "",
        "max": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_consumedatxxx",
        "name": "consumedAt",
        "type": "date",
        "min": "",
        "max": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_destroyedatxx",
        "name": "destroyedAt",
        "type": "date",
        "min": "",
        "max": ""
      }
    ],
    "indexes": [
      "CREATE INDEX idx_tickets_game_status ON tickets (gameId, status)",
      "CREATE INDEX idx_tickets_owner ON tickets (ownerPlayerId, status)"
    ]
  },
  {
    "id": "c_shop_itemsxxx",
    "name": "shop_items",
    "type": "base",
    "system": false,
    "listRule": null,
    "viewRule": null,
    "createRule": null,
    "updateRule": null,
    "deleteRule": null,
    "fields": [
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_gameidxxxxxxx",
        "name": "gameId",
        "type": "relation",
        "collectionId": "c_gamesxxxxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_mapidxxxxxxxx",
        "name": "mapId",
        "type": "relation",
        "collectionId": "c_mapsxxxxxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": true,
        "system": false,
        "id": "f_shoptypexxxxx",
        "name": "shopType",
        "type": "text",
        "min": 0,
        "max": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_ticketidxxxxx",
        "name": "ticketId",
        "type": "relation",
        "collectionId": "c_ticketsxxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_pricexxxxxxxx",
        "name": "price",
        "type": "number",
        "min": 0,
        "max": null,
        "onlyInt": false
      },
      {
        "hidden": false,
        "presentable": false,
        "required": true,
        "system": false,
        "id": "f_statusxxxxxxx",
        "name": "status",
        "type": "text",
        "min": 0,
        "max": 0,
        "pattern": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_purchasedbyxx",
        "name": "purchasedBy",
        "type": "relation",
        "collectionId": "c_playersxxxxxx",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_listedatxxxxx",
        "name": "listedAt",
        "type": "date",
        "min": "",
        "max": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_purchasedatxx",
        "name": "purchasedAt",
        "type": "date",
        "min": "",
        "max": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_removedatxxxx",
        "name": "removedAt",
        "type": "date",
        "min": "",
        "max": ""
      },
      {
        "hidden": false,
        "presentable": false,
        "required": false,
        "system": false,
        "id": "f_removedreaso",
        "name": "removedReason",
        "type": "text",
        "min": 0,
        "max": 0,
        "pattern": ""
      }
    ],
    "indexes": [
      "CREATE INDEX idx_shop_items_game_status ON shop_items (gameId, status)",
      "CREATE INDEX idx_shop_items_ticket ON shop_items (ticketId)"
    ]
  }
]

migrate((app) => {
  app.importCollections(collections, false)
}, (app) => {
  const rollbackCollections = [
    {
      ...collections[0],
      fields: collections[0].fields.map((field) => field.id === "f_pricexxxxxxxx"
        ? { ...field, required: true }
        : field),
    },
    {
      ...collections[1],
      fields: collections[1].fields.map((field) => field.id === "f_pricexxxxxxxx"
        ? { ...field, required: true }
        : field),
    },
  ]

  app.importCollections(rollbackCollections, false)
})
