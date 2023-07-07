import { Address } from "@graphprotocol/graph-ts";

import { Market } from "../../../generated/morpho-v1/schema";
import { CompoundOracle } from "../../../generated/morpho-v1/templates";
import {
  CompBorrowSpeedUpdated,
  CompSupplySpeedUpdated,
  NewBorrowCap,
  NewCloseFactor,
  NewCollateralFactor,
  NewPriceOracle,
  NewLiquidationIncentive,
} from "../../../generated/morpho-v1/templates/Comptroller/Comptroller";
import { pow10Decimal } from "../../bn";
import { DEFAULT_DECIMALS, MORPHO_COMPOUND_ADDRESS } from "../../constants";
import { getMarket, getOrInitLendingProtocol } from "../../utils/initializers";

export function handleCompBorrowSpeedUpdated(event: CompBorrowSpeedUpdated): void {}

export function handleCompSupplySpeedUpdated(event: CompSupplySpeedUpdated): void {}

export function handleNewBorrowCap(event: NewBorrowCap): void {
  const market = Market.load(event.params.cToken);
  if (market === null) return; // Market not created on Morpho Compound
  market.borrowCap = event.params.newBorrowCap;
  market.save();
}

export function handleNewCloseFactor(event: NewCloseFactor): void {
  const protocol = getOrInitLendingProtocol(MORPHO_COMPOUND_ADDRESS);
  protocol.closeFactor = event.params.newCloseFactorMantissa
    .toBigDecimal()
    .div(pow10Decimal(DEFAULT_DECIMALS));
  protocol.save();
}

export function handleNewLiquidationIncentive(event: NewLiquidationIncentive): void {
  const protocol = getOrInitLendingProtocol(MORPHO_COMPOUND_ADDRESS);
  const liquidationIncentive = event.params.newLiquidationIncentiveMantissa
    .toBigDecimal()
    .div(pow10Decimal(DEFAULT_DECIMALS));
  for (let i = 0; i < protocol.markets.length; i++) {
    const market = getMarket(protocol.markets[i]);
    market.liquidationPenalty = liquidationIncentive;
    market.save();
  }
}

export function handleNewCollateralFactor(event: NewCollateralFactor): void {
  const market = Market.load(event.params.cToken);
  if (market === null) return; // Market not created on Morpho Compound
  market.liquidationThreshold = event.params.newCollateralFactorMantissa
    .toBigDecimal()
    .div(pow10Decimal(DEFAULT_DECIMALS));
  market.save();
}

export function handleNewPriceOracle(event: NewPriceOracle): void {
  if (
    event.params.newPriceOracle.equals(
      Address.fromHexString("0xad47d5a59b6d1ca4dc3ebd53693fda7d7449f165")
    ) // Blacklist broken oracle
  )
    return;
  const protocol = getOrInitLendingProtocol(MORPHO_COMPOUND_ADDRESS);
  protocol.oracle = event.params.newPriceOracle;
  protocol.save();
  CompoundOracle.create(event.params.newPriceOracle);
}
