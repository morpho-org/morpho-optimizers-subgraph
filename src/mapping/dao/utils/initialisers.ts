import { Address, BigInt, log } from "@graphprotocol/graph-ts";

import { Account, Role, Metrics } from "../../../../generated/dao/schema";

export const loadMetrics = (): Metrics => {
  let metrics = Metrics.load("1");
  if (metrics === null) {
    metrics = new Metrics("1");
    metrics.nbHolders = BigInt.zero();
  }
  return metrics;
};

export const getOrInitAccount = (address: Address): Account => {
  let account = Account.load(address.toHex());
  if (!account) {
    const metrics = loadMetrics();
    metrics.nbHolders = metrics.nbHolders.plus(BigInt.fromI32(1));
    metrics.save();
    account = new Account(address.toHex());
    account.address = address;
    account.balance = BigInt.fromI32(0);
    account.claimed = BigInt.fromI32(0);
    account.minted = BigInt.fromI32(0);
    account.roles = [];
  }
  return account;
};

export const getOrInitRole = (id: number): Role => {
  let role = Role.load(id.toString());
  if (!role) {
    role = new Role(id.toString());
    role.capabilities = [];
  }
  return role;
};
