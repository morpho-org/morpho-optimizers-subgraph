import { BigInt } from "@graphprotocol/graph-ts";

import { BLOCKS_PER_YEAR } from "../../constants";
import { computeIndexLinearInterests } from "../common/InterestRatesModel";

import WadRayMath from "./WadRayMath";
import { IMaths } from "./maths.interface";

export class CompoundMath implements IMaths {
  INDEX_ONE(): BigInt {
    return WadRayMath.WAD;
  }

  indexMul(x: BigInt, y: BigInt): BigInt {
    return WadRayMath.wadMul(x, y);
  }

  indexDiv(x: BigInt, y: BigInt): BigInt {
    return WadRayMath.wadDiv(x, y);
  }

  toAPR(rate: BigInt): BigInt {
    return rate.times(BLOCKS_PER_YEAR);
  }

  computeNewSupplyIndex(
    index: BigInt,
    rate: BigInt,
    _timestampDiff: BigInt,
    blockDiff: BigInt
  ): BigInt {
    return computeIndexLinearInterests(index, rate, blockDiff, this);
  }

  computeNewBorrowIndex(
    index: BigInt,
    rate: BigInt,
    _timestampDiff: BigInt,
    blockDiff: BigInt
  ): BigInt {
    return computeIndexLinearInterests(index, rate, blockDiff, this);
  }
}
