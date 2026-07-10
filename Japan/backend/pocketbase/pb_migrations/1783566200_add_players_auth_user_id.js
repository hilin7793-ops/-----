/// <reference path="../pb_data/types.d.ts" />
const playersCollectionWithAuthUserId = {
  id: "c_playersxxxxxx",
  name: "players",
  type: "base",
  system: false,
  listRule: null,
  viewRule: null,
  createRule: null,
  updateRule: null,
  deleteRule: null,
  fields: [
    {
      hidden: false,
      presentable: false,
      required: true,
      system: false,
      id: "f_useridxxxxxxx",
      name: "userId",
      type: "text",
      min: 0,
      max: 0,
      pattern: "",
    },
    {
      hidden: false,
      presentable: false,
      required: false,
      system: false,
      id: "f_authuseridxxx",
      name: "authUserId",
      type: "text",
      min: 0,
      max: 0,
      pattern: "",
    },
    {
      hidden: false,
      presentable: false,
      required: true,
      system: false,
      id: "f_displaynamexx",
      name: "displayName",
      type: "text",
      min: 0,
      max: 0,
      pattern: "",
    },
    {
      hidden: false,
      presentable: false,
      required: false,
      system: false,
      id: "f_avatarxxxxxxx",
      name: "avatar",
      type: "text",
      min: 0,
      max: 0,
      pattern: "",
    },
    {
      hidden: false,
      presentable: false,
      required: false,
      system: false,
      id: "f_metadataxxxxx",
      name: "metadata",
      type: "json",
      maxSize: 0,
    },
  ],
  indexes: [
    "CREATE UNIQUE INDEX idx_players_user_id ON players (userId)",
    "CREATE UNIQUE INDEX idx_players_auth_user_id ON players (authUserId) WHERE authUserId IS NOT NULL AND authUserId != ''",
  ],
};

const playersCollectionWithoutAuthUserId = {
  ...playersCollectionWithAuthUserId,
  fields: playersCollectionWithAuthUserId.fields.filter((field) => field.name !== "authUserId"),
  indexes: [
    "CREATE UNIQUE INDEX idx_players_user_id ON players (userId)",
  ],
};

migrate((app) => {
  app.importCollections([playersCollectionWithAuthUserId], false);
}, (app) => {
  app.importCollections([playersCollectionWithoutAuthUserId], false);
});
