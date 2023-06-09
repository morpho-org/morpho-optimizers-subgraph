import { BigInt } from "@graphprotocol/graph-ts";

export interface IMaths {
  INDEX_ONE(): BigInt;
  indexMul(x: BigInt, y: BigInt): BigInt;
  indexDiv(x: BigInt, y: BigInt): BigInt;
  toAPR(rate: BigInt): BigInt;
  computeNewSupplyIndex(
    index: BigInt,
    rate: BigInt,
    timestampDiff: BigInt,
    blockDiff: BigInt
  ): BigInt;
  computeNewBorrowIndex(
    index: BigInt,
    rate: BigInt,
    timestampDiff: BigInt,
    blockDiff: BigInt
  ): BigInt;
}
