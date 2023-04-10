import {
  MorphoAaveV3,
  Initialized,
  OwnershipTransferStarted,
  OwnershipTransferred,
  Supplied,
  CollateralSupplied,
  Borrowed,
  Repaid,
  Withdrawn,
  CollateralWithdrawn,
  Liquidated,
  ManagerApproval,
  SupplyPositionUpdated,
  BorrowPositionUpdated,
  P2PSupplyDeltaUpdated,
  P2PBorrowDeltaUpdated,
  P2PTotalsUpdated,
  RewardsClaimed,
  IsCollateralSet,
  IsClaimRewardsPausedSet,
  IsSupplyPausedSet,
  IsSupplyCollateralPausedSet,
  IsBorrowPausedSet,
  IsWithdrawPausedSet,
  IsWithdrawCollateralPausedSet,
  IsRepayPausedSet,
  IsLiquidateCollateralPausedSet,
  IsLiquidateBorrowPausedSet,
  IsP2PDisabledSet,
  IsDeprecatedSet,
  P2PDeltasIncreased,
  MarketCreated,
  DefaultIterationsSet,
  PositionsManagerSet,
  RewardsManagerSet,
  TreasuryVaultSet,
  ReserveFactorSet,
  P2PIndexCursorSet,
  IndexesUpdated,
  IdleSupplyUpdated,
  ReserveFeeClaimed,
  UserNonceIncremented,
} from "../../../generated/MorphoAaveV3/MorphoAaveV3";

export function handleInitialized(event: Initialized): void {}

export function handleOwnershipTransferStarted(event: OwnershipTransferStarted): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleSupplied(event: Supplied): void {}

export function handleCollateralSupplied(event: CollateralSupplied): void {}

export function handleBorrowed(event: Borrowed): void {}

export function handleRepaid(event: Repaid): void {}

export function handleWithdrawn(event: Withdrawn): void {}

export function handleCollateralWithdrawn(event: CollateralWithdrawn): void {}

export function handleLiquidated(event: Liquidated): void {}

export function handleManagerApproval(event: ManagerApproval): void {}

export function handleSupplyPositionUpdated(event: SupplyPositionUpdated): void {}

export function handleBorrowPositionUpdated(event: BorrowPositionUpdated): void {}

export function handleP2PSupplyDeltaUpdated(event: P2PSupplyDeltaUpdated): void {}

export function handleP2PBorrowDeltaUpdated(event: P2PBorrowDeltaUpdated): void {}

export function handleP2PTotalsUpdated(event: P2PTotalsUpdated): void {}

export function handleRewardsClaimed(event: RewardsClaimed): void {}

export function handleIsCollateralSet(event: IsCollateralSet): void {}

export function handleIsClaimRewardsPausedSet(event: IsClaimRewardsPausedSet): void {}

export function handleIsSupplyPausedSet(event: IsSupplyPausedSet): void {}

export function handleIsSupplyCollateralPausedSet(event: IsSupplyCollateralPausedSet): void {}

export function handleIsBorrowPausedSet(event: IsBorrowPausedSet): void {}

export function handleIsWithdrawPausedSet(event: IsWithdrawPausedSet): void {}

export function handleIsWithdrawCollateralPausedSet(event: IsWithdrawCollateralPausedSet): void {}

export function handleIsRepayPausedSet(event: IsRepayPausedSet): void {}

export function handleIsLiquidateCollateralPausedSet(event: IsLiquidateCollateralPausedSet): void {}

export function handleIsLiquidateBorrowPausedSet(event: IsLiquidateBorrowPausedSet): void {}

export function handleIsP2PDisabledSet(event: IsP2PDisabledSet): void {}

export function handleIsDeprecatedSet(event: IsDeprecatedSet): void {}

export function handleP2PDeltasIncreased(event: P2PDeltasIncreased): void {}

export function handleMarketCreated(event: MarketCreated): void {}

export function handleDefaultIterationsSet(event: DefaultIterationsSet): void {}

export function handlePositionsManagerSet(event: PositionsManagerSet): void {}

export function handleRewardsManagerSet(event: RewardsManagerSet): void {}

export function handleTreasuryVaultSet(event: TreasuryVaultSet): void {}

export function handleReserveFactorSet(event: ReserveFactorSet): void {}

export function handleP2PIndexCursorSet(event: P2PIndexCursorSet): void {}

export function handleIndexesUpdated(event: IndexesUpdated): void {}

export function handleIdleSupplyUpdated(event: IdleSupplyUpdated): void {}

export function handleReserveFeeClaimed(event: ReserveFeeClaimed): void {}

export function handleUserNonceIncremented(event: UserNonceIncremented): void {}
