import { BigInt } from "@graphprotocol/graph-ts";

import { minBN, pow10 } from "../../bn";
import { BIGINT_ONE, BIGINT_TWO, SECONDS_PER_YEAR } from "../../constants";
import PercentMath from "../maths/PercentMath";
import { IMaths } from "../maths/maths.interface";

import { GrowthFactors } from "./GrowthFactors";

function computeP2PRate(
  poolBorrowRate: BigInt,
  poolSupplyRate: BigInt,
  p2pIndexCursor: BigInt
): BigInt {
  if (poolBorrowRate.lt(poolSupplyRate)) return poolBorrowRate;
  return PercentMath.weightedAvg(poolSupplyRate, poolBorrowRate, p2pIndexCursor);
}

export function computeProportionIdle(
  indexesOffset: i32,
  idleSupply: BigInt | null,
  p2pSupplyAmount: BigInt,
  p2pSupplyIndex: BigInt
): BigInt {
  const offset: BigInt = pow10(indexesOffset);
  if (idleSupply && idleSupply.gt(BigInt.zero())) {
    const totalP2PSupplied = p2pSupplyAmount.times(p2pSupplyIndex).div(offset);
    const proportionIdle = idleSupply.times(offset).div(totalP2PSupplied);
    if (proportionIdle.gt(offset)) return offset;
    return proportionIdle;
  }
  return BigInt.zero();
}

export function computeProportionDelta(
  p2pDelta: BigInt,
  p2pAmount: BigInt,
  poolIndex: BigInt,
  p2pIndex: BigInt,
  proportionIdle: BigInt,
  __MATHS__: IMaths
): BigInt {
  if (p2pAmount.isZero() || (p2pDelta.isZero() && proportionIdle.isZero())) return BigInt.zero();
  const scaledP2PDelta = __MATHS__.indexMul(p2pDelta, poolIndex);
  const scaledP2PAmount = __MATHS__.indexMul(p2pAmount, p2pIndex);
  const proportionDelta = __MATHS__.indexDiv(scaledP2PDelta, scaledP2PAmount);
  const diffWithProportionIdle = __MATHS__.INDEX_ONE().minus(proportionIdle);
  // To avoid shareOfTheDelta + proportionIdle > 1 with rounding errors.
  return minBN(proportionDelta, diffWithProportionIdle);
}

export function computeGrowthFactors(
  newPoolSupplyIndex: BigInt,
  newPoolBorrowIndex: BigInt,
  lastSupplyPoolIndex: BigInt,
  lastBorrowPoolIndex: BigInt,
  p2pIndexCursor: BigInt,
  reserveFactor: BigInt,
  __MATHS__: IMaths
): GrowthFactors {
  const poolSupplyGrowthFactor: BigInt = __MATHS__.indexDiv(
    newPoolSupplyIndex,
    lastSupplyPoolIndex
  );
  const poolBorrowGrowthFactor: BigInt = __MATHS__.indexDiv(
    newPoolBorrowIndex,
    lastBorrowPoolIndex
  );

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
  return new GrowthFactors(
    p2pBorrowGrowthFactor,
    p2pSupplyGrowthFactor,
    poolBorrowGrowthFactor,
    poolSupplyGrowthFactor
  );
}

export function computeP2PIndex(
  lastP2PIndex: BigInt,
  p2pGrowthFactor: BigInt,
  poolGrowthFactor: BigInt,
  proportionDelta: BigInt,
  proportionIdle: BigInt,
  __MATHS__: IMaths
): BigInt {
  if (proportionDelta.isZero()) return __MATHS__.indexMul(lastP2PIndex, p2pGrowthFactor);
  return __MATHS__.indexMul(
    lastP2PIndex,
    __MATHS__
      .indexMul(__MATHS__.INDEX_ONE().minus(proportionDelta).minus(proportionIdle), p2pGrowthFactor)
      .plus(__MATHS__.indexMul(proportionDelta, poolGrowthFactor))
      .plus(proportionIdle)
  );
}

export function computeP2PSupplyRate(
  poolBorrowRate: BigInt,
  poolSupplyRate: BigInt,
  p2pIndexCursor: BigInt,
  reserveFactor: BigInt,
  proportionDelta: BigInt,
  proportionIdle: BigInt,
  __MATHS__: IMaths
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

  if (!proportionDelta.isZero()) {
    p2pSupplyRate = __MATHS__
      .indexMul(p2pSupplyRate, __MATHS__.INDEX_ONE().minus(proportionDelta).minus(proportionIdle))
      .plus(__MATHS__.indexMul(poolSupplyRate, proportionDelta))
      .plus(proportionIdle);
  }
  return p2pSupplyRate;
}

export function computeP2PBorrowRate(
  poolBorrowRate: BigInt,
  poolSupplyRate: BigInt,
  p2pIndexCursor: BigInt,
  reserveFactor: BigInt,
  proportionDelta: BigInt,
  proportionIdle: BigInt,
  __MATHS__: IMaths
): BigInt {
  let p2pBorrowRate: BigInt;
  if (poolSupplyRate.gt(poolBorrowRate)) {
    p2pBorrowRate = poolBorrowRate;
  } else {
    const p2pRate = computeP2PRate(poolBorrowRate, poolSupplyRate, p2pIndexCursor);
    p2pBorrowRate = p2pRate.plus(
      PercentMath.percentMul(poolBorrowRate.minus(p2pRate), reserveFactor)
    );
  }

  if (!proportionDelta.isZero()) {
    p2pBorrowRate = __MATHS__
      .indexMul(p2pBorrowRate, __MATHS__.INDEX_ONE().minus(proportionDelta).minus(proportionIdle))
      .plus(__MATHS__.indexMul(poolBorrowRate, proportionDelta))
      .plus(proportionIdle);
  }
  return p2pBorrowRate;
}

export function computeIndexLinearInterests(
  index: BigInt,
  rate: BigInt,
  exp: BigInt,
  __MATHS__: IMaths
): BigInt {
  const r = rate.div(BigInt.fromI32(SECONDS_PER_YEAR));
  const factor = __MATHS__.INDEX_ONE().plus(r.times(exp));
  return __MATHS__.indexMul(index, factor);
}

export function computeIndexCompoundedInterests(
  index: BigInt,
  rate: BigInt,
  exp: BigInt,
  __MATHS__: IMaths
): BigInt {
  const s = BigInt.fromI32(SECONDS_PER_YEAR);
  if (exp.equals(BigInt.zero())) return __MATHS__.INDEX_ONE();
  const expMinusOne = exp.minus(BIGINT_ONE);
  const expMinusTwo = exp.gt(BIGINT_TWO) ? exp.minus(BIGINT_TWO) : BigInt.zero();
  const basePowerTwo = __MATHS__.indexMul(rate, rate).div(s.times(s));
  const basePowerThree = __MATHS__.indexMul(basePowerTwo, rate).div(s);
  const secondTerm = exp.times(expMinusOne).times(basePowerTwo).div(BIGINT_TWO);
  const thirdTerm = exp
    .times(expMinusOne)
    .times(expMinusTwo)
    .times(basePowerThree)
    .div(BigInt.fromI32(6));
  const factor = __MATHS__
    .INDEX_ONE()
    .plus(rate.times(exp).div(s))
    .plus(secondTerm)
    .plus(thirdTerm);
  return __MATHS__.indexMul(index, factor);
}
