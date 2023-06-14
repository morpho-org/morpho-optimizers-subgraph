import { BigInt } from "@graphprotocol/graph-ts";

export interface IMaths {
  /** Basic unit for maths calculation. Wad for Compound, Ray for AAVE. */
  INDEX_ONE(): BigInt;

  /** Multiply two indexes.
   * @return `x * y`. */
  indexMul(x: BigInt, y: BigInt): BigInt;

  /** Divide two indexes.
   * @return `x / y` */
  indexDiv(x: BigInt, y: BigInt): BigInt;

  /** Turn the rate into APR. Should be the identity function for AAVE, and
   * transforms the ratePerBlock of Compound into a proper APR (`rate * BLOCKS_PER_YEAR`).
   * @return the rate turned into APR */
  toAPR(rate: BigInt): BigInt;

  /** Compute the new index for supply, with the accumulated interests.
   * Should be linear for both Compound and AAVE.
   * @param index the last supply index
   * @param rate the actual supply rate
   * @param timestampDiff the diff between the last timestamp and the actual timestamp. Used for AAVE.
   * @param blockDiff the diff between the last block and the actual block. Used for Compound.
   * @return the rate + accumulated interests as Wad or Ray.
   */
  computeNewSupplyIndex(
    index: BigInt,
    rate: BigInt,
    timestampDiff: BigInt,
    blockDiff: BigInt
  ): BigInt;

  /** Compute the new index for borrow, with the accumulated interests.
   * Should be linear for Compound, and compounded for AAVE.
   * @param index the last borrow index
   * @param rate the actual borrow rate
   * @param timestampDiff the diff between the last timestamp and the actual timestamp. Used for AAVE.
   * @param blockDiff the diff between the last block and the actual block. Used for Compound.
   * @return the rate + accumulated interests as Wad or Ray.
   */
  computeNewBorrowIndex(
    index: BigInt,
    rate: BigInt,
    timestampDiff: BigInt,
    blockDiff: BigInt
  ): BigInt;
}
