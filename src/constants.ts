import { Address, BigDecimal, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

///////////////////
///// Numbers /////
///////////////////

export const INT_NEGATIVE_ONE = -1 as i32;
export const INT_ZERO = 0 as i32;
export const INT_ONE = 1 as i32;
export const INT_TWO = 2 as i32;
export const INT_FOUR = 4 as i32;

export const BIGINT_ONE = BigInt.fromI32(1);
export const BIGINT_TWO = BigInt.fromI32(2);
export const BIGINT_THREE = BigInt.fromI32(3);

export const BIGINT_TEN_TO_EIGHTEENTH = BigInt.fromString("10").pow(18);

export const BIGDECIMAL_ZERO = new BigDecimal(BigInt.zero());
export const BIGDECIMAL_ONE = new BigDecimal(BIGINT_ONE);
export const BIGDECIMAL_THREE = new BigDecimal(BIGINT_THREE);
export const BIGDECIMAL_HUNDRED = new BigDecimal(BigInt.fromI32(100));

export const DEFAULT_DECIMALS = 18;
export const RAY_OFFSET = 27;
export const SECONDS_PER_HOUR = 60 * 60;
export const SECONDS_PER_DAY = 60 * 60 * 24;
export const SECONDS_PER_YEAR = 365 * SECONDS_PER_DAY;

export const BLOCKS_PER_YEAR = BigInt.fromI32(2632320 as i32); // 7200 blocks per day

///////////////////////////////
///// Protocols variables /////
///////////////////////////////

export const BASE_UNITS = BigDecimal.fromString("10000");
export const BASE_UNITS_BI = BigInt.fromString("10000");
export const HALF_UNITS_BI = BASE_UNITS_BI.div(BIGINT_TWO);
export const WAD = BigDecimal.fromString("1000000000000000000");
export const WAD_BI = BigInt.fromString("1000000000000000000");
export const HALF_WAD_BI = WAD_BI.div(BIGINT_TWO);

export const RAY = BigDecimal.fromString("1000000000000000000000000000");

export const RAY_BI = BigInt.fromString("1000000000000000000000000000");
export const HALF_RAY_BI = RAY_BI.div(BIGINT_TWO);

export const WAD_RAY_RATIO = BigInt.fromI32(10).pow(9);
export const HALF_WAD_RAY_RATIO = WAD_RAY_RATIO.div(BIGINT_TWO);

export const AAVE_V3_market_oracle_OFFSET = BigDecimal.fromString("100000000"); // 1e8

export namespace ProtocolType {
  export const LENDING = "LENDING";
}

export namespace LendingType {
  export const CDP = "CDP";
}

export namespace InterestRateType {
  export const STABLE = "STABLE";
  export const VARIABLE = "VARIABLE";
  export const FIXED = "FIXED";
  export const POOL = "POOL";
  export const P2P = "P2P";
}

export namespace InterestRateSide {
  export const LENDER = "LENDER";
  export const BORROWER = "BORROWER";
}

export namespace PositionSide {
  export const LENDER = "LENDER";
  export const BORROWER = "BORROWER";
}

export namespace EventType {
  export const DEPOSIT = 1;
  export const WITHDRAW = 2;
  export const BORROW = 3;
  export const REPAY = 4;
  export const LIQUIDATOR = 5;
  export const LIQUIDATEE = 6;

  export const SUPPLIER_POSITION_UPDATE = 7;

  export const BORROWER_POSITION_UPDATE = 8;

  export const DEPOSIT_COLLATERAL = 9;

  export const WITHDRAW_COLLATERAL = 10;
}

export namespace ActivityType {
  export const DAILY = "DAILY";
  export const HOURLY = "HOURLY";
}

/////////////////////
///// Addresses /////
/////////////////////

export const MORPHO_AAVE_V2_ADDRESS = Address.fromBytes(
  Bytes.fromHexString("0x777777c9898d384f785ee44acfe945efdff5f3e0")
);

export const MORPHO_COMPOUND_ADDRESS = Address.fromBytes(
  Bytes.fromHexString("0x8888882f8f843896699869179fb6e4f7e3b58888")
);

export const MORPHO_AAVE_V3_ADDRESS = Address.fromBytes(
  Bytes.fromHexString("0x33333aea097c193e66081e930c33020272b33333")
);

export const C_ETH = Address.fromBytes(
  Bytes.fromHexString("0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5")
);
export const WRAPPED_ETH = Address.fromBytes(
  Bytes.fromHexString("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
);

export const ETH_USD_PRICE_FEED_ADDRESS = Address.fromBytes(
  Bytes.fromHexString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419")
);

/////////////////////////////
/////  Default values   /////
/////////////////////////////

export const AAVE_CLOSE_FACTOR = BigDecimal.fromString("0.5"); // 50% of the position is liquidated

/////////////////////////////
///// Utility Functions /////
/////////////////////////////

export function readValue<T>(callResult: ethereum.CallResult<T>, defaultValue: T): T {
  return callResult.reverted ? defaultValue : callResult.value;
}

export function equalsIgnoreCase(a: string, b: string): boolean {
  return a.replace("-", "_").toLowerCase() == b.replace("-", "_").toLowerCase();
}
