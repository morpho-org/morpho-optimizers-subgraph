import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import { AaveV3AddressesProvider } from "../../../generated/morpho-v1/MorphoAaveV3/AaveV3AddressesProvider";
import { AaveV3PriceOracle } from "../../../generated/morpho-v1/MorphoAaveV3/AaveV3PriceOracle";
import { MorphoAaveV3 } from "../../../generated/morpho-v1/MorphoAaveV3/MorphoAaveV3";
import { Market } from "../../../generated/morpho-v1/schema";
import { AAVE_V3_ORACLE_OFFSET, MORPHO_AAVE_V3_ADDRESS } from "../../constants";

export function fetchAssetPriceAaveV3(market: Market): BigDecimal {
  const morpho = MorphoAaveV3.bind(MORPHO_AAVE_V3_ADDRESS);
  const addressesProvider = AaveV3AddressesProvider.bind(morpho.addressesProvider());
  const oracle = AaveV3PriceOracle.bind(addressesProvider.getPriceOracle());

  return oracle
    .getAssetPrice(Address.fromString(market.inputToken.toHexString()))
    .toBigDecimal()
    .div(AAVE_V3_ORACLE_OFFSET);
}
