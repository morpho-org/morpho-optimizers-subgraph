import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

import { ERC20 } from "../../../generated/morpho-v1/MorphoAaveV2/ERC20";
import { AaveV3AddressesProvider } from "../../../generated/morpho-v1/MorphoAaveV3/AaveV3AddressesProvider";
import { AaveV3DataProvider } from "../../../generated/morpho-v1/MorphoAaveV3/AaveV3DataProvider";
import { AaveV3Pool } from "../../../generated/morpho-v1/MorphoAaveV3/AaveV3Pool";
import { AaveV3PriceOracle } from "../../../generated/morpho-v1/MorphoAaveV3/AaveV3PriceOracle";
import {
  MorphoAaveV3,
  Initialized,
  OwnershipTransferStarted,
  OwnershipTransferred,
  Supplied,
  CollateralSupplied,
  Borrowed,
  Repaid,
  Withdrawn,
  CollateralWithdrawn,
  Liquidated,
  ManagerApproval,
  SupplyPositionUpdated,
  BorrowPositionUpdated,
  P2PSupplyDeltaUpdated,
  P2PBorrowDeltaUpdated,
  P2PTotalsUpdated,
  RewardsClaimed,
  IsCollateralSet,
  IsClaimRewardsPausedSet,
  IsSupplyPausedSet,
  IsSupplyCollateralPausedSet,
  IsBorrowPausedSet,
  IsWithdrawPausedSet,
  IsWithdrawCollateralPausedSet,
  IsRepayPausedSet,
  IsLiquidateCollateralPausedSet,
  IsLiquidateBorrowPausedSet,
  IsP2PDisabledSet,
  IsDeprecatedSet,
  P2PDeltasIncreased,
  MarketCreated,
  DefaultIterationsSet,
  PositionsManagerSet,
  RewardsManagerSet,
  TreasuryVaultSet,
  ReserveFactorSet,
  P2PIndexCursorSet,
  IndexesUpdated,
  IdleSupplyUpdated,
  ReserveFeeClaimed,
  UserNonceIncremented,
} from "../../../generated/morpho-v1/MorphoAaveV3/MorphoAaveV3";
import { Market, UnderlyingTokenMapping } from "../../../generated/morpho-v1/schema";
import { AAVE_V3_ORACLE_OFFSET, BASE_UNITS, BIGDECIMAL_ONE, RAY_BI } from "../../constants";
import { updateP2PIndexesAndRates } from "../../helpers";
import {
  createOrInitIndexesAndRatesHistory,
  getMarket,
  getOrInitLendingProtocol,
  getOrInitMarketList,
  getOrInitToken,
} from "../../utils/initializers";
import { AaveMath } from "../../utils/maths/AaveMath";
import {
  _handleBorrowed,
  _handleBorrowerPositionUpdated,
  _handleLiquidated,
  _handleP2PIndexesUpdated,
  _handleRepaid,
  _handleSupplied,
  _handleSupplierPositionUpdated,
  _handleWithdrawn,
} from "../common";

export function handleInitialized(event: Initialized): void {
  const protocol = getOrInitLendingProtocol(event.address);
  protocol.save();
}

export function handleOwnershipTransferStarted(event: OwnershipTransferStarted): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  const protocol = getOrInitLendingProtocol(event.address);
  protocol.owner = event.params.newOwner;
}

export function handleSupplied(event: Supplied): void {
  _handleSupplied(
    event,
    event.params.underlying,
    event.params.onBehalf,
    event.params.amount,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    false
  );
}

export function handleCollateralSupplied(event: CollateralSupplied): void {
  _handleSupplied(
    event,
    event.params.underlying,
    event.params.onBehalf,
    event.params.amount,
    event.params.scaledBalance,
    BigInt.zero(),
    true
  );
}

export function handleBorrowed(event: Borrowed): void {
  _handleBorrowed(
    event,
    event.params.underlying,
    event.params.onBehalf,
    event.params.amount,
    event.params.scaledOnPool,
    event.params.scaledInP2P
  );
}

export function handleRepaid(event: Repaid): void {
  _handleRepaid(
    event,
    event.params.underlying,
    event.params.onBehalf,
    event.params.amount,
    event.params.scaledOnPool,
    event.params.scaledInP2P
  );
}

export function handleWithdrawn(event: Withdrawn): void {
  _handleWithdrawn(
    event,
    event.params.underlying,
    event.params.onBehalf,
    event.params.amount,
    event.params.scaledOnPool,
    event.params.scaledInP2P,
    false
  );
}

export function handleCollateralWithdrawn(event: CollateralWithdrawn): void {
  _handleWithdrawn(
    event,
    event.params.underlying,
    event.params.onBehalf,
    event.params.amount,
    event.params.scaledBalance,
    BigInt.zero(),
    true
  );
}

export function handleLiquidated(event: Liquidated): void {
  _handleLiquidated(
    event,
    event.params.underlyingCollateral,
    event.params.underlyingBorrowed,
    event.params.liquidator,
    event.params.borrower,
    event.params.amountSeized,
    event.params.amountLiquidated
  );
}

export function handleManagerApproval(event: ManagerApproval): void {}

export function handleSupplyPositionUpdated(event: SupplyPositionUpdated): void {
  _handleSupplierPositionUpdated(
    event,
    event.params.underlying,
    event.params.user,
    event.params.scaledOnPool,
    event.params.scaledInP2P
  );
}

export function handleBorrowPositionUpdated(event: BorrowPositionUpdated): void {
  _handleBorrowerPositionUpdated(
    event,
    event.params.underlying,
    event.params.user,
    event.params.scaledOnPool,
    event.params.scaledInP2P
  );
}

export function handleP2PSupplyDeltaUpdated(event: P2PSupplyDeltaUpdated): void {
  const market = getMarket(event.params.underlying);
  market._p2pSupplyDelta = event.params.scaledDelta;
  updateP2PIndexesAndRates(event, market, new AaveMath());
  market.save();
}

export function handleP2PBorrowDeltaUpdated(event: P2PBorrowDeltaUpdated): void {
  const market = getMarket(event.params.underlying);
  market._p2pBorrowDelta = event.params.scaledDelta;
  updateP2PIndexesAndRates(event, market, new AaveMath());
  market.save();
}

export function handleP2PTotalsUpdated(event: P2PTotalsUpdated): void {
  const market = getMarket(event.params.underlying);
  market._p2pSupplyAmount = event.params.scaledTotalSupplyP2P;
  market._p2pBorrowAmount = event.params.scaledTotalBorrowP2P;
  market.save();
}

export function handleRewardsClaimed(event: RewardsClaimed): void {}

export function handleIsCollateralSet(event: IsCollateralSet): void {
  const market = getMarket(event.params.underlying);
  market.canBorrowFrom = event.params.isCollateral;
}

export function handleIsClaimRewardsPausedSet(event: IsClaimRewardsPausedSet): void {}

export function handleIsSupplyPausedSet(event: IsSupplyPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isSupplyPaused = event.params.isPaused;
  market.save();
}

export function handleIsSupplyCollateralPausedSet(event: IsSupplyCollateralPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isSupplyCollateralPaused = event.params.isPaused;
  market.save();
}

export function handleIsBorrowPausedSet(event: IsBorrowPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isBorrowPaused = event.params.isPaused;
  market.save();
}

export function handleIsWithdrawPausedSet(event: IsWithdrawPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isWithdrawPaused = event.params.isPaused;
  market.save();
}

export function handleIsWithdrawCollateralPausedSet(event: IsWithdrawCollateralPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isWithdrawCollateralPaused = event.params.isPaused;
  market.save();
}

export function handleIsRepayPausedSet(event: IsRepayPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isRepayPaused = event.params.isPaused;
  market.save();
}

export function handleIsLiquidateCollateralPausedSet(event: IsLiquidateCollateralPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isLiquidateCollateralPaused = event.params.isPaused;
  market.save();
}

export function handleIsLiquidateBorrowPausedSet(event: IsLiquidateBorrowPausedSet): void {
  const market = getMarket(event.params.underlying);
  market.isLiquidateBorrowPaused = event.params.isPaused;
  market.save();
}

export function handleIsP2PDisabledSet(event: IsP2PDisabledSet): void {
  const market = getMarket(event.params.underlying);
  market.isP2PDisabled = event.params.isP2PDisabled;
  market.save();
}

export function handleIsDeprecatedSet(event: IsDeprecatedSet): void {
  const market = getMarket(event.params.underlying);
  market.isActive = !event.params.isDeprecated;
  market.canUseAsCollateral = market.canUseAsCollateral && !event.params.isDeprecated;

  market.save();
}

export function handleP2PDeltasIncreased(event: P2PDeltasIncreased): void {}

export function handleMarketCreated(event: MarketCreated): void {
  const protocol = getOrInitLendingProtocol(event.address);

  protocol.totalPoolCount = protocol.totalPoolCount + 1;
  protocol.save();

  const underlying = ERC20.bind(event.params.underlying);
  const market = new Market(event.params.underlying);
  const morpho = MorphoAaveV3.bind(event.address);

  const addressProvider = AaveV3AddressesProvider.bind(morpho.addressesProvider());
  const oracle = AaveV3PriceOracle.bind(addressProvider.getPriceOracle());

  const dataProvider = AaveV3DataProvider.bind(addressProvider.getPoolDataProvider());

  const reserveConfiguration = dataProvider.getReserveConfigurationData(underlying._address);
  market.protocol = event.address;
  market.name = `Morpho Aave V3 ${underlying.name()}`;
  market.isActive = true;
  market.canBorrowFrom = true;
  market.canUseAsCollateral = true;

  market.maximumLTV = reserveConfiguration.getLtv().toBigDecimal().div(BASE_UNITS);
  market.liquidationThreshold = reserveConfiguration
    .getLiquidationThreshold()
    .toBigDecimal()
    .div(BASE_UNITS);
  market.liquidationPenalty = reserveConfiguration
    .getLiquidationBonus()
    .toBigDecimal()
    .div(BASE_UNITS);

  // The liquidation bonus value is equal to the liquidation penalty, the naming is a matter of which side of the liquidation a user is on
  // The liquidationBonus parameter comes out as above 1
  // The LiquidationPenalty is thus the liquidationBonus minus 1
  if (market.liquidationPenalty.gt(BigDecimal.zero())) {
    market.liquidationPenalty = market.liquidationPenalty.minus(BIGDECIMAL_ONE);
  }

  market.canIsolate = false;
  market.createdTimestamp = event.block.timestamp;
  market.createdBlockNumber = event.block.number;

  const token = getOrInitToken(underlying._address);
  market.inputToken = token.id;
  market.borrowedToken = token.id;
  market.stableBorrowedTokenBalance = BigInt.zero(); // There is no stable borrow on Morpho
  market.variableBorrowedTokenBalance = BigInt.zero();

  // Query the underlyings in the underlying market
  const morphoMarket = morpho.market(event.params.underlying);

  // Add the underlying tokens mapping
  let underlyingMapping = UnderlyingTokenMapping.load(event.params.underlying);
  if (underlyingMapping == null) {
    underlyingMapping = new UnderlyingTokenMapping(event.params.underlying);
    underlyingMapping.aToken = Address.zero();
    underlyingMapping.debtToken = Address.zero();
  }

  underlyingMapping.variableDebtTokenV3 = morphoMarket.variableDebtToken;
  underlyingMapping.aTokenV3 = morphoMarket.aToken;
  underlyingMapping.save();

  market.inputTokenBalance = underlying.balanceOf(morphoMarket.aToken);

  const price = oracle.getAssetPrice(underlying._address).toBigDecimal().div(AAVE_V3_ORACLE_OFFSET);
  token.lastPriceUSD = price;
  token.lastPriceBlockNumber = event.block.number;
  token.save();

  market.inputTokenPriceUSD = price;

  market.totalValueLockedUSD = BigDecimal.zero();
  market.cumulativeSupplySideRevenueUSD = BigDecimal.zero();
  market.cumulativeProtocolSideRevenueUSD = BigDecimal.zero();
  market.cumulativeTotalRevenueUSD = BigDecimal.zero();
  market.totalDepositBalanceUSD = BigDecimal.zero();
  market.cumulativeDepositUSD = BigDecimal.zero();
  market.totalBorrowBalanceUSD = BigDecimal.zero();
  market.cumulativeBorrowUSD = BigDecimal.zero();
  market.cumulativeLiquidateUSD = BigDecimal.zero();
  market.cumulativeTransferUSD = BigDecimal.zero();
  market.cumulativeFlashloanUSD = BigDecimal.zero();
  market.transactionCount = 0 as i32;
  market.depositCount = 0 as i32;
  market.withdrawCount = 0 as i32;
  market.borrowCount = 0 as i32;
  market.repayCount = 0 as i32;
  market.liquidationCount = 0 as i32;
  market.transferCount = 0 as i32;
  market.flashloanCount = 0 as i32;
  market.cumulativeUniqueUsers = 0 as i32;
  market.cumulativeUniqueDepositors = 0 as i32;
  market.cumulativeUniqueBorrowers = 0 as i32;
  market.cumulativeUniqueLiquidators = 0 as i32;
  market.cumulativeUniqueLiquidatees = 0 as i32;
  market.cumulativeUniqueTransferrers = 0 as i32;
  market.cumulativeUniqueFlashloaners = 0 as i32;

  market.positionCount = 0 as i32;
  market.openPositionCount = 0 as i32;
  market.closedPositionCount = 0 as i32;
  market.lendingPositionCount = 0 as i32;
  market.borrowingPositionCount = 0 as i32;

  const aavev3Pool = AaveV3Pool.bind(morpho.pool());
  const poolReserveData = aavev3Pool.getReserveData(underlying._address);

  market._reserveSupplyIndex = poolReserveData.liquidityIndex;
  market._reserveBorrowIndex = poolReserveData.variableBorrowIndex;
  market._lastReserveUpdate = poolReserveData.lastUpdateTimestamp; // the current timestamp

  market._poolSupplyRate = poolReserveData.currentLiquidityRate;
  market._poolBorrowRate = poolReserveData.currentVariableBorrowRate;

  market._p2pSupplyIndex = RAY_BI;
  market._p2pBorrowIndex = RAY_BI;
  market._p2pSupplyIndexForRates = RAY_BI;
  market._p2pBorrowIndexForRates = RAY_BI;
  market._p2pSupplyRate = BigInt.zero();
  market._p2pBorrowRate = BigInt.zero();
  market._previousIndexesAndRatesHistory = null;
  market._lastIndexesAndRatesHistory = createOrInitIndexesAndRatesHistory(
    event.block.number,
    event.block.timestamp,
    market
  ).id;
  market._lastP2PIndexesUpdatedInvariant = null;

  market._lastPoolSupplyIndex = poolReserveData.liquidityIndex;
  market._lastPoolBorrowIndex = poolReserveData.variableBorrowIndex;
  market._lastPoolUpdate = poolReserveData.lastUpdateTimestamp; // the current timestamp

  market._scaledSupplyOnPool = BigInt.zero();
  market._scaledSupplyInP2P = BigInt.zero();
  market._scaledBorrowOnPool = BigInt.zero();
  market._scaledBorrowInP2P = BigInt.zero();
  market._virtualScaledSupply = BigInt.zero();
  market._virtualScaledBorrow = BigInt.zero();

  market._scaledPoolCollateral = BigInt.zero();

  market.isP2PDisabled = false;

  market.reserveFactor = BigDecimal.zero(); // Event is emitted right after the market creation
  market._reserveFactor_BI = BigInt.zero();
  market.p2pIndexCursor = BigDecimal.zero(); // Event is emitted right after the market creation
  market._p2pIndexCursor_BI = BigInt.zero();

  market.totalSupplyOnPool = BigDecimal.zero();
  market.totalCollateralOnPool = BigDecimal.zero();
  market.totalBorrowOnPool = BigDecimal.zero();
  market.totalSupplyInP2P = BigDecimal.zero();
  market.totalBorrowInP2P = BigDecimal.zero();

  market._p2pSupplyAmount = BigInt.zero();
  market._p2pBorrowAmount = BigInt.zero();

  market._p2pSupplyDelta = BigInt.zero();
  market._p2pBorrowDelta = BigInt.zero();

  market.poolSupplyAmount = BigInt.zero();
  market.poolBorrowAmount = BigInt.zero();

  market._idleSupply = BigInt.zero();

  market.isSupplyPaused = false;
  market.isBorrowPaused = false;
  market.isWithdrawPaused = false;
  market.isRepayPaused = false;
  market.isLiquidateBorrowPaused = false;
  market.isLiquidateCollateralPaused = false;

  market.poolSupplyInterests = BigDecimal.zero();
  market.poolBorrowInterests = BigDecimal.zero();
  market.p2pSupplyInterests = BigDecimal.zero();
  market.p2pBorrowInterests = BigDecimal.zero();
  market.p2pBorrowInterestsImprovement = BigDecimal.zero();
  market.p2pBorrowInterestsImprovementUSD = BigDecimal.zero();
  market.p2pSupplyInterestsImprovement = BigDecimal.zero();
  market.p2pSupplyInterestsImprovementUSD = BigDecimal.zero();
  market.poolSupplyInterestsUSD = BigDecimal.zero();
  market.poolBorrowInterestsUSD = BigDecimal.zero();
  market.p2pSupplyInterestsUSD = BigDecimal.zero();
  market.p2pBorrowInterestsUSD = BigDecimal.zero();
  market._indexesOffset = 27;
  market.rates = [];

  const poolCaps = dataProvider.getReserveCaps(underlying._address);
  market.supplyCap = poolCaps.getSupplyCap();
  market.borrowCap = poolCaps.getBorrowCap();
  market.save();

  const list = getOrInitMarketList(event.address);
  const markets = list.markets;
  list.markets = markets.concat([market.id]);

  list.save();
}

export function handleDefaultIterationsSet(event: DefaultIterationsSet): void {
  const protocol = getOrInitLendingProtocol(event.address);
  protocol.defaultMaxIterationsWithdraw = event.params.withdraw;
  protocol.defaultMaxIterationsRepay = event.params.repay;
  protocol.save();
}

export function handlePositionsManagerSet(event: PositionsManagerSet): void {}

export function handleRewardsManagerSet(event: RewardsManagerSet): void {}

export function handleTreasuryVaultSet(event: TreasuryVaultSet): void {}

export function handleReserveFactorSet(event: ReserveFactorSet): void {
  const market = getMarket(event.params.underlying);
  const reserveFactor = BigInt.fromI32(event.params.reserveFactor);
  market.reserveFactor = reserveFactor.toBigDecimal().div(BASE_UNITS);
  market._reserveFactor_BI = reserveFactor;
  updateP2PIndexesAndRates(event, market, new AaveMath());
  market.save();
}

export function handleP2PIndexCursorSet(event: P2PIndexCursorSet): void {
  const market = getMarket(event.params.underlying);
  const p2pIndexCursor = BigInt.fromI32(event.params.p2pIndexCursor);
  market.p2pIndexCursor = p2pIndexCursor.toBigDecimal().div(BASE_UNITS);
  market._p2pIndexCursor_BI = p2pIndexCursor;
  updateP2PIndexesAndRates(event, market, new AaveMath());
  market.save();
}

export function handleIndexesUpdated(event: IndexesUpdated): void {
  _handleP2PIndexesUpdated(
    event,
    event.params.underlying,
    event.params.poolSupplyIndex,
    event.params.p2pSupplyIndex,
    event.params.poolBorrowIndex,
    event.params.p2pBorrowIndex,
    new AaveMath()
  );
}

export function handleIdleSupplyUpdated(event: IdleSupplyUpdated): void {
  const market = getMarket(event.params.underlying);
  market._idleSupply = event.params.idleSupply;
  updateP2PIndexesAndRates(event, market, new AaveMath());
  market.save();
}

export function handleReserveFeeClaimed(event: ReserveFeeClaimed): void {}

export function handleUserNonceIncremented(event: UserNonceIncremented): void {}
