import { BigInt } from "@graphprotocol/graph-ts";

import { minBNS } from "../../bn";
import { BIGINT_TWO, WAD_BI } from "../../constants";

class CompoundMath {
  static WAD: BigInt = WAD_BI;

  static mul(x: BigInt, y: BigInt) {
    x.times(y).div(WAD_BI);
  }

  static div(x: BigInt, y: BigInt): BigInt {
    return this.WAD.times(x).times(this.WAD).div(y).div(this.WAD);
  }

  static min(a: BigInt, b: BigInt, c: BigInt): BigInt {
    return minBNS([a, b, c]);
  }

  static safeSub(a: BigInt, b: BigInt): BigInt {
    return a.ge(b) ? a.minus(b) : BigInt.zero();
  }

  static average(a: BigInt, b: BigInt) {
    return a // (a + b) / 2 can overflow, so we distribute.
      .div(BIGINT_TWO)
      .plus(b.div(BIGINT_TWO))
      .plus(a.mod(BIGINT_TWO).plus(b.mod(BIGINT_TWO)).div(BIGINT_TWO));
  }
}

export default CompoundMath;
