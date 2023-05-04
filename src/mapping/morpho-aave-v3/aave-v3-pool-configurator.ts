import { log } from "@graphprotocol/graph-ts";

import { Market } from "../../../generated/morpho-v1/schema";
import {
  ATokenUpgraded,
  BorrowCapChanged,
  BorrowableInIsolationChanged,
  BridgeProtocolFeeUpdated,
  CollateralConfigurationChanged,
  DebtCeilingChanged,
  EModeAssetCategoryChanged,
  EModeCategoryAdded,
  FlashloanPremiumToProtocolUpdated,
  FlashloanPremiumTotalUpdated,
  LiquidationProtocolFeeChanged,
  ReserveActive,
  ReserveBorrowing,
  ReserveDropped,
  ReserveFactorChanged,
  ReserveFlashLoaning,
  ReserveFrozen,
  ReserveInitialized,
  ReserveInterestRateStrategyChanged,
  ReservePaused,
  ReserveStableRateBorrowing,
  SiloedBorrowingChanged,
  StableDebtTokenUpgraded,
  SupplyCapChanged,
  UnbackedMintCapChanged,
  VariableDebtTokenUpgraded,
} from "../../../generated/morpho-v1/templates/AaveV3PoolConfigurator/AaveV3PoolConfigurator";

export function handleATokenUpgraded(event: ATokenUpgraded): void {}

export function handleBorrowCapChanged(event: BorrowCapChanged): void {
  const market = Market.load(event.params.asset);
  if (!market) {
    log.info("[Borrow cap changed] Market not created on Morpho: {}", [
      event.params.asset.toHexString(),
    ]);
    return;
  }
  market.borrowCap = event.params.newBorrowCap;
  market.save();
}

export function handleBorrowableInIsolationChanged(event: BorrowableInIsolationChanged): void {}

export function handleBridgeProtocolFeeUpdated(event: BridgeProtocolFeeUpdated): void {}

export function handleCollateralConfigurationChanged(event: CollateralConfigurationChanged): void {}

export function handleDebtCeilingChanged(event: DebtCeilingChanged): void {}

export function handleEModeAssetCategoryChanged(event: EModeAssetCategoryChanged): void {}

export function handleEModeCategoryAdded(event: EModeCategoryAdded): void {}

export function handleFlashloanPremiumToProtocolUpdated(
  event: FlashloanPremiumToProtocolUpdated
): void {}

export function handleFlashloanPremiumTotalUpdated(event: FlashloanPremiumTotalUpdated): void {}

export function handleLiquidationProtocolFeeChanged(event: LiquidationProtocolFeeChanged): void {}

export function handleReserveActive(event: ReserveActive): void {}

export function handleReserveBorrowing(event: ReserveBorrowing): void {}

export function handleReserveDropped(event: ReserveDropped): void {}

export function handleReserveFactorChanged(event: ReserveFactorChanged): void {}

export function handleReserveFlashLoaning(event: ReserveFlashLoaning): void {}

export function handleReserveFrozen(event: ReserveFrozen): void {}

export function handleReserveInitialized(event: ReserveInitialized): void {}

export function handleReserveInterestRateStrategyChanged(
  event: ReserveInterestRateStrategyChanged
): void {}

export function handleReservePaused(event: ReservePaused): void {}

export function handleReserveStableRateBorrowing(event: ReserveStableRateBorrowing): void {}

export function handleSiloedBorrowingChanged(event: SiloedBorrowingChanged): void {}

export function handleStableDebtTokenUpgraded(event: StableDebtTokenUpgraded): void {}

export function handleSupplyCapChanged(event: SupplyCapChanged): void {
  const market = Market.load(event.params.asset);
  if (!market) {
    log.info("[Supply cap changed] Market not created on Morpho: {}", [
      event.params.asset.toHexString(),
    ]);
    return;
  }
  market.supplyCap = event.params.newSupplyCap;
  market.save();
}

export function handleUnbackedMintCapChanged(event: UnbackedMintCapChanged): void {}

export function handleVariableDebtTokenUpgraded(event: VariableDebtTokenUpgraded): void {}
