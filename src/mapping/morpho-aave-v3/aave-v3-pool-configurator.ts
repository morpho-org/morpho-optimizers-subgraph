import { BigDecimal, log } from "@graphprotocol/graph-ts";

import { EMode, Market } from "../../../generated/morpho-v1/schema";
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
import { BASE_UNITS, BIGDECIMAL_ONE } from "../../constants";

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

export function handleCollateralConfigurationChanged(event: CollateralConfigurationChanged): void {
  const market = Market.load(event.params.asset);
  if (!market) {
    log.info("[Supply cap changed] Market not created on Morpho: {}", [
      event.params.asset.toHexString(),
    ]);
    return;
  }

  market._market_maximumLTV = event.params.ltv.toBigDecimal().div(BASE_UNITS);
  market._market_liquidationThreshold = event.params.liquidationThreshold
    .toBigDecimal()
    .div(BASE_UNITS);
  market._market_liquidationPenalty = event.params.liquidationBonus.toBigDecimal().div(BASE_UNITS);

  // The liquidation bonus value is equal to the liquidation penalty, the naming is a matter of which side of the liquidation a user is on
  // The liquidationBonus parameter comes out as above 1
  // The LiquidationPenalty is thus the liquidationBonus minus 1
  if (market._market_liquidationPenalty.gt(BigDecimal.zero())) {
    market._market_liquidationPenalty = market._market_liquidationPenalty.minus(BIGDECIMAL_ONE);
  }

  if (market._eMode === "0" || !market._eMode) {
    market.liquidationPenalty = market._market_liquidationPenalty;
    market.liquidationThreshold = market._market_liquidationThreshold;
    market.maximumLTV = market._market_maximumLTV;
  }

  market.save();
}

export function handleDebtCeilingChanged(event: DebtCeilingChanged): void {}

export function handleEModeAssetCategoryChanged(event: EModeAssetCategoryChanged): void {
  const market = Market.load(event.params.asset);
  if (!market) {
    log.info("[EMode changed] Market not created on Morpho: {}", [
      event.params.asset.toHexString(),
    ]);
    return;
  }

  const eMode = EMode.load(event.params.newCategoryId.toString());

  if (!eMode) {
    // No eMode
    market._eMode = null;
    market.liquidationPenalty = market._market_liquidationPenalty;
    market.liquidationThreshold = market._market_liquidationThreshold;
    market.maximumLTV = market._market_maximumLTV;
    market.oracle = market._market_oracle;
    market.save();
    return;
  }

  market._eMode = eMode.id;
  market.liquidationPenalty = eMode.liquidationPenalty;
  market.liquidationThreshold = eMode.liquidationThreshold;
  market.maximumLTV = eMode.maximumLTV;
  market.oracle = eMode.oracle;
  market.save();
}

export function handleEModeCategoryAdded(event: EModeCategoryAdded): void {
  const eMode = new EMode(event.params.categoryId.toString());

  eMode.label = event.params.label;
  eMode.liquidationThreshold = event.params.liquidationThreshold.toBigDecimal().div(BASE_UNITS);
  eMode.maximumLTV = event.params.ltv.toBigDecimal().div(BASE_UNITS);
  eMode.oracle = event.params.oracle;
  eMode.liquidationPenalty = event.params.liquidationBonus.toBigDecimal().div(BASE_UNITS);

  // The liquidation bonus value is equal to the liquidation penalty, the naming is a matter of which side of the liquidation a user is on
  // The liquidationBonus parameter comes out as above 1
  // The LiquidationPenalty is thus the liquidationBonus minus 1
  if (eMode.liquidationPenalty.gt(BigDecimal.zero())) {
    eMode.liquidationPenalty = eMode.liquidationPenalty.minus(BIGDECIMAL_ONE);
  }

  eMode.save();
}

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
