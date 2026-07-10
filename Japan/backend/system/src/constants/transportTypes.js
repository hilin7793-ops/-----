export const TransportType = Object.freeze({
  AIRPLANE: "airplane",
  SHINKANSEN: "shinkansen",
  LIMITED_EXPRESS: "limited_express",
  HIGHWAY_NIGHT_BUS: "highway_night_bus",
  LOCAL_TRAIN: "local_train",
  TAXI: "taxi",
  ROUTE_BUS: "route_bus",
  FERRY: "ferry",
  UNIVERSAL: "universal",
  WALKING: "walking",
});

export const TRANSPORT_TYPE_LABELS = Object.freeze({
  [TransportType.AIRPLANE]: "飛機",
  [TransportType.SHINKANSEN]: "新幹線",
  [TransportType.LIMITED_EXPRESS]: "特急列車",
  [TransportType.HIGHWAY_NIGHT_BUS]: "高速 / 夜行巴士",
  [TransportType.LOCAL_TRAIN]: "普通列車",
  [TransportType.TAXI]: "計程車",
  [TransportType.ROUTE_BUS]: "路線巴士",
  [TransportType.FERRY]: "渡輪",
  [TransportType.UNIVERSAL]: "通用車票",
  [TransportType.WALKING]: "步行",
});

const aliases = new Map(
  Object.entries({
    airplane: TransportType.AIRPLANE,
    "飛機": TransportType.AIRPLANE,
    shinkansen: TransportType.SHINKANSEN,
    "新幹線": TransportType.SHINKANSEN,
    limited_express: TransportType.LIMITED_EXPRESS,
    "特急列車": TransportType.LIMITED_EXPRESS,
    highway_night_bus: TransportType.HIGHWAY_NIGHT_BUS,
    "高速 / 夜行巴士": TransportType.HIGHWAY_NIGHT_BUS,
    "高速/夜行巴士": TransportType.HIGHWAY_NIGHT_BUS,
    local_train: TransportType.LOCAL_TRAIN,
    "普通列車": TransportType.LOCAL_TRAIN,
    taxi: TransportType.TAXI,
    "計程車": TransportType.TAXI,
    route_bus: TransportType.ROUTE_BUS,
    "路線巴士": TransportType.ROUTE_BUS,
    ferry: TransportType.FERRY,
    "渡輪": TransportType.FERRY,
    universal: TransportType.UNIVERSAL,
    "通用車票": TransportType.UNIVERSAL,
    walking: TransportType.WALKING,
    "步行": TransportType.WALKING,
  }),
);

export function normalizeTransportType(transportType) {
  if (!transportType || typeof transportType !== "string") {
    return null;
  }

  return aliases.get(transportType.trim()) ?? null;
}
