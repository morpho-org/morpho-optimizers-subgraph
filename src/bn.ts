import { BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export function pow10(power: i32): BigInt {
  return BigInt.fromI32(10).pow(power as u8);
}

export function pow10Decimal(power: i32): BigDecimal {
  return pow10(power as u8).toBigDecimal();
}

export function minBN(b1: BigInt, b2: BigInt): BigInt {
  return b1.gt(b2) ? b2 : b1;
}

export function minBNS(bns: BigInt[]): BigInt {
  if (bns.length < 2) throw new Error("minBNS need at least 2 BigNumbers");
  if (bns.length === 2) return minBN(bns[0], bns[1]);
  const b1 = bns.pop();
  return minBN(b1, minBNS(bns));
}

export function maxBN(b1: BigInt, b2: BigInt): BigInt {
  return b1.gt(b2) ? b1 : b2;
}

export function maxBNS(bns: BigInt[]): BigInt {
  if (bns.length < 2) throw new Error("maxBNS need at least 2 BigNumbers");
  if (bns.length === 2) return maxBN(bns[0], bns[1]);
  const b1 = bns.pop();
  return maxBN(b1, maxBNS(bns));
}
