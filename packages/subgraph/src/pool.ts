import { BigDecimal, log, store } from "@graphprotocol/graph-ts";
import { Account, Pool } from "../generated/schema";
import { AccountModified } from "../generated/templates/DCAPool/DCAVault";
import { PoolEvaluated } from "../generated/DCAScheduler/DCAScheduler";
import { loadOrCreateAccount, ONE } from "./helpers";

export function handleAccountModified(event: AccountModified): void {
  let owner = event.params.owner;
  let now = event.block.timestamp;
  let qtyPerCycle = event.params.qtyPerCycle;
  let numberOfCycles = event.params.numberOfCycles;
  let account: Account = loadOrCreateAccount(owner, event.address);
  if (account.createdAt.isZero()) {
    account.createdAt = now;
  }
  account.modifiedAt = now;
  if (qtyPerCycle.isZero()) {
    store.remove("Account", account.id);
  } else {
    account.startCycle = event.params.startCycle;
    account.endCycle = event.params.startCycle.plus(numberOfCycles);
    account.accruedOrderTokenBalance = event.params.orderTokenBalance;
    account.qtyPerCycle = qtyPerCycle;
    account.baseTokenDeposit = qtyPerCycle.times(numberOfCycles);
    account.save();
  }
  log.debug("Owner {}, Pool {}", [owner.toHex(), event.address.toHex()]);
}

export function handlePoolEvaluated(event: PoolEvaluated): void {
  let pool: Pool = Pool.load(event.params.vault.toHex()) as Pool;
  pool.lastExecution = event.block.timestamp;
  let netPurchase = event.params.orderTokenQty.minus(event.params.costs);
  pool.lastPrice = event.params.baseTokenQty.divDecimal(
    netPurchase.toBigDecimal()
  );
  pool.nextExecution = event.params.nextEvaluationTime;
  pool.totalQuantitySpent = pool.totalQuantitySpent.plus(
    event.params.baseTokenQty
  );
  pool.totalQuantityPurchased = pool.totalQuantityPurchased.plus(netPurchase);
  pool.totalAveragePrice = pool.totalQuantitySpent.divDecimal(
    pool.totalQuantityPurchased.toBigDecimal()
  );
  pool.totalCost = pool.totalCost.plus(event.params.costs);
  let lastIndex = pool.cumulativeIndexes.length - 1;
  let cumulativeIndexes = pool.cumulativeIndexes;
  let cumulativeIndex: BigDecimal = cumulativeIndexes[lastIndex];
  cumulativeIndex = cumulativeIndex.plus(pool.lastPrice);
  cumulativeIndexes.push(cumulativeIndex);
  pool.cumulativeIndexes = cumulativeIndexes;
  pool.currentCycle = pool.currentCycle.plus(ONE);
  pool.save();
}
