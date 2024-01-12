import { Address, BigDecimal } from "@graphprotocol/graph-ts";

import { UnderlyingTokenMapping } from "../../../generated/morpho-v1/schema";
import { CollateralConfigurationChanged } from "../../../generated/morpho-v1/templates/LendingPoolConfigurator/LendingPoolConfigurator";
import { BASE_UNITS, BIGDECIMAL_ONE } from "../../constants";
import { getMarket } from "../../utils/initializers";

export function handleCollateralConfigurationChanged(event: CollateralConfigurationChanged): void {
  const tokenMapping = UnderlyingTokenMapping.load(event.params.asset);
  if (!tokenMapping) return; // Not a Morpho market
  // Morpho has the same parameters as Aave
  const market = getMarket(Address.fromBytes(tokenMapping.aToken));

  market.maximumLTV = event.params.ltv.toBigDecimal().div(BASE_UNITS);
  market.liquidationThreshold = event.params.liquidationThreshold.toBigDecimal().div(BASE_UNITS);
  market.liquidationPenalty = event.params.liquidationBonus.toBigDecimal().div(BASE_UNITS);

  // The liquidation bonus value is equal to the liquidation penalty, the naming is a matter of which side of the liquidation a user is on
  // The liquidationBonus parameter comes out as above 1
  // The LiquidationPenalty is thus the liquidationBonus minus 1
  if (market.liquidationPenalty.gt(BigDecimal.zero())) {
    market.liquidationPenalty = market.liquidationPenalty.minus(BIGDECIMAL_ONE);
  }

  market._market_liquidationPenalty = market.liquidationPenalty;
  market._market_liquidationThreshold = market.liquidationThreshold;
  market._market_maximumLTV = market.maximumLTV;

  market.save();
}
