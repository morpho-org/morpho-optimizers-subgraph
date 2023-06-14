import { BigInt, ethereum } from "@graphprotocol/graph-ts";

import { Market, Token, _P2PIndexesUpdatedInvariant } from "../../../generated/morpho-v1/schema";
import { pow10, pow10Decimal } from "../../bn";
import { BIGDECIMAL_HUNDRED } from "../../constants";
import { initP2PIndexesUpdatedIndexInvariant } from "../initializers";
import { IMaths } from "../maths/maths.interface";

export function _createP2PIndexesUpdatedInvariant(
  event: ethereum.Event,
  market: Market,
  inputToken: Token,
  p2pSupplyIndex: BigInt,
  p2pBorrowIndex: BigInt,
  __MATHS__: IMaths
): _P2PIndexesUpdatedInvariant | null {
  const lastP2PIndexesUpdated = market._lastP2PIndexesUpdatedInvariant
    ? _P2PIndexesUpdatedInvariant.load(market._lastP2PIndexesUpdatedInvariant!)
    : null;

  const invariant = initP2PIndexesUpdatedIndexInvariant(
    event,
    market,
    p2pSupplyIndex,
    p2pBorrowIndex
  );
  if (!invariant) return null;

  // This update the different values.
  if (!!lastP2PIndexesUpdated) {
    invariant._morphoP2PSupplyInterests_BI = __MATHS__.indexMul(
      invariant.morphoP2PSupplyIndex.minus(lastP2PIndexesUpdated.morphoP2PSupplyIndex),
      market._scaledSupplyInP2P
    );
    invariant._morphoP2PBorrowInterests_BI = __MATHS__.indexMul(
      invariant.morphoP2PBorrowIndex.minus(lastP2PIndexesUpdated.morphoP2PBorrowIndex),
      market._scaledBorrowInP2P
    );
    invariant._subgraphP2PSupplyInterests_BI = __MATHS__.indexMul(
      invariant.subgraphP2PSupplyIndex.minus(lastP2PIndexesUpdated.subgraphP2PSupplyIndex),
      market._scaledSupplyInP2P
    );
    invariant._subgraphP2PBorrowInterests_BI = __MATHS__.indexMul(
      invariant.subgraphP2PBorrowIndex.minus(lastP2PIndexesUpdated.subgraphP2PBorrowIndex),
      market._scaledBorrowInP2P
    );
    invariant.morphoP2PSupplyInterests = invariant._morphoP2PSupplyInterests_BI
      .toBigDecimal()
      .div(pow10Decimal(inputToken.decimals));
    invariant.morphoP2PBorrowInterests = invariant._morphoP2PBorrowInterests_BI
      .toBigDecimal()
      .div(pow10Decimal(inputToken.decimals));
    invariant.subgraphP2PSupplyInterests = invariant._subgraphP2PSupplyInterests_BI
      .toBigDecimal()
      .div(pow10Decimal(inputToken.decimals));
    invariant.subgraphP2PBorrowInterests = invariant._subgraphP2PBorrowInterests_BI
      .toBigDecimal()
      .div(pow10Decimal(inputToken.decimals));
    invariant._supplyP2PDerivation_BI = invariant._subgraphP2PSupplyInterests_BI.isZero()
      ? BigInt.zero()
      : invariant._morphoP2PSupplyInterests_BI
          .minus(invariant._subgraphP2PSupplyInterests_BI)
          .div(invariant._subgraphP2PSupplyInterests_BI);
    invariant._borrowP2PDerivation_BI = invariant._subgraphP2PBorrowInterests_BI.isZero()
      ? BigInt.zero()
      : invariant._morphoP2PBorrowInterests_BI
          .minus(invariant._subgraphP2PBorrowInterests_BI)
          .div(invariant._subgraphP2PBorrowInterests_BI);
    invariant.supplyP2PDerivation = invariant._supplyP2PDerivation_BI
      .toBigDecimal()
      .times(BIGDECIMAL_HUNDRED);
    invariant.borrowP2PDerivation = invariant._borrowP2PDerivation_BI
      .toBigDecimal()
      .times(BIGDECIMAL_HUNDRED);
  }
  return invariant;
}
