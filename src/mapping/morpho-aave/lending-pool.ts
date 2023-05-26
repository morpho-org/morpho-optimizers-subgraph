import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

import {
  LendingProtocol,
  Market,
  UnderlyingTokenMapping,
} from "../../../generated/morpho-v1/schema";
import { ReserveDataUpdated } from "../../../generated/morpho-v1/templates/LendingPool/LendingPool";
import { MORPHO_AAVE_V2_ADDRESS } from "../../constants";
import { fetchAssetPrice } from "../../utils/aaveV2/fetchers";
import { getOrInitLendingProtocol, getOrInitToken } from "../../utils/initializers";
import { AaveMath } from "../../utils/maths/AaveMath";
import { _handleReserveUpdate } from "../common";

export class ReserveUpdateParams {
  constructor(
    public readonly event: ethereum.Event,
    public readonly marketAddress: Bytes,
    public readonly protocol: LendingProtocol,
    public readonly reserveSupplyIndex: BigInt,
    public readonly reserveBorrowIndex: BigInt,

    public readonly poolSupplyRate: BigInt,
    public readonly poolBorrowRate: BigInt
  ) {}
}

/**
 * Updates the reserve data for the given reserve
 * Since Morpho use indexes to approximate the P2P rates, we can assume that the P2P rates are updated each time the reserve data is updated
 * @param event
 */
export function handleReserveDataUpdated(event: ReserveDataUpdated): void {
  const tokenMapping = UnderlyingTokenMapping.load(event.params.reserve);
  if (!tokenMapping) return; // Not a Morpho market
  const market = Market.load(tokenMapping.aToken);
  if (!market) return; // Not a Morpho market

  const inputToken = getOrInitToken(event.params.reserve);
  const protocol = getOrInitLendingProtocol(MORPHO_AAVE_V2_ADDRESS);

  // update the token price frequently
  const tokenPrice = fetchAssetPrice(market);
  market.inputTokenPriceUSD = tokenPrice;
  inputToken.lastPriceUSD = tokenPrice;
  market.save();
  inputToken.save();

  const params = new ReserveUpdateParams(
    event,
    market.id,
    protocol,
    event.params.liquidityIndex,
    event.params.variableBorrowIndex,
    event.params.liquidityRate,
    event.params.variableBorrowRate
  );
  _handleReserveUpdate(params, new AaveMath());
}
