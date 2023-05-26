import { BigInt } from "@graphprotocol/graph-ts";

import { Market } from "../../../generated/morpho-v1/schema";
import { minBN } from "../../bn";
import { WAD_BI } from "../../constants";
import PercentMath from "../../utils/maths/PercentMath";

function computeP2PRate(
  poolBorrowRate: BigInt,
  poolSupplyRate: BigInt,
  p2pIndexCursor: BigInt
): BigInt {
  if (poolBorrowRate.lt(poolSupplyRate)) return poolBorrowRate;
  return PercentMath.weightedAvg(poolSupplyRate, poolBorrowRate, p2pIndexCursor);
}

export function computeGrowthFactors(
  newPoolSupplyIndex: BigInt,
  newPoolBorrowIndex: BigInt,
  lastSupplyPoolIndex: BigInt,
  lastBorrowPoolIndex: BigInt,
  p2pIndexCursor: BigInt,
  reserveFactor: BigInt
) {
  const poolSupplyGrowthFactor: BigInt = newPoolSupplyIndex.div(lastSupplyPoolIndex);
  const poolBorrowGrowthFactor: BigInt = newPoolBorrowIndex.div(lastBorrowPoolIndex);

  let p2pSupplyGrowthFactor: BigInt;
  let p2pBorrowGrowthFactor: BigInt;

  if (poolSupplyGrowthFactor <= poolBorrowGrowthFactor) {
    const p2pGrowthFactor = PercentMath.weightedAvg(
      poolSupplyGrowthFactor,
      poolBorrowGrowthFactor,
      p2pIndexCursor
    );

    p2pSupplyGrowthFactor = p2pGrowthFactor.minus(
      PercentMath.percentMul(p2pGrowthFactor.minus(poolSupplyGrowthFactor), reserveFactor)
    );
    p2pBorrowGrowthFactor = p2pGrowthFactor.plus(
      PercentMath.percentMul(poolBorrowGrowthFactor.minus(p2pGrowthFactor), reserveFactor)
    );
  } else {
    // The case poolSupplyGrowthFactor > poolBorrowGrowthFactor happens because someone sent underlying tokens to the
    // cToken contract: the peer-to-peer growth factors are set to the pool borrow growth factor.
    p2pSupplyGrowthFactor = poolBorrowGrowthFactor;
    p2pBorrowGrowthFactor = poolBorrowGrowthFactor;
  }
  return {
    p2pBorrowGrowthFactor,
    p2pSupplyGrowthFactor,
    poolBorrowGrowthFactor,
    poolSupplyGrowthFactor,
  };
}

export function computeP2PIndex(
  lastPoolIndex: BigInt,
  lastP2PIndex: BigInt,
  p2pGrowthFactor: BigInt,
  poolGrowthFactor: BigInt,
  p2pDelta: BigInt,
  p2pAmount: BigInt,
  proportionIdle: BigInt
): BigInt {
  let newP2PIndex: BigInt;
  if (p2pAmount.isZero() || (p2pDelta.isZero() && proportionIdle.isZero())) {
    newP2PIndex = lastP2PIndex.times(p2pGrowthFactor);
  } else {
    const proportionOnPool = p2pDelta.times(lastPoolIndex);
    const proportionInP2P = p2pAmount.times(lastP2PIndex);
    const shareOfTheDelta: BigInt = minBN(
      proportionOnPool.div(proportionInP2P),
      WAD_BI.minus(proportionIdle) // To avoid shareOfTheDelta + proportionIdle > 1 with rounding errors.
    );

    newP2PIndex = lastP2PIndex.times(
      WAD_BI.minus(shareOfTheDelta)
        .minus(proportionIdle)
        .times(p2pGrowthFactor)
        .plus(shareOfTheDelta.times(poolGrowthFactor))
        .plus(proportionIdle)
    );
  }
  return newP2PIndex;
}

export function computeP2PSupplyRate(
  poolBorrowRate: BigInt,
  poolSupplyRate: BigInt,
  poolIndex: BigInt,
  p2pIndex: BigInt,
  p2pIndexCursor: BigInt,
  p2pDelta: BigInt,
  p2pAmount: BigInt,
  reserveFactor: BigInt,
  proportionIdle: BigInt
): BigInt {
  let p2pSupplyRate: BigInt;
  if (poolSupplyRate.gt(poolBorrowRate)) {
    p2pSupplyRate = poolBorrowRate;
  } else {
    const p2pRate = computeP2PRate(poolBorrowRate, poolSupplyRate, p2pIndexCursor);
    p2pSupplyRate = p2pRate.minus(
      PercentMath.percentMul(p2pRate.minus(poolSupplyRate), reserveFactor)
    );
  }
  if (p2pDelta.gt(BigInt.zero()) && p2pAmount.gt(BigInt.zero())) {
    const shareOfTheDelta = minBN(
      p2pDelta.times(poolIndex).div(p2pAmount.times(p2pIndex)),
      WAD_BI.minus(proportionIdle) // To avoid shareOfTheDelta > 1 with rounding errors.
    );

    p2pSupplyRate = p2pSupplyRate
      .times(WAD_BI.minus(shareOfTheDelta).minus(proportionIdle))
      .plus(poolSupplyRate.times(shareOfTheDelta))
      .plus(proportionIdle);
  }
  return p2pSupplyRate;
}

export function computeP2PBorrowRate(
  poolBorrowRate: BigInt,
  poolSupplyRate: BigInt,
  poolIndex: BigInt,
  p2pIndex: BigInt,
  p2pIndexCursor: BigInt,
  p2pDelta: BigInt,
  p2pAmount: BigInt,
  reserveFactor: BigInt,
  proportionIdle: BigInt
): BigInt {
  let p2pBorrowRate;
  if (poolSupplyRate.gt(poolBorrowRate)) {
    p2pBorrowRate = poolBorrowRate;
  } else {
    const p2pRate = computeP2PRate(poolBorrowRate, poolSupplyRate, p2pIndexCursor);
    p2pBorrowRate = p2pRate.plus(
      PercentMath.percentMul(poolBorrowRate.minus(p2pRate), reserveFactor)
    );
  }

  if (p2pDelta.gt(BigInt.zero()) && p2pAmount.gt(BigInt.zero())) {
    const shareOfTheDelta = minBN(
      p2pDelta.times(poolIndex).div(p2pAmount.times(p2pIndex)),
      WAD_BI.minus(proportionIdle) // To avoid shareOfTheDelta > 1 with rounding errors.
    );

    p2pBorrowRate = p2pBorrowRate
      .times(WAD_BI.minus(shareOfTheDelta).minus(proportionIdle))
      .plus(poolBorrowRate.times(shareOfTheDelta))
      .plus(proportionIdle);
  }
  return p2pBorrowRate;
}
