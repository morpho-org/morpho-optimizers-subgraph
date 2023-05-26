import { BigInt } from "@graphprotocol/graph-ts";

export class GrowthFactors {
  p2pBorrowGrowthFactor: BigInt;
  p2pSupplyGrowthFactor: BigInt;
  poolBorrowGrowthFactor: BigInt;
  poolSupplyGrowthFactor: BigInt;

  constructor(
    p2pBorrowGrowthFactor: BigInt,
    p2pSupplyGrowthFactor: BigInt,
    poolBorrowGrowthFactor: BigInt,
    poolSupplyGrowthFactor: BigInt
  ) {
    this.p2pBorrowGrowthFactor = p2pBorrowGrowthFactor;
    this.p2pSupplyGrowthFactor = p2pSupplyGrowthFactor;
    this.poolBorrowGrowthFactor = poolBorrowGrowthFactor;
    this.poolSupplyGrowthFactor = poolSupplyGrowthFactor;
  }
}
