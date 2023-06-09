import { BigInt } from "@graphprotocol/graph-ts";

import {
  computeIndexCompoundedInterests,
  computeIndexLinearInterests,
} from "../common/InterestRatesModel";

import WadRayMath from "./WadRayMath";
import { IMaths } from "./maths.interface";

export class AaveMath implements IMaths {
  INDEX_ONE(): BigInt {
    return WadRayMath.RAY;
  }

  indexMul(x: BigInt, y: BigInt): BigInt {
    return WadRayMath.rayMul(x, y);
  }

  indexDiv(x: BigInt, y: BigInt): BigInt {
    return WadRayMath.rayDiv(x, y);
  }

  toAPR(rate: BigInt): BigInt {
    return rate;
  }

  computeNewSupplyIndex(
    index: BigInt,
    rate: BigInt,
    timestampDiff: BigInt,
    _blockDiff: BigInt
  ): BigInt {
    return computeIndexLinearInterests(index, rate, timestampDiff, this);
  }

  computeNewBorrowIndex(
    index: BigInt,
    rate: BigInt,
    timestampDiff: BigInt,
    _blockDiff: BigInt
  ): BigInt {
    return computeIndexCompoundedInterests(index, rate, timestampDiff, this);
  }
}
