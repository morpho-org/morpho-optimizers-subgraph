import { Address, Bytes, BigInt, log } from "@graphprotocol/graph-ts";

import {
  Approval,
  OwnerUpdated,
  PublicCapabilityUpdated,
  RoleCapabilityUpdated,
  Transfer,
  UserRoleUpdated,
} from "../../../generated/dao/MorphoToken/MorphoToken";
import { Account } from "../../../generated/dao/schema";

import { getOrInitAccount, getOrInitRole, loadMetrics } from "./utils/initialisers";

export function handleApproval(event: Approval): void {}

export function handleOwnerUpdated(event: OwnerUpdated): void {}

export function handlePublicCapabilityUpdated(event: PublicCapabilityUpdated): void {}

export function handleRoleCapabilityUpdated(event: RoleCapabilityUpdated): void {
  const role = getOrInitRole(event.params.role);
  const newCapabilities: Bytes[] = [];
  for (let i = 0; i < role.capabilities.length; i++) {
    if (!role.capabilities[i].equals(event.params.functionSig)) {
      newCapabilities.push(role.capabilities[i]);
    }
  }
  if (event.params.enabled) {
    newCapabilities.push(event.params.functionSig);
  }
  role.capabilities = newCapabilities;
  role.save();
}

export function handleTransfer(event: Transfer): void {
  if (Address.zero().equals(event.params.from)) {
    handleMint(event);
    return;
  }

  const emitter = Account.load(event.params.from.toHex());
  const receiver = getOrInitAccount(event.params.to);

  if (!emitter) {
    log.error("Inconsistent transfer: " + event.params.from.toHexString(), []);
    return;
  }

  const metrics = loadMetrics();
  if (emitter.balance.minus(event.params.amount) === BigInt.zero()) {
    metrics.nbHolders = metrics.nbHolders.minus(BigInt.fromI32(1));
  }
  metrics.save();

  emitter.balance = emitter.balance.minus(event.params.amount);
  receiver.balance = receiver.balance.plus(event.params.amount);
  emitter.save();
  receiver.save();
}

function handleMint(event: Transfer): void {
  const reciever = getOrInitAccount(event.params.to);
  reciever.balance = reciever.balance.plus(event.params.amount);
  reciever.minted = reciever.minted.plus(event.params.amount);
  reciever.save();
}

export function handleUserRoleUpdated(event: UserRoleUpdated): void {
  const role = getOrInitRole(event.params.role);
  const account = getOrInitAccount(event.params.user);
  const newAccountRoles: string[] = [];
  for (let i = 0; i < account.roles.length; i++) {
    if (account.roles[i] !== role.id) {
      newAccountRoles.push(account.roles[i]);
    }
  }
  if (event.params.enabled) {
    newAccountRoles.push(role.id);
  }
  account.roles = newAccountRoles;
  account.save();
}
