import {
  MorphoWithdrawn as MorphoWithdrawnEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  RewardsClaimed as RewardsClaimedEvent,
  RootUpdated as RootUpdatedEvent,
} from "../../../generated/dao/RewardsDistributor/RewardsDistributor";

import { getOrInitAccount } from "./utils/initialisers";

export function handleMorphoWithdrawn(event: MorphoWithdrawnEvent): void {}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {}

export function handleRewardsClaimed(event: RewardsClaimedEvent): void {
  const account = getOrInitAccount(event.params.account);
  account.claimed = account.claimed.plus(event.params.amount);
  account.save();
}

export function handleRootUpdated(event: RootUpdatedEvent): void {}
