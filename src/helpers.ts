import { BigDecimal, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";

import {
  Account,
  FinancialsDailySnapshot,
  InterestRate,
  LendingProtocol,
  Market,
  MarketDailySnapshot,
  MarketHourlySnapshot,
  UsageMetricsDailySnapshot,
  UsageMetricsHourlySnapshot,
  Position,
  PositionSnapshot,
  _ActiveAccount,
  _PositionCounter,
  _IndexesAndRatesHistory,
  _MarketList,
} from "../generated/morpho-v1/schema";

import { pow10, pow10Decimal } from "./bn";
import {
  INT_ZERO,
  ActivityType,
  EventType,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  PositionSide,
  RAY_BI,
  InterestRateSide,
  InterestRateType,
  BIGDECIMAL_HUNDRED,
} from "./constants";
import {
  computeGrowthFactors,
  computeP2PBorrowRate,
  computeP2PIndex,
  computeP2PSupplyRate,
  computeIndexLinearInterests,
  computeIndexCompoundedInterests,
  computeProportionIdle,
  computeProportionDelta,
} from "./utils/common/InterestRatesModel";
import { getMarket, getOrInitToken } from "./utils/initializers";
import { IMaths } from "./utils/maths/maths.interface";

function getDay(timestamp: BigInt): BigInt {
  return timestamp.div(BigInt.fromI32(SECONDS_PER_DAY));
}
function getDayId(timestamp: BigInt): Bytes {
  return Bytes.fromI32(getDay(timestamp).toI32());
}
function getHour(timestamp: BigInt): BigInt {
  return timestamp.div(BigInt.fromI32(SECONDS_PER_HOUR));
}
function getHourId(timestamp: BigInt): Bytes {
  return Bytes.fromI32(getHour(timestamp).toI32());
}

////////////////////////////
///// Helper Functions /////
////////////////////////////

export function createInterestRate(
  marketAddress: Bytes,
  rateSide: string,
  rateType: string,
  rate: BigDecimal
): InterestRate {
  const id: string = `${rateSide}-${rateType}-${marketAddress.toHexString()}`;
  const interestRate = new InterestRate(id);

  interestRate.rate = rate;
  interestRate.side = rateSide;
  interestRate.type = rateType;

  interestRate.save();

  return interestRate;
}

export function createIndexesUpdated(
  blockNumber: BigInt,
  timestamp: BigInt,
  market: Market,
  __MATHS__: IMaths
): _IndexesAndRatesHistory[] {
  const id: string = `${market.id.toHex()}-${blockNumber.toString()}`;
  let indexesUpdated = _IndexesAndRatesHistory.load(id);
  const lastInvariant = _IndexesAndRatesHistory.load(
    indexesUpdated ? market._previousIndexesAndRatesHistory! : market._lastIndexesAndRatesHistory
  );
  if (!indexesUpdated) indexesUpdated = new _IndexesAndRatesHistory(id);
  if (!lastInvariant) log.critical("No last invariant", []);

  const lastP2PSupplyIndex = lastInvariant!.newP2PSupplyIndex;
  const lastP2PBorrowIndex = lastInvariant!.newP2PBorrowIndex;
  const lastPoolSupplyIndex = market._reserveSupplyIndex;
  const lastPoolBorrowIndex = market._reserveBorrowIndex;

  const timestampDiff = timestamp.minus(lastInvariant!.timestamp);
  const blockDiff = blockNumber.minus(lastInvariant!.blockNumber);
  const proportionIdle = computeProportionIdle(
    market._indexesOffset,
    market._idleSupply,
    market._p2pSupplyAmount,
    lastP2PSupplyIndex
  );
  const supplyProportionDelta = computeProportionDelta(
    market._p2pSupplyDelta,
    market._p2pSupplyAmount,
    lastPoolSupplyIndex,
    lastP2PSupplyIndex,
    proportionIdle,
    __MATHS__
  );
  const borrowProportionDelta = computeProportionDelta(
    market._p2pSupplyDelta,
    market._p2pSupplyAmount,
    lastPoolSupplyIndex,
    lastP2PSupplyIndex,
    proportionIdle,
    __MATHS__
  );

  const newP2PSupplyRate = computeP2PSupplyRate(
    market._poolBorrowRate,
    market._poolSupplyRate,
    market._p2pIndexCursor_BI,
    market._reserveFactor_BI,
    supplyProportionDelta,
    proportionIdle,
    __MATHS__
  );

  const newP2PBorrowRate = computeP2PBorrowRate(
    market._poolBorrowRate,
    market._poolSupplyRate,
    market._p2pIndexCursor_BI,
    market._reserveFactor_BI,
    borrowProportionDelta,
    proportionIdle,
    __MATHS__
  );

  indexesUpdated.market = market.id;
  indexesUpdated.blockNumber = blockNumber;
  indexesUpdated.blockDiff = blockDiff;
  indexesUpdated.timestamp = timestamp;
  indexesUpdated.timestampDiff = timestampDiff;

  indexesUpdated.lastP2PSupplyIndex = lastP2PSupplyIndex;
  indexesUpdated.lastP2PBorrowIndex = lastP2PBorrowIndex;
  indexesUpdated.lastPoolSupplyIndex = lastPoolSupplyIndex;
  indexesUpdated.lastPoolBorrowIndex = lastPoolBorrowIndex;

  indexesUpdated.newP2PSupplyRate = newP2PSupplyRate;
  indexesUpdated.newP2PBorrowRate = newP2PBorrowRate;
  indexesUpdated.newPoolSupplyRate = market._poolSupplyRate;
  indexesUpdated.newPoolBorrowRate = market._poolBorrowRate;

  indexesUpdated.newP2PSupplyIndex = computeIndexLinearInterests(
    lastP2PSupplyIndex,
    newP2PSupplyRate,
    timestampDiff,
    __MATHS__
  );
  indexesUpdated.newP2PBorrowIndex = computeIndexCompoundedInterests(
    lastP2PBorrowIndex,
    newP2PBorrowRate,
    timestampDiff,
    __MATHS__
  );
  indexesUpdated.newPoolSupplyIndex = market._reserveSupplyIndex;
  indexesUpdated.newPoolBorrowIndex = market._reserveBorrowIndex;

  indexesUpdated.save();
  return [lastInvariant!, indexesUpdated];
}

export function updateMarketSnapshots(
  blockNumber: BigInt,
  timestamp: BigInt,
  market: Market,
  newTotalRevenue: BigDecimal,
  newSupplyRevenue: BigDecimal,
  newProtocolRevenue: BigDecimal
): void {
  // get and update market daily snapshot
  const marketDailySnapshot = getOrCreateMarketDailySnapshot(market, timestamp, blockNumber);
  marketDailySnapshot.rates = getSnapshotRates(
    market.rates,
    (timestamp.toI32() / SECONDS_PER_DAY).toString()
  );

  // update daily revenues
  marketDailySnapshot.dailySupplySideRevenueUSD =
    marketDailySnapshot.dailySupplySideRevenueUSD.plus(newSupplyRevenue);
  marketDailySnapshot.dailyProtocolSideRevenueUSD =
    marketDailySnapshot.dailyProtocolSideRevenueUSD.plus(newProtocolRevenue);
  marketDailySnapshot.dailyTotalRevenueUSD =
    marketDailySnapshot.dailyTotalRevenueUSD.plus(newTotalRevenue);
  marketDailySnapshot.save();

  // get and update market daily snapshot
  const marketHourlySnapshot = getOrCreateMarketHourlySnapshot(market, timestamp, blockNumber);

  // update hourly revenues
  marketHourlySnapshot.hourlySupplySideRevenueUSD =
    marketHourlySnapshot.hourlySupplySideRevenueUSD.plus(newSupplyRevenue);
  marketHourlySnapshot.hourlyProtocolSideRevenueUSD =
    marketHourlySnapshot.hourlyProtocolSideRevenueUSD.plus(newProtocolRevenue);
  marketHourlySnapshot.hourlyTotalRevenueUSD =
    marketHourlySnapshot.hourlyTotalRevenueUSD.plus(newTotalRevenue);
  marketHourlySnapshot.save();
}

export function updateFinancials(
  event: ethereum.Event,
  protocol: LendingProtocol,
  newTotalRevenue: BigDecimal,
  newProtocolRevenue: BigDecimal,
  newSupplyRevenue: BigDecimal
): void {
  const snapshotId = getDayId(event.block.timestamp);
  let snapshot = FinancialsDailySnapshot.load(snapshotId);

  // create new snapshot if needed
  if (!snapshot) {
    snapshot = new FinancialsDailySnapshot(snapshotId);
    snapshot.protocol = protocol.id;
    snapshot.days = getDay(event.block.timestamp).toI32();
    snapshot.dailyDepositUSD = BigDecimal.zero();
    snapshot.dailyBorrowUSD = BigDecimal.zero();
    snapshot.dailyLiquidateUSD = BigDecimal.zero();
    snapshot.dailyWithdrawUSD = BigDecimal.zero();
    snapshot.dailyRepayUSD = BigDecimal.zero();
    snapshot.dailySupplySideRevenueUSD = BigDecimal.zero();
    snapshot.dailyProtocolSideRevenueUSD = BigDecimal.zero();
    snapshot.dailyTotalRevenueUSD = BigDecimal.zero();
    snapshot.dailyTransferUSD = BigDecimal.zero();
    snapshot.dailyFlashloanUSD = BigDecimal.zero();
  }

  // update snapshot fields
  snapshot.blockNumber = event.block.number;
  snapshot.timestamp = event.block.timestamp;
  snapshot.totalValueLockedUSD = protocol.totalValueLockedUSD;
  snapshot.dailySupplySideRevenueUSD = snapshot.dailySupplySideRevenueUSD.plus(newSupplyRevenue);
  snapshot.cumulativeSupplySideRevenueUSD = protocol.cumulativeSupplySideRevenueUSD;
  snapshot.dailyProtocolSideRevenueUSD =
    snapshot.dailyProtocolSideRevenueUSD.plus(newProtocolRevenue);
  snapshot.cumulativeProtocolSideRevenueUSD = protocol.cumulativeProtocolSideRevenueUSD;
  snapshot.dailyTotalRevenueUSD = snapshot.dailyTotalRevenueUSD.plus(newTotalRevenue);
  snapshot.cumulativeTotalRevenueUSD = protocol.cumulativeTotalRevenueUSD;
  snapshot.totalDepositBalanceUSD = protocol.totalDepositBalanceUSD;
  snapshot.cumulativeDepositUSD = protocol.cumulativeDepositUSD;
  snapshot.totalBorrowBalanceUSD = protocol.totalBorrowBalanceUSD;
  snapshot.cumulativeBorrowUSD = protocol.cumulativeBorrowUSD;
  snapshot.cumulativeLiquidateUSD = protocol.cumulativeLiquidateUSD;
  snapshot.save();
}

export function snapshotUsage(
  protocol: LendingProtocol,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  accountID: string,
  eventType: i32,
  isNewTx: boolean // used for liquidations to track daily liquidat-ors/-ees
): void {
  //
  // daily snapshot
  //
  const dailySnapshotID = getDayId(blockTimestamp);
  let dailySnapshot = UsageMetricsDailySnapshot.load(dailySnapshotID);
  if (!dailySnapshot) {
    dailySnapshot = new UsageMetricsDailySnapshot(dailySnapshotID);
    dailySnapshot.protocol = protocol.id;
    dailySnapshot.days = getDay(blockTimestamp).toI32();
    dailySnapshot.dailyActiveUsers = INT_ZERO;
    dailySnapshot.dailyTransactionCount = INT_ZERO;
    dailySnapshot.dailyDepositCount = INT_ZERO;
    dailySnapshot.dailyWithdrawCount = INT_ZERO;
    dailySnapshot.dailyBorrowCount = INT_ZERO;
    dailySnapshot.dailyRepayCount = INT_ZERO;
    dailySnapshot.dailyLiquidateCount = INT_ZERO;
    dailySnapshot.dailyActiveDepositors = INT_ZERO;
    dailySnapshot.dailyActiveBorrowers = INT_ZERO;
    dailySnapshot.dailyActiveLiquidators = INT_ZERO;
    dailySnapshot.dailyActiveLiquidatees = INT_ZERO;
    dailySnapshot.dailyActivePositions = INT_ZERO;
    dailySnapshot.openPositionCount = INT_ZERO;
    dailySnapshot.dailyTransferCount = INT_ZERO;
    dailySnapshot.dailyFlashloanCount = INT_ZERO;
  }

  //
  // Active users
  //
  const dailyAccountID = ActivityType.DAILY.concat("-")
    .concat(accountID)
    .concat("-")
    .concat(dailySnapshotID.toHexString());
  let dailyActiveAccount = _ActiveAccount.load(dailyAccountID);
  if (!dailyActiveAccount) {
    dailyActiveAccount = new _ActiveAccount(dailyAccountID);
    dailyActiveAccount.save();

    dailySnapshot.dailyActiveUsers += 1;
  }

  // update daily active positions
  let positionSide: string | null = null;
  if (eventType === EventType.DEPOSIT || eventType === EventType.WITHDRAW)
    positionSide = PositionSide.LENDER;
  else if (
    eventType === EventType.BORROW ||
    eventType === EventType.REPAY ||
    eventType === EventType.LIQUIDATEE
  )
    positionSide = PositionSide.BORROWER;
  if (positionSide) {
    const dailyPositionID = ActivityType.DAILY.concat("-")
      .concat(accountID)
      .concat("-")
      .concat(positionSide)
      .concat("-")
      .concat(dailySnapshotID.toHexString());
    let dailyActivePosition = _ActiveAccount.load(dailyPositionID);
    if (!dailyActivePosition) {
      dailyActivePosition = new _ActiveAccount(dailyPositionID);
      dailyActivePosition.save();

      dailySnapshot.dailyActivePositions += 1;
    }
  }

  //
  // Track users per event
  //
  const dailyActorAccountID = ActivityType.DAILY.concat("-")
    .concat(eventType.toString())
    .concat("-")
    .concat(accountID)
    .concat("-")
    .concat(dailySnapshotID.toHexString());
  let dailyActiveActorAccount = _ActiveAccount.load(dailyActorAccountID);
  const isNewActor = dailyActiveActorAccount == null;
  if (isNewActor) {
    dailyActiveActorAccount = new _ActiveAccount(dailyActorAccountID);
    dailyActiveActorAccount.save();
  }

  dailySnapshot.cumulativeUniqueUsers = protocol.cumulativeUniqueUsers;
  dailySnapshot.totalPoolCount = protocol.totalPoolCount;
  dailySnapshot.openPositionCount = protocol.openPositionCount;
  dailySnapshot.cumulativeUniqueDepositors = protocol.cumulativeUniqueDepositors;
  dailySnapshot.cumulativeUniqueBorrowers = protocol.cumulativeUniqueBorrowers;
  dailySnapshot.cumulativeUniqueLiquidators = protocol.cumulativeUniqueLiquidators;
  dailySnapshot.cumulativePositionCount = protocol.cumulativePositionCount;
  dailySnapshot.cumulativeUniqueLiquidatees = protocol.cumulativeUniqueLiquidatees;
  if (isNewTx) {
    dailySnapshot.dailyTransactionCount += 1;
  }

  switch (eventType) {
    case EventType.DEPOSIT:
    case EventType.DEPOSIT_COLLATERAL:
      dailySnapshot.dailyDepositCount += 1;
      if (isNewActor) {
        dailySnapshot.dailyActiveDepositors += 1;
      }
      break;
    case EventType.WITHDRAW:
    case EventType.WITHDRAW_COLLATERAL:
      dailySnapshot.dailyWithdrawCount += 1;
      break;
    case EventType.BORROW:
      dailySnapshot.dailyBorrowCount += 1;
      if (isNewActor) {
        dailySnapshot.dailyActiveBorrowers += 1;
      }
      break;
    case EventType.REPAY:
      dailySnapshot.dailyRepayCount += 1;
      break;
    case EventType.LIQUIDATOR:
      dailySnapshot.dailyLiquidateCount += 1;
      if (isNewActor) {
        dailySnapshot.dailyActiveLiquidators += 1;
      }
      break;
    case EventType.LIQUIDATEE:
      if (isNewActor) {
        dailySnapshot.dailyActiveLiquidatees += 1;
      }
    default:
      break;
  }
  dailySnapshot.totalPoolCount = protocol.totalPoolCount;
  dailySnapshot.blockNumber = blockNumber;
  dailySnapshot.timestamp = blockTimestamp;
  dailySnapshot.save();

  //
  // hourly snapshot
  //
  const hourlySnapshotID = getHourId(blockTimestamp);

  let hourlySnapshot = UsageMetricsHourlySnapshot.load(hourlySnapshotID);
  if (!hourlySnapshot) {
    hourlySnapshot = new UsageMetricsHourlySnapshot(hourlySnapshotID);
    hourlySnapshot.protocol = protocol.id;
    hourlySnapshot.hours = getHour(blockTimestamp).toI32();
    hourlySnapshot.hourlyActiveUsers = INT_ZERO;
    hourlySnapshot.cumulativeUniqueUsers = INT_ZERO;
    hourlySnapshot.hourlyTransactionCount = INT_ZERO;
    hourlySnapshot.hourlyDepositCount = INT_ZERO;
    hourlySnapshot.hourlyWithdrawCount = INT_ZERO;
    hourlySnapshot.hourlyBorrowCount = INT_ZERO;
    hourlySnapshot.hourlyRepayCount = INT_ZERO;
    hourlySnapshot.hourlyLiquidateCount = INT_ZERO;
    hourlySnapshot.blockNumber = blockNumber;
    hourlySnapshot.timestamp = blockTimestamp;
  }
  const hourlyAccountID = ActivityType.HOURLY.concat("-")
    .concat(accountID)
    .concat("-")
    .concat(hourlySnapshotID.toHexString());
  let hourlyActiveAccount = _ActiveAccount.load(hourlyAccountID);
  if (!hourlyActiveAccount) {
    hourlyActiveAccount = new _ActiveAccount(hourlyAccountID);
    hourlyActiveAccount.save();

    hourlySnapshot.hourlyActiveUsers += 1;
  }
  hourlySnapshot.cumulativeUniqueUsers = protocol.cumulativeUniqueUsers;
  if (isNewTx) {
    hourlySnapshot.hourlyTransactionCount += 1;
  }

  switch (eventType) {
    case EventType.DEPOSIT:
    case EventType.DEPOSIT_COLLATERAL:
      hourlySnapshot.hourlyDepositCount += 1;
      break;
    case EventType.WITHDRAW:
    case EventType.WITHDRAW_COLLATERAL:
      hourlySnapshot.hourlyWithdrawCount += 1;
      break;
    case EventType.BORROW:
      hourlySnapshot.hourlyBorrowCount += 1;
      break;
    case EventType.REPAY:
      hourlySnapshot.hourlyRepayCount += 1;
      break;
    case EventType.LIQUIDATOR:
      hourlySnapshot.hourlyLiquidateCount += 1;
      break;
    default:
      break;
  }
  hourlySnapshot.blockNumber = blockNumber;
  hourlySnapshot.timestamp = blockTimestamp;
  hourlySnapshot.save();
}

export function updateSnapshots(
  protocol: LendingProtocol,
  market: Market,
  amountUSD: BigDecimal,
  amountNative: BigInt,
  eventType: i32,
  blockTimestamp: BigInt,
  blockNumber: BigInt
): void {
  const marketHourlySnapshot = getOrCreateMarketHourlySnapshot(market, blockTimestamp, blockNumber);
  const marketDailySnapshot = getOrCreateMarketDailySnapshot(market, blockTimestamp, blockNumber);
  const financialSnapshot = FinancialsDailySnapshot.load(getDayId(blockTimestamp));
  if (!financialSnapshot) {
    // should NOT happen
    log.warning("[updateSnapshots] financialSnapshot not found", []);
    return;
  }

  switch (eventType) {
    case EventType.DEPOSIT:
    case EventType.DEPOSIT_COLLATERAL:
      marketHourlySnapshot.hourlyDepositUSD = marketHourlySnapshot.hourlyDepositUSD.plus(amountUSD);
      marketDailySnapshot.dailyDepositUSD = marketDailySnapshot.dailyDepositUSD.plus(amountUSD);
      financialSnapshot.dailyDepositUSD = financialSnapshot.dailyDepositUSD.plus(amountUSD);
      financialSnapshot.cumulativeDepositUSD = protocol.cumulativeDepositUSD;
      marketDailySnapshot.cumulativeDepositUSD = market.cumulativeDepositUSD;
      marketHourlySnapshot.cumulativeDepositUSD = market.cumulativeDepositUSD;
      marketDailySnapshot.dailyNativeDeposit =
        marketDailySnapshot.dailyNativeDeposit.plus(amountNative);

      break;
    case EventType.BORROW:
      marketHourlySnapshot.hourlyBorrowUSD = marketHourlySnapshot.hourlyBorrowUSD.plus(amountUSD);
      marketDailySnapshot.dailyBorrowUSD = marketDailySnapshot.dailyBorrowUSD.plus(amountUSD);
      financialSnapshot.dailyBorrowUSD = financialSnapshot.dailyBorrowUSD.plus(amountUSD);
      financialSnapshot.cumulativeBorrowUSD = protocol.cumulativeBorrowUSD;
      marketDailySnapshot.cumulativeBorrowUSD = market.cumulativeBorrowUSD;
      marketHourlySnapshot.cumulativeBorrowUSD = market.cumulativeBorrowUSD;
      marketDailySnapshot.dailyNativeBorrow =
        marketDailySnapshot.dailyNativeBorrow.plus(amountNative);
      break;
    case EventType.LIQUIDATOR:
      marketHourlySnapshot.hourlyLiquidateUSD =
        marketHourlySnapshot.hourlyLiquidateUSD.plus(amountUSD);
      marketDailySnapshot.dailyLiquidateUSD = marketDailySnapshot.dailyLiquidateUSD.plus(amountUSD);
      financialSnapshot.dailyLiquidateUSD = financialSnapshot.dailyLiquidateUSD.plus(amountUSD);
      financialSnapshot.cumulativeLiquidateUSD = protocol.cumulativeLiquidateUSD;
      marketDailySnapshot.cumulativeLiquidateUSD = market.cumulativeLiquidateUSD;
      marketHourlySnapshot.cumulativeLiquidateUSD = market.cumulativeLiquidateUSD;
      marketDailySnapshot.dailyNativeLiquidate =
        marketDailySnapshot.dailyNativeLiquidate.plus(amountNative);
      break;
    case EventType.WITHDRAW:
    case EventType.WITHDRAW_COLLATERAL:
      marketHourlySnapshot.hourlyWithdrawUSD =
        marketHourlySnapshot.hourlyWithdrawUSD.plus(amountUSD);
      marketDailySnapshot.dailyWithdrawUSD = marketDailySnapshot.dailyWithdrawUSD.plus(amountUSD);
      financialSnapshot.dailyWithdrawUSD = financialSnapshot.dailyWithdrawUSD.plus(amountUSD);
      marketDailySnapshot.dailyNativeWithdraw =
        marketDailySnapshot.dailyNativeWithdraw.plus(amountNative);
      break;
    case EventType.REPAY:
      marketHourlySnapshot.hourlyRepayUSD = marketHourlySnapshot.hourlyRepayUSD.plus(amountUSD);
      marketDailySnapshot.dailyRepayUSD = marketDailySnapshot.dailyRepayUSD.plus(amountUSD);
      financialSnapshot.dailyRepayUSD = financialSnapshot.dailyRepayUSD.plus(amountUSD);
      marketDailySnapshot.dailyNativeRepay =
        marketDailySnapshot.dailyNativeRepay.plus(amountNative);
      break;
    default:
      break;
  }

  marketDailySnapshot.save();
  marketHourlySnapshot.save();
  financialSnapshot.save();
}

// This function does the following in this order:
// 1- create a position if needed
// 2- update the positions data
// 3- create a snapshot of the position
export function addPosition(
  protocol: LendingProtocol,
  market: Market,
  account: Account,
  side: string,
  eventType: i32,
  event: ethereum.Event
): Position {
  let counterID = account.id
    .toHexString()
    .concat("-")
    .concat(market.id.toHexString())
    .concat("-")
    .concat(side);
  if (side == PositionSide.LENDER && eventType == EventType.DEPOSIT_COLLATERAL)
    counterID += "-collateral";
  let positionCounter = _PositionCounter.load(counterID);
  if (!positionCounter) {
    positionCounter = new _PositionCounter(counterID);
    positionCounter.lastTimestamp = event.block.timestamp;
    positionCounter.nextCount = 0;
    positionCounter.save();
  }
  const positionID = positionCounter.id.concat("-").concat(positionCounter.nextCount.toString());
  let position = Position.load(positionID);
  const openPosition = position == null;
  if (openPosition) {
    position = new Position(positionID);
    position.account = account.id;
    position.market = market.id;
    position.asset = market.inputToken;
    position.hashOpened = event.transaction.hash;
    position.blockNumberOpened = event.block.number;
    position.timestampOpened = event.block.timestamp;
    position.side = side;
    if (side == PositionSide.LENDER && eventType == EventType.DEPOSIT_COLLATERAL)
      position.isCollateral = true;

    position.balanceOnPool = BigInt.zero();
    position.balanceInP2P = BigInt.zero();
    position._virtualP2P = BigInt.zero();

    position.balance = BigInt.zero();
    position.depositCount = 0;
    position.withdrawCount = 0;
    position.borrowCount = 0;
    position.repayCount = 0;
    position.liquidationCount = 0;
    position.transferredCount = 0;
    position.receivedCount = 0;
    position.save();
  }
  position = position!;
  if (eventType == EventType.DEPOSIT || eventType == EventType.DEPOSIT_COLLATERAL) {
    position.depositCount += 1;
  } else if (eventType == EventType.BORROW) {
    position.borrowCount += 1;
  }
  position.save();

  if (openPosition) {
    //
    // update account position
    //
    account.positionCount += 1;
    account.openPositionCount += 1;
    account.save();

    //
    // update market position
    //
    market.positionCount += 1;
    market.openPositionCount += 1;

    if (eventType == EventType.DEPOSIT || eventType == EventType.DEPOSIT_COLLATERAL) {
      market.lendingPositionCount += 1;
    } else if (eventType == EventType.BORROW) {
      market.borrowingPositionCount += 1;
    }
    market.save();

    //
    // update protocol position
    //
    protocol.cumulativePositionCount += 1;
    protocol.openPositionCount += 1;
    if (eventType == EventType.DEPOSIT || eventType == EventType.DEPOSIT_COLLATERAL) {
      const depositorActorID = "depositor".concat("-").concat(account.id.toHexString());
      let depositorActor = _ActiveAccount.load(depositorActorID);
      if (!depositorActor) {
        depositorActor = new _ActiveAccount(depositorActorID);
        depositorActor.save();

        protocol.cumulativeUniqueDepositors += 1;
      }
    } else if (eventType == EventType.BORROW) {
      const borrowerActorID = "borrower".concat("-").concat(account.id.toHexString());
      let borrowerActor = _ActiveAccount.load(borrowerActorID);
      if (!borrowerActor) {
        borrowerActor = new _ActiveAccount(borrowerActorID);
        borrowerActor.save();

        protocol.cumulativeUniqueBorrowers += 1;
      }
    }
    protocol.save();
  }

  //
  // take position snapshot
  //
  snapshotPosition(position, event);

  return position;
}

export function subtractPosition(
  protocol: LendingProtocol,
  market: Market,
  account: Account,
  balance: BigInt,
  side: string,
  eventType: i32,
  event: ethereum.Event
): Position | null {
  let counterID = account.id
    .toHexString()
    .concat("-")
    .concat(market.id.toHexString())
    .concat("-")
    .concat(side);

  if (side == PositionSide.LENDER && eventType == EventType.WITHDRAW_COLLATERAL)
    counterID += "-collateral";
  const positionCounter = _PositionCounter.load(counterID);
  if (!positionCounter) {
    log.warning("[subtractPosition] position counter {} not found", [counterID]);
    return null;
  }
  const positionID = positionCounter.id.concat("-").concat(positionCounter.nextCount.toString());
  const position = Position.load(positionID);
  if (!position) {
    log.warning("[subtractPosition] position {} not found", [positionID]);
    return null;
  }

  position.balance = balance;
  if (eventType == EventType.WITHDRAW || eventType == EventType.WITHDRAW_COLLATERAL) {
    position.withdrawCount += 1;
    account.withdrawCount += 1;
  } else if (eventType == EventType.REPAY) {
    position.repayCount += 1;
    account.repayCount += 1;
  } else if (eventType == EventType.LIQUIDATEE) {
    position.liquidationCount += 1;
    account.liquidationCount += 1;
  }
  account.save();
  position.save();

  const closePosition = position.balance == BigInt.zero();
  if (closePosition) {
    //
    // update position counter
    //
    positionCounter.nextCount += 1;
    positionCounter.save();

    //
    // close position
    //
    position.hashClosed = event.transaction.hash;
    position.blockNumberClosed = event.block.number;
    position.timestampClosed = event.block.timestamp;
    position.save();

    //
    // update account position
    //
    account.openPositionCount -= 1;
    account.closedPositionCount += 1;
    account.save();

    //
    // update market position
    //
    market.openPositionCount -= 1;
    market.closedPositionCount += 1;
    market.save();

    //
    // update protocol position
    //
    protocol.openPositionCount -= 1;
    protocol.save();
  }

  //
  // update position snapshot
  //
  snapshotPosition(position, event);

  return position;
}

export function createAccount(accountID: Bytes): Account {
  const account = new Account(accountID);
  account.positionCount = 0;
  account.openPositionCount = 0;
  account.closedPositionCount = 0;
  account.depositCount = 0;
  account.withdrawCount = 0;
  account.borrowCount = 0;
  account.repayCount = 0;
  account.liquidateCount = 0;
  account.liquidationCount = 0;
  account.transferredCount = 0;
  account.receivedCount = 0;
  account.flashloanCount = 0;
  account.save();
  return account;
}

////////////////////////////
///// Internal Helpers /////
////////////////////////////

function getOrCreateMarketDailySnapshot(
  market: Market,
  blockTimestamp: BigInt,
  blockNumber: BigInt
): MarketDailySnapshot {
  const snapshotID = getDayId(blockTimestamp);
  let snapshot = MarketDailySnapshot.load(snapshotID);
  if (!snapshot) {
    snapshot = new MarketDailySnapshot(snapshotID);

    // initialize zero values to ensure no null runtime errors
    snapshot.days = getDay(blockTimestamp).toI32();
    snapshot.dailyActiveTransferrers = INT_ZERO;
    snapshot.dailyActiveFlashloaners = INT_ZERO;
    snapshot.dailyActiveTransferrers = INT_ZERO;
    snapshot.dailyActiveUsers = INT_ZERO;
    snapshot.dailyActiveLiquidators = INT_ZERO;
    snapshot.dailyActiveBorrowers = INT_ZERO;
    snapshot.dailyActiveDepositors = INT_ZERO;
    snapshot.dailyActiveLiquidatees = INT_ZERO;
    snapshot.dailyActiveBorrowingPositionCount = INT_ZERO;
    snapshot.dailyActiveLendingPositionCount = INT_ZERO;

    snapshot.dailyTransferUSD = BigDecimal.zero();
    snapshot.dailyFlashloanUSD = BigDecimal.zero();
    snapshot.dailyDepositUSD = BigDecimal.zero();
    snapshot.dailyBorrowUSD = BigDecimal.zero();
    snapshot.dailyLiquidateUSD = BigDecimal.zero();
    snapshot.dailyWithdrawUSD = BigDecimal.zero();
    snapshot.dailyRepayUSD = BigDecimal.zero();
    snapshot.dailyTotalRevenueUSD = BigDecimal.zero();
    snapshot.dailySupplySideRevenueUSD = BigDecimal.zero();
    snapshot.dailyProtocolSideRevenueUSD = BigDecimal.zero();
    snapshot.dailyTransferCount = INT_ZERO;
    snapshot.dailyFlashloanCount = INT_ZERO;
    snapshot.dailyActiveLendingPositionCount = INT_ZERO;
    snapshot.dailyActiveBorrowingPositionCount = INT_ZERO;
    snapshot.dailyTransferCount = INT_ZERO;
    snapshot.dailyFlashloanCount = INT_ZERO;
    snapshot.dailyLiquidateCount = INT_ZERO;
    snapshot.dailyRepayCount = INT_ZERO;
    snapshot.dailyWithdrawCount = INT_ZERO;
    snapshot.dailyBorrowCount = INT_ZERO;
    snapshot.dailyDepositCount = INT_ZERO;
    snapshot.positionCount = INT_ZERO;
    snapshot.openPositionCount = INT_ZERO;
    snapshot.closedPositionCount = INT_ZERO;
    snapshot.lendingPositionCount = INT_ZERO;
    snapshot.borrowingPositionCount = INT_ZERO;

    snapshot.dailyNativeDeposit = BigInt.zero();
    snapshot.dailyNativeBorrow = BigInt.zero();
    snapshot.dailyNativeLiquidate = BigInt.zero();
    snapshot.dailyNativeWithdraw = BigInt.zero();
    snapshot.dailyNativeRepay = BigInt.zero();
    snapshot.dailyNativeFlashloan = BigInt.zero();
    snapshot.dailyNativeTransfer = BigInt.zero();

    snapshot.protocol = market.protocol;
    snapshot.market = market.id;
  }

  snapshot.rates = getSnapshotRates(
    market.rates,
    (blockTimestamp.toI32() / SECONDS_PER_DAY).toString()
  );
  snapshot.totalValueLockedUSD = market.totalValueLockedUSD;
  snapshot.cumulativeSupplySideRevenueUSD = market.cumulativeSupplySideRevenueUSD;
  snapshot.cumulativeProtocolSideRevenueUSD = market.cumulativeProtocolSideRevenueUSD;
  snapshot.cumulativeFlashloanUSD = market.cumulativeFlashloanUSD;
  snapshot.cumulativeTransferUSD = market.cumulativeTransferUSD;
  snapshot.cumulativeTotalRevenueUSD = market.cumulativeTotalRevenueUSD;
  snapshot.totalDepositBalanceUSD = market.totalDepositBalanceUSD;
  snapshot.cumulativeDepositUSD = market.cumulativeDepositUSD;
  snapshot.totalBorrowBalanceUSD = market.totalBorrowBalanceUSD;
  snapshot.cumulativeBorrowUSD = market.cumulativeBorrowUSD;
  snapshot.cumulativeLiquidateUSD = market.cumulativeLiquidateUSD;
  snapshot.inputTokenBalance = market.inputTokenBalance;
  snapshot.outputTokenSupply = market.outputTokenSupply;
  snapshot.inputTokenPriceUSD = market.inputTokenPriceUSD;
  snapshot.outputTokenPriceUSD = market.outputTokenPriceUSD;
  snapshot.exchangeRate = market.exchangeRate;
  snapshot.rewardTokenEmissionsAmount = market.rewardTokenEmissionsAmount;
  snapshot.rewardTokenEmissionsUSD = market.rewardTokenEmissionsUSD;
  snapshot.blockNumber = blockNumber;
  snapshot.timestamp = blockTimestamp;
  snapshot.save();

  return snapshot;
}

export function getOrCreateMarketHourlySnapshot(
  market: Market,
  blockTimestamp: BigInt,
  blockNumber: BigInt
): MarketHourlySnapshot {
  const snapshotID = getHourId(blockTimestamp);
  let snapshot = MarketHourlySnapshot.load(snapshotID);
  if (!snapshot) {
    snapshot = new MarketHourlySnapshot(snapshotID);

    // initialize zero values to ensure no null runtime errors
    snapshot.hours = getHour(blockTimestamp).toI32();
    snapshot.hourlyFlashloanUSD = BigDecimal.zero();
    snapshot.hourlyTransferUSD = BigDecimal.zero();
    snapshot.hourlyDepositUSD = BigDecimal.zero();
    snapshot.hourlyBorrowUSD = BigDecimal.zero();
    snapshot.hourlyLiquidateUSD = BigDecimal.zero();
    snapshot.hourlyWithdrawUSD = BigDecimal.zero();
    snapshot.hourlyRepayUSD = BigDecimal.zero();
    snapshot.hourlyTotalRevenueUSD = BigDecimal.zero();
    snapshot.hourlyProtocolSideRevenueUSD = BigDecimal.zero();
    snapshot.hourlySupplySideRevenueUSD = BigDecimal.zero();
    snapshot.protocol = market.protocol;
    snapshot.market = market.id;
  }

  snapshot.blockNumber = blockNumber;
  snapshot.timestamp = blockTimestamp;
  snapshot.rates = getSnapshotRates(
    market.rates,
    (blockTimestamp.toI32() / SECONDS_PER_HOUR).toString()
  );
  snapshot.totalValueLockedUSD = market.totalValueLockedUSD;
  snapshot.cumulativeSupplySideRevenueUSD = market.cumulativeSupplySideRevenueUSD;
  snapshot.cumulativeProtocolSideRevenueUSD = market.cumulativeProtocolSideRevenueUSD;
  snapshot.cumulativeTotalRevenueUSD = market.cumulativeTotalRevenueUSD;
  snapshot.totalDepositBalanceUSD = market.totalDepositBalanceUSD;
  snapshot.cumulativeDepositUSD = market.cumulativeDepositUSD;
  snapshot.totalBorrowBalanceUSD = market.totalBorrowBalanceUSD;
  snapshot.cumulativeBorrowUSD = market.cumulativeBorrowUSD;
  snapshot.cumulativeLiquidateUSD = market.cumulativeLiquidateUSD;
  snapshot.inputTokenBalance = market.inputTokenBalance;
  snapshot.outputTokenSupply = market.outputTokenSupply;
  snapshot.inputTokenPriceUSD = market.inputTokenPriceUSD;
  snapshot.outputTokenPriceUSD = market.outputTokenPriceUSD;
  snapshot.exchangeRate = market.exchangeRate;
  snapshot.rewardTokenEmissionsAmount = market.rewardTokenEmissionsAmount;
  snapshot.rewardTokenEmissionsUSD = market.rewardTokenEmissionsUSD;
  snapshot.save();

  return snapshot;
}

function getSnapshotRates(rates: string[] | null, timeSuffix: string): string[] {
  if (!rates) return [];
  const snapshotRates: string[] = [];
  for (let i = 0; i < rates.length; i++) {
    const rate = InterestRate.load(rates[i]);
    if (!rate) {
      log.warning("[getSnapshotRates] rate {} not found, should not happen", [rates[i]]);
      continue;
    }

    // create new snapshot rate
    const snapshotRateId = rates[i].concat("-").concat(timeSuffix);
    const snapshotRate = new InterestRate(snapshotRateId);
    snapshotRate.side = rate.side;
    snapshotRate.type = rate.type;
    snapshotRate.rate = rate.rate;
    snapshotRate.save();
    snapshotRates.push(snapshotRateId);
  }
  return snapshotRates;
}

function snapshotPosition(position: Position, event: ethereum.Event): void {
  const snapshot = new PositionSnapshot(
    position.id
      .concat("-")
      .concat(event.transaction.hash.toHexString())
      .concat("-")
      .concat(event.logIndex.toString())
  );
  const market = getMarket(position.market);
  const inputToken = getOrInitToken(market.inputToken);
  const poolIndex =
    position.side === PositionSide.LENDER
      ? market._lastPoolSupplyIndex
      : market._lastPoolBorrowIndex;
  const p2pIndex =
    position.side === PositionSide.LENDER ? market._p2pSupplyIndex : market._p2pBorrowIndex;

  let balanceOnPool = BigInt.zero();
  let balanceInP2P = BigInt.zero();

  if (position.balance.gt(BigInt.zero())) {
    balanceOnPool = position.balanceOnPool.times(poolIndex).div(RAY_BI);
    balanceInP2P = position.balanceInP2P.times(p2pIndex).div(RAY_BI);
  }

  const totalBalance = balanceOnPool.plus(balanceInP2P);
  snapshot.hash = event.transaction.hash;
  snapshot.logIndex = event.logIndex.toI32();
  snapshot.nonce = event.transaction.nonce;
  snapshot.position = position.id;
  snapshot.account = position.account;
  snapshot.balance = position.balance;
  snapshot.balanceUSD = totalBalance
    .toBigDecimal()
    .div(pow10Decimal(inputToken.decimals))
    .times(market.inputTokenPriceUSD);
  snapshot.blockNumber = event.block.number;
  snapshot.timestamp = event.block.timestamp;
  snapshot.balanceOnPool = balanceOnPool;
  snapshot.balanceInP2P = balanceInP2P;
  snapshot.balanceOnPoolUSD = balanceOnPool
    .toBigDecimal()
    .times(pow10Decimal(inputToken.decimals))
    .times(market.inputTokenPriceUSD);
  snapshot.balanceInP2PUSD = balanceInP2P
    .toBigDecimal()
    .times(pow10Decimal(inputToken.decimals))
    .times(market.inputTokenPriceUSD);

  snapshot.save();
}

/**
 * Updates the protocol position on the underlying pool for the given market
 * @param protocol The Morpho protocol to update
 * @param market The market to update
 */
export function updateProtocolPosition(protocol: LendingProtocol, market: Market): void {
  const inputToken = getOrInitToken(market.inputToken);

  const newMarketSupplyOnPool_BI = market._scaledSupplyOnPool
    .times(market._reserveSupplyIndex)
    .div(pow10(market._indexesOffset));

  const newMarketSupplyOnPool = newMarketSupplyOnPool_BI
    .toBigDecimal()
    .div(pow10Decimal(inputToken.decimals));

  const newMarketSupplyInP2P_BI = market._scaledSupplyInP2P
    .times(market._p2pSupplyIndex)
    .div(pow10(market._indexesOffset));

  const newMarketSupplyInP2P = newMarketSupplyInP2P_BI
    .toBigDecimal()
    .div(pow10Decimal(inputToken.decimals));

  const newMarketSupplyCollateral_BI = market._scaledPoolCollateral
    ? market
        ._scaledPoolCollateral!.times(market._reserveSupplyIndex)
        .div(pow10(market._indexesOffset))
    : BigInt.zero();

  const newMarketSupplyCollateral = newMarketSupplyCollateral_BI
    .toBigDecimal()
    .div(pow10Decimal(inputToken.decimals));

  const newMarketSupplyUSD = newMarketSupplyOnPool
    .plus(newMarketSupplyInP2P)
    .plus(newMarketSupplyCollateral)
    .times(market.inputTokenPriceUSD);

  const newMarketBorrowOnPool_BI = market._scaledBorrowOnPool
    .times(market._reserveBorrowIndex)
    .div(pow10(market._indexesOffset));

  const newMarketBorrowOnPool = newMarketBorrowOnPool_BI
    .toBigDecimal()
    .div(pow10Decimal(inputToken.decimals));

  const newMarketBorrowInP2P_BI = market._scaledBorrowInP2P
    .times(market._p2pBorrowIndex)
    .div(pow10(market._indexesOffset));

  const newMarketBorrowInP2P = newMarketBorrowInP2P_BI
    .toBigDecimal()
    .div(pow10Decimal(inputToken.decimals));

  const newMarketBorrowUSD = newMarketBorrowOnPool
    .plus(newMarketBorrowInP2P)
    .times(market.inputTokenPriceUSD);

  protocol.totalValueLockedUSD = protocol.totalValueLockedUSD
    .minus(market.totalDepositBalanceUSD)
    .plus(newMarketSupplyUSD);

  protocol.totalDepositBalanceUSD = protocol.totalValueLockedUSD;
  protocol.totalBorrowBalanceUSD = protocol.totalBorrowBalanceUSD
    .minus(market.totalBorrowBalanceUSD)
    .plus(newMarketBorrowUSD);
  protocol.save();

  market.variableBorrowedTokenBalance = newMarketBorrowInP2P_BI.plus(newMarketBorrowOnPool_BI);

  market.inputTokenBalance = newMarketSupplyOnPool_BI
    .plus(newMarketSupplyInP2P_BI)
    .plus(newMarketSupplyCollateral_BI);

  market.totalDepositBalanceUSD = newMarketSupplyUSD;
  market.totalBorrowBalanceUSD = newMarketBorrowUSD;
  market.totalValueLockedUSD = newMarketSupplyUSD;
  market.totalSupplyOnPool = newMarketSupplyOnPool;
  market.totalSupplyInP2P = newMarketSupplyInP2P;
  market.totalBorrowOnPool = newMarketBorrowOnPool;
  market.totalCollateralOnPool = newMarketSupplyCollateral;

  market.totalBorrowInP2P = newMarketBorrowInP2P;
  market.save();
}

export function updateP2PIndexesAndRates(
  event: ethereum.Event,
  market: Market,
  __MATHS__: IMaths
): void {
  const indexesUpdated = createIndexesUpdated(
    event.block.number,
    event.block.timestamp,
    market,
    __MATHS__
  );

  market._previousIndexesAndRatesHistory = indexesUpdated[0].id;
  market._lastIndexesAndRatesHistory = indexesUpdated[1].id;

  const proportionIdle = computeProportionIdle(
    market._indexesOffset,
    market._idleSupply,
    market._p2pSupplyAmount,
    market._p2pSupplyIndex
  );
  const growthFactors = computeGrowthFactors(
    market._reserveSupplyIndex,
    market._reserveBorrowIndex,
    market._lastPoolSupplyIndex,
    market._lastPoolBorrowIndex,
    market._p2pIndexCursor_BI,
    market._reserveFactor_BI,
    __MATHS__
  );
  const supplyProportionDelta = computeProportionDelta(
    market._p2pSupplyDelta,
    market._p2pSupplyAmount,
    market._lastPoolSupplyIndex,
    market._p2pSupplyIndex,
    proportionIdle,
    __MATHS__
  );
  const borrowProportionDelta = computeProportionDelta(
    market._p2pBorrowDelta,
    market._p2pBorrowAmount,
    market._lastPoolBorrowIndex,
    market._p2pBorrowIndex,
    proportionIdle,
    __MATHS__
  );
  market._p2pSupplyIndexFromRates = computeP2PIndex(
    market._p2pSupplyIndex,
    growthFactors.p2pSupplyGrowthFactor,
    growthFactors.poolSupplyGrowthFactor,
    supplyProportionDelta,
    proportionIdle,
    __MATHS__
  );
  market._p2pBorrowIndexFromRates = computeP2PIndex(
    market._p2pBorrowIndex,
    growthFactors.p2pBorrowGrowthFactor,
    growthFactors.poolBorrowGrowthFactor,
    borrowProportionDelta,
    proportionIdle,
    __MATHS__
  );
  market._p2pBorrowRate = computeP2PBorrowRate(
    market._poolBorrowRate,
    market._poolSupplyRate,
    market._p2pIndexCursor_BI,
    market._reserveFactor_BI,
    computeProportionDelta(
      market._p2pBorrowDelta,
      market._p2pBorrowAmount,
      market._lastPoolBorrowIndex,
      market._p2pBorrowIndexFromRates,
      proportionIdle,
      __MATHS__
    ),
    proportionIdle,
    __MATHS__
  );
  market._p2pSupplyRate = computeP2PSupplyRate(
    market._poolBorrowRate,
    market._poolSupplyRate,
    market._p2pIndexCursor_BI,
    market._reserveFactor_BI,
    computeProportionDelta(
      market._p2pSupplyDelta,
      market._p2pSupplyAmount,
      market._lastPoolSupplyIndex,
      market._p2pSupplyIndexFromRates,
      proportionIdle,
      __MATHS__
    ),
    proportionIdle,
    __MATHS__
  );

  const p2pSupplyRate = createInterestRate(
    market.id,
    InterestRateSide.LENDER,
    InterestRateType.P2P,
    market._p2pSupplyRate
      .toBigDecimal()
      .div(pow10Decimal(market._indexesOffset))
      .times(BIGDECIMAL_HUNDRED)
  );
  const p2pBorrowRate = createInterestRate(
    market.id,
    InterestRateSide.BORROWER,
    InterestRateType.P2P,
    market._p2pBorrowRate
      .toBigDecimal()
      .div(pow10Decimal(market._indexesOffset))
      .times(BIGDECIMAL_HUNDRED)
  );

  const rates: string[] | null = market.rates;
  if (!rates) return;
  if (rates.length < 0) log.critical("Rate error", []);
  const supplyRateId = rates[0];
  const borrowRateId = rates[3];
  if (!supplyRateId || !borrowRateId) return;

  market.rates = [supplyRateId, p2pSupplyRate.id, p2pBorrowRate.id, borrowRateId];
}

export const getEventId = (hash: Bytes, logIndex: BigInt): Bytes =>
  hash.concat(Bytes.fromI32(logIndex.toI32()));
