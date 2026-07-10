export const GameStatus = Object.freeze(["waiting", "started", "ended"]);

export const PlayerGameStatus = Object.freeze([
  "waiting",
  "active",
  "arrived",
  "offline",
]);

export const TicketStatus = Object.freeze([
  "generated",
  "shop_available",
  "auction_available",
  "owned",
  "reserved",
  "consumed",
  "destroyed",
]);

export const JourneyStatus = Object.freeze([
  "reserved",
  "started",
  "completed",
  "cancelled",
  "incident_pending",
  "incident_resolved",
]);

export const AuctionStatus = Object.freeze([
  "scheduled",
  "active",
  "ended",
  "resolved",
  "destroyed",
]);

export const ShopStatus = Object.freeze(["open", "closed"]);

export const BlindBoxStatus = Object.freeze([
  "hidden_effect",
  "available",
  "opened",
  "removed",
]);

export const BlindBoxEffectType = Object.freeze([
  "money",
  "gain_random_ticket",
  "lose_random_ticket",
  "gain_shop_ticket",
  "gain_next_auction_bid_pool",
  "gain_free_shop_refresh",
  "conditional",
]);

export const BlindBoxSpecialStateType = Object.freeze([
  "next_auction_bid_pool_reward",
  "free_shop_refresh_count",
]);
