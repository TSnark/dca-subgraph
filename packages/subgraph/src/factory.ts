import { BigInt, DataSourceContext, log } from "@graphprotocol/graph-ts";
import {
  BaseTokenEnabled,
  OrderTokenEnabled,
  PoolCreated,
} from "../generated/DCAPoolFactory/DCAPoolFactory";
import { Pool } from "../generated/schema";
import { DCAPool } from "../generated/templates";
import {
  loadOrCreateRegistry,
  loadOrCreateToken,
  ONE,
  TWO_POW_64,
  ZERO,
  ZERO_DOT_ZERO,
} from "./helpers";

export function handleNewBaseToken(event: BaseTokenEnabled): void {
  log.info("Adding Base Token: {}", [event.params.token.toHex()]);
  let token = loadOrCreateToken(event.params.token);
  let registry = loadOrCreateRegistry();
  let baseTokens = registry.baseTokens;
  baseTokens.push(token.id);
  registry.baseTokens = baseTokens;
  registry.save();
}

export function handleNewOrderToken(event: OrderTokenEnabled): void {
  log.info("Adding Order Token: {}", [event.params.token.toHex()]);
  let token = loadOrCreateToken(event.params.token);
  let registry = loadOrCreateRegistry();
  let orderTokens = registry.orderTokens;
  orderTokens.push(token.id);
  registry.orderTokens = orderTokens;
  registry.save();
}

export function handleNewPool(event: PoolCreated): void {
  log.info("Adding New Pool: {} {}", [
    event.params.baseToken.toHex(),
    event.params.orderToken.toHex(),
  ]);

  let context = new DataSourceContext();
  let baseTokenAddress = event.params.baseToken;
  let orderTokenAddress = event.params.orderToken;
  let scalingFactor = event.params.baseTokenScalingFactor;
  let maxValue = TWO_POW_64.times(scalingFactor);
  let minValue = TWO_POW_64.div(scalingFactor);
  context.setBytes("baseToken", baseTokenAddress);
  context.setBytes("orderToken", orderTokenAddress);
  context.setI32("period", event.params.period);
  // Create template to be able to process calls/events on a specific pool
  DCAPool.createWithContext(event.params.vault, context);
  // Create pool entity to store state
  let pool = new Pool(event.params.vault.toHex());
  pool.baseToken = baseTokenAddress.toHex();
  pool.orderToken = orderTokenAddress.toHex();
  pool.period = BigInt.fromI32(event.params.period);
  pool.lastExecution = ZERO;
  pool.nextExecution = ZERO;
  pool.totalQuantityPurchased = ZERO;
  pool.totalQuantitySpent = ZERO;
  pool.lastPrice = ZERO_DOT_ZERO;
  pool.totalAveragePrice = ZERO_DOT_ZERO;
  pool.totalCost = ZERO;
  pool.currentCycle = ONE;
  pool.cumulativeIndexes = [ZERO_DOT_ZERO];
  pool.maxValue = maxValue;
  pool.minValue = minValue;
  pool.scalingFactor = scalingFactor;
  pool.save();
}
