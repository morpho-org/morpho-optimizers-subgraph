import { Address, BigDecimal, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";

import { ERC20 } from "../../generated/morpho-v1/MorphoAaveV2/ERC20";
import { LendingPool } from "../../generated/morpho-v1/MorphoAaveV2/LendingPool";
import { LendingPoolAddressesProvider } from "../../generated/morpho-v1/MorphoAaveV2/LendingPoolAddressesProvider";
import { MorphoAaveV2 } from "../../generated/morpho-v1/MorphoAaveV2/MorphoAaveV2";
import { AaveV3AddressesProvider } from "../../generated/morpho-v1/MorphoAaveV3/AaveV3AddressesProvider";
import { MorphoAaveV3 } from "../../generated/morpho-v1/MorphoAaveV3/MorphoAaveV3";
import { Comptroller } from "../../generated/morpho-v1/MorphoCompound/Comptroller";
import { MorphoCompound } from "../../generated/morpho-v1/MorphoCompound/MorphoCompound";
import {
  Token,
  LendingProtocol,
  Market,
  _MarketList,
  _IndexesAndRatesHistory,
  _P2PIndexesUpdatedInvariant,
  EMode,
} from "../../generated/morpho-v1/schema";
import {
  AaveV3Pool as AaveV3PoolTemplate,
  AaveV3PoolConfigurator as AaveV3PoolConfiguratorTemplate,
  Comptroller as ComptrollerTemplate,
  LendingPool as LendingPoolTemplate,
} from "../../generated/morpho-v1/templates";
import { LendingPoolConfigurator as LendingPoolConfiguratorTemplate } from "../../generated/morpho-v1/templates";
import { AaveV3PoolConfigurator } from "../../generated/morpho-v1/templates/AaveV3PoolConfigurator/AaveV3PoolConfigurator";
import { pow10Decimal } from "../bn";
import {
  AAVE_CLOSE_FACTOR,
  DEFAULT_DECIMALS,
  MORPHO_AAVE_V2_ADDRESS,
  MORPHO_AAVE_V3_ADDRESS,
  MORPHO_COMPOUND_ADDRESS,
} from "../constants";

export function createOrInitIndexesAndRatesHistory(
  blockNumber: BigInt,
  timestamp: BigInt,
  market: Market
): _IndexesAndRatesHistory {
  const id = `${market.id.toHex()}-${blockNumber.toString()}`;
  let invariantIndexes = _IndexesAndRatesHistory.load(id);
  if (!invariantIndexes) invariantIndexes = new _IndexesAndRatesHistory(id);
  invariantIndexes.market = market.id;
  invariantIndexes.blockNumber = blockNumber;
  invariantIndexes.blockDiff = BigInt.zero();
  invariantIndexes.timestamp = timestamp;
  invariantIndexes.timestampDiff = BigInt.zero();

  invariantIndexes.newP2PSupplyIndex = market._p2pSupplyIndex;
  invariantIndexes.newP2PBorrowIndex = market._p2pBorrowIndex;
  invariantIndexes.newPoolSupplyIndex = market._reserveSupplyIndex;
  invariantIndexes.newPoolBorrowIndex = market._reserveBorrowIndex;

  invariantIndexes.lastP2PBorrowIndex = BigInt.zero();
  invariantIndexes.lastP2PSupplyIndex = BigInt.zero();
  invariantIndexes.lastPoolSupplyIndex = BigInt.zero();
  invariantIndexes.lastPoolBorrowIndex = BigInt.zero();

  invariantIndexes.newP2PBorrowRate = market._p2pBorrowRate;
  invariantIndexes.newP2PSupplyRate = market._p2pSupplyRate;
  invariantIndexes.newPoolSupplyRate = market._poolSupplyRate;
  invariantIndexes.newPoolBorrowRate = market._poolBorrowRate;

  invariantIndexes.save();
  return invariantIndexes;
}

export function initP2PIndexesUpdatedIndexInvariant(
  event: ethereum.Event,
  market: Market,
  p2pSupplyIndex: BigInt,
  p2pBorrowIndex: BigInt
): _P2PIndexesUpdatedInvariant | null {
  const lastInvariant = _IndexesAndRatesHistory.load(market._lastIndexesAndRatesHistory)!;
  if (!lastInvariant) return null;

  const id: string = `${market.id.toHex()}-${event.block.number.toString()}`;
  const invariant = new _P2PIndexesUpdatedInvariant(id);
  invariant.market = market.id;
  invariant.blockNumber = event.block.number;
  invariant.timestamp = event.block.timestamp;
  invariant.subgraphP2PBorrowIndex = lastInvariant.newP2PBorrowIndex;
  invariant.subgraphP2PSupplyIndex = lastInvariant.newP2PSupplyIndex;
  invariant.morphoP2PSupplyIndex = p2pSupplyIndex;
  invariant.morphoP2PBorrowIndex = p2pBorrowIndex;

  // Init everything 0 for first event to avoid runtime errors.
  invariant._morphoP2PSupplyInterests_BI = BigInt.zero();
  invariant._morphoP2PBorrowInterests_BI = BigInt.zero();
  invariant._subgraphP2PSupplyInterests_BI = BigInt.zero();
  invariant._subgraphP2PBorrowInterests_BI = BigInt.zero();
  invariant.morphoP2PSupplyInterests = BigDecimal.zero();
  invariant.morphoP2PBorrowInterests = BigDecimal.zero();
  invariant.subgraphP2PSupplyInterests = BigDecimal.zero();
  invariant.subgraphP2PBorrowInterests = BigDecimal.zero();
  invariant.supplyP2PDerivation = BigDecimal.zero();
  invariant.borrowP2PDerivation = BigDecimal.zero();
  invariant._supplyP2PDerivation_BI = BigInt.zero();
  invariant._borrowP2PDerivation_BI = BigInt.zero();
  return invariant;
}

export const getOrInitToken = (tokenAddress: Bytes): Token => {
  let token = Token.load(tokenAddress);
  if (!token) {
    token = new Token(tokenAddress);
    const erc20 = ERC20.bind(Address.fromBytes(tokenAddress));
    token.name = erc20.name();
    token.symbol = erc20.symbol();
    token.decimals = erc20.decimals();
    token.lastPriceUSD = BigDecimal.zero();
    token.save();
  }
  return token;
};

export const getOrInitLendingProtocol = (protocolAddress: Address): LendingProtocol => {
  let protocol = LendingProtocol.load(protocolAddress);
  if (!protocol) {
    protocol = new LendingProtocol(protocolAddress);

    if (protocolAddress.equals(MORPHO_AAVE_V2_ADDRESS)) {
      const morpho = MorphoAaveV2.bind(protocolAddress);
      const lendingPool = LendingPool.bind(morpho.pool());
      LendingPoolTemplate.create(lendingPool._address);
      const addressesProvider = LendingPoolAddressesProvider.bind(morpho.addressesProvider());
      LendingPoolConfiguratorTemplate.create(addressesProvider.getLendingPoolConfigurator());
      protocol.name = "Morpho Aave V2";
      protocol.slug = "morpho-aave-v2";
      protocol.schemaVersion = "0.0.5";
      protocol.subgraphVersion = "0.0.5";
      protocol.methodologyVersion = "0.0.5";
      const defaultMaxGas = morpho.defaultMaxGasForMatching();
      protocol.defaultMaxGasForMatchingSupply = defaultMaxGas.getSupply();
      protocol.defaultMaxGasForMatchingBorrow = defaultMaxGas.getBorrow();
      protocol.defaultMaxGasForMatchingWithdraw = defaultMaxGas.getWithdraw();
      protocol.defaultMaxGasForMatchingRepay = defaultMaxGas.getRepay();

      protocol.maxSortedUsers = morpho.maxSortedUsers();

      protocol.owner = morpho.owner();
      protocol.closeFactor = AAVE_CLOSE_FACTOR;
    } else if (protocolAddress.equals(MORPHO_COMPOUND_ADDRESS)) {
      const morpho = MorphoCompound.bind(protocolAddress);
      const comptroller = Comptroller.bind(morpho.comptroller());
      ComptrollerTemplate.create(comptroller._address);

      protocol.name = "Morpho Compound";
      protocol.slug = "morpho-compound";
      protocol.schemaVersion = "0.0.5";
      protocol.subgraphVersion = "0.0.5";
      protocol.methodologyVersion = "0.0.5";
      const defaultMaxGas = morpho.defaultMaxGasForMatching();
      protocol.defaultMaxGasForMatchingSupply = defaultMaxGas.getSupply();
      protocol.defaultMaxGasForMatchingBorrow = defaultMaxGas.getBorrow();
      protocol.defaultMaxGasForMatchingWithdraw = defaultMaxGas.getWithdraw();
      protocol.defaultMaxGasForMatchingRepay = defaultMaxGas.getRepay();

      protocol.maxSortedUsers = morpho.maxSortedUsers();

      protocol.owner = morpho.owner();
      protocol.closeFactor = comptroller
        .closeFactorMantissa()
        .toBigDecimal()
        .div(pow10Decimal(DEFAULT_DECIMALS));
    } else if (protocolAddress.equals(MORPHO_AAVE_V3_ADDRESS)) {
      const morpho = MorphoAaveV3.bind(protocolAddress);

      AaveV3PoolTemplate.create(morpho.pool());
      const addressesProvider = AaveV3AddressesProvider.bind(morpho.addressesProvider());
      AaveV3PoolConfiguratorTemplate.create(addressesProvider.getPoolConfigurator());

      protocol.name = "Morpho Aave v3";
      protocol.slug = "morpho-aave-v3";
      protocol.schemaVersion = "0.0.5";
      protocol.subgraphVersion = "1.0.0";
      protocol.methodologyVersion = "1.0.0";
      const defaultIterations = morpho.defaultIterations();

      protocol.defaultMaxIterationsRepay = defaultIterations.repay;
      protocol.defaultMaxIterationsWithdraw = defaultIterations.withdraw;

      protocol.owner = morpho.owner();
      protocol.closeFactor = AAVE_CLOSE_FACTOR;
    } else {
      log.critical("Unknown protocol address: {}", [protocolAddress.toHexString()]);
      return new LendingProtocol(Bytes.fromHexString("0x0"));
    }
    protocol.protocol = "Morpho";
    protocol.network = "MAINNET";
    protocol.type = "LENDING";
    protocol.lendingType = "CDP";
    protocol.cumulativeUniqueUsers = 0 as i32;
    protocol.cumulativeUniqueDepositors = 0 as i32;
    protocol.cumulativeUniqueBorrowers = 0 as i32;
    protocol.cumulativeUniqueLiquidators = 0 as i32;
    protocol.cumulativeUniqueLiquidatees = 0 as i32;

    protocol.totalValueLockedUSD = BigDecimal.zero();

    protocol.cumulativeSupplySideRevenueUSD = BigDecimal.zero();
    protocol.cumulativeProtocolSideRevenueUSD = BigDecimal.zero();
    protocol.cumulativeTotalRevenueUSD = BigDecimal.zero();

    protocol.totalDepositBalanceUSD = BigDecimal.zero();
    protocol.cumulativeDepositUSD = BigDecimal.zero();
    protocol.totalBorrowBalanceUSD = BigDecimal.zero();
    protocol.cumulativeBorrowUSD = BigDecimal.zero();
    protocol.cumulativeLiquidateUSD = BigDecimal.zero();

    protocol.totalPoolCount = 0 as i32;
    protocol.openPositionCount = 0 as i32;
    protocol.cumulativePositionCount = 0 as i32;
    protocol.transactionCount = 0 as i32;
    protocol.depositCount = 0 as i32;
    protocol.withdrawCount = 0 as i32;
    protocol.borrowCount = 0 as i32;
    protocol.repayCount = 0 as i32;
    protocol.liquidationCount = 0 as i32;

    // There is no transfer or flashloan event in Morpho.
    protocol.transferCount = 0 as i32;
    protocol.flashloanCount = 0 as i32;

    // Morpho specific

    protocol.save();
  }
  return protocol;
};

export const getOrInitMarketList = (protocolAddress: Address): _MarketList => {
  let protocol = _MarketList.load(protocolAddress);
  if (!protocol) {
    protocol = new _MarketList(protocolAddress);
    protocol.markets = [];
    protocol.save();
  }
  return protocol;
};

// ###############################
// ##### Market-Level Metadata #####
// ###############################

export const getMarket = (marketAddress: Bytes): Market => {
  const market = Market.load(marketAddress);
  if (!market) {
    // The event "MarketCreated" creates directly the market entity
    log.critical("Market not found: {}", [marketAddress.toHexString()]);
    return new Market(marketAddress);
  }
  return market;
};
