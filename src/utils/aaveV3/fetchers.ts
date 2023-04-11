import { Address, BigDecimal, BigInt, log } from "@graphprotocol/graph-ts";

import { AToken } from "../../../generated/MorphoAaveV2/AToken";
import { DebtToken } from "../../../generated/MorphoAaveV2/DebtToken";
import { Market, UnderlyingTokenMapping } from "../../../generated/schema";
import {
  exponentToBigDecimal,
  exponentToBigInt,
  MORPHO_AAVE_V2_ADDRESS,
  WAD_BI,
} from "../../constants";
import { MorphoPositions } from "../../mapping/common";
import { getOrInitToken } from "../initializers";

export const fetchMorphoPositionsAaveV3 = (market: Market): MorphoPositions => {
  const inputToken = getOrInitToken(market.inputToken);
  const tokenMapping = UnderlyingTokenMapping.load(market.inputToken);
  if (!tokenMapping?.aTokenV3 || !tokenMapping?.variableDebtTokenV3) {
    log.critical("No token mapping found for reserve: {}", [market.id.toHexString()]);
    return new MorphoPositions(
      BigDecimal.zero(),
      BigDecimal.zero(),
      BigDecimal.zero(),
      BigDecimal.zero(),
      BigInt.zero(),
      BigInt.zero(),
      BigInt.zero(),
      BigInt.zero(),
      BigDecimal.zero(),
      BigInt.zero()
    );
  }

  const aToken = AToken.bind(tokenMapping.aTokenV3);

  const debtToken = DebtToken.bind(Address.fromBytes(tokenMapping.variableDebtTokenV3));

  const morphoSupplyAndCollateralOnPool_BI = aToken.balanceOf(MORPHO_AAVE_V2_ADDRESS);

  const scaledOnPool = market._scaledPoolCollateral!.plus(market._scaledSupplyOnPool);
  const proportionCollateral = scaledOnPool.isZero()
    ? BigInt.zero()
    : market._scaledPoolCollateral!.times(WAD_BI).div(scaledOnPool);

  const morphoCollateralOnPool_BI = morphoSupplyAndCollateralOnPool_BI
    .times(proportionCollateral)
    .div(WAD_BI);

  const morphoSupplyOnPool_BI = morphoSupplyAndCollateralOnPool_BI.minus(morphoCollateralOnPool_BI);

  const morphoSupplyOnPool = morphoSupplyOnPool_BI
    .toBigDecimal()
    .div(exponentToBigDecimal(inputToken.decimals));

  const morphoCollateralOnPool = morphoSupplyOnPool_BI
    .toBigDecimal()
    .div(exponentToBigDecimal(inputToken.decimals));

  const morphoSupplyP2P_BI = market._p2pSupplyAmount
    .times(market._p2pSupplyIndex)
    .div(exponentToBigInt(market._indexesOffset));

  const morphoSupplyP2P = morphoSupplyP2P_BI
    .toBigDecimal()
    .div(exponentToBigDecimal(inputToken.decimals));

  const morphoBorrowOnPool_BI = debtToken.balanceOf(MORPHO_AAVE_V2_ADDRESS);

  const morphoBorrowOnPool = morphoBorrowOnPool_BI
    .toBigDecimal()
    .div(exponentToBigDecimal(inputToken.decimals));

  const morphoBorrowP2P_BI = market._p2pBorrowAmount
    .times(market._p2pBorrowIndex)
    .div(exponentToBigInt(market._indexesOffset));

  const morphoBorrowP2P = morphoBorrowP2P_BI
    .toBigDecimal()
    .div(exponentToBigDecimal(inputToken.decimals));

  return new MorphoPositions(
    morphoSupplyOnPool,
    morphoBorrowOnPool,
    morphoSupplyP2P,
    morphoBorrowP2P,
    morphoSupplyOnPool_BI,
    morphoBorrowOnPool_BI,
    morphoSupplyP2P_BI,
    morphoBorrowP2P_BI,
    morphoCollateralOnPool,
    morphoCollateralOnPool_BI
  );
};
