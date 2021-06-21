import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";
import { Account, Registry, User, TokenMeta } from "../generated/schema";
import { ERC20 } from "../generated/DCAPoolFactory/ERC20";

export let ONE: BigInt = BigInt.fromI32(1);
export let ZERO: BigInt = BigInt.fromI32(0);
export let TWO_POW_64: BigInt = BigInt.fromI32(2).pow(64);
export let ZERO_DOT_ZERO: BigDecimal = BigDecimal.fromString("0.0");

function generateAccountId(owner: Address, pool: Address): string {
  return "owner-" + owner.toHex() + "_pool-" + pool.toHex();
}

export function loadAccount(owner: Address, pool: Address): Account {
  let accountId = generateAccountId(owner, pool);
  return Account.load(accountId) as Account;
}

export function loadOrCreateAccount(owner: Address, pool: Address): Account {
  let accountId = generateAccountId(owner, pool);
  let account = Account.load(accountId);

  if (!account) {
    //We need to initialise the user on the first account created
    initUser(owner);
    account = new Account(accountId);
    account.owner = owner.toHex();
    account.pool = pool.toHex();
    account.qtyPerCycle = ZERO;
    account.startCycle = ZERO;
    account.endCycle = ZERO;
    account.createdAt = ZERO;
    account.modifiedAt = ZERO;
    account.baseTokenDeposit = ZERO;
    account.accruedOrderTokenBalance = ZERO;
  }

  return account as Account;
}

export function loadOrCreateRegistry(): Registry {
  let registryId = "registry"; //This is a singleton
  let registry = Registry.load(registryId);

  if (!registry) {
    registry = new Registry(registryId);
    registry.baseTokens = [];
    registry.orderTokens = [];
  }

  return registry as Registry;
}

export function loadOrCreateToken(address: Address): TokenMeta {
  let tokenId = address.toHex();
  log.info("Loading token {}", [tokenId]);
  let token = TokenMeta.load(tokenId);

  if (!token) {
    log.info("Token not found creating now {}", [tokenId]);
    let contract = ERC20.bind(address);
    token = new TokenMeta(tokenId);
    token.decimals = BigInt.fromI32(contract.decimals());
    token.symbol = contract.symbol().toString();
    token.save();
  }

  return token as TokenMeta;
}

function initUser(userAddress: Address): void {
  let user = User.load(userAddress.toHex());

  if (!user) {
    user = new User(userAddress.toHex());
    user.save();
  }
}
