import {
  BackUnbacked,
  Borrow,
  FlashLoan,
  IsolationModeTotalDebtUpdated,
  LiquidationCall,
  MintUnbacked,
  MintedToTreasury,
  RebalanceStableBorrowRate,
  Repay,
  ReserveDataUpdated,
  ReserveUsedAsCollateralDisabled,
  ReserveUsedAsCollateralEnabled,
  Supply,
  SwapBorrowRateMode,
  UserEModeSet,
  Withdraw,
} from "../../../generated/templates/AaveV3Pool/AaveV3Pool";

export function handleBackUnbacked(event: BackUnbacked): void {}

export function handleBorrow(event: Borrow): void {}

export function handleFlashLoan(event: FlashLoan): void {}

export function handleIsolationModeTotalDebtUpdated(event: IsolationModeTotalDebtUpdated): void {}

export function handleLiquidationCall(event: LiquidationCall): void {}

export function handleMintUnbacked(event: MintUnbacked): void {}

export function handleMintedToTreasury(event: MintedToTreasury): void {}

export function handleRebalanceStableBorrowRate(event: RebalanceStableBorrowRate): void {}

export function handleRepay(event: Repay): void {}

export function handleReserveDataUpdated(event: ReserveDataUpdated): void {}

export function handleReserveUsedAsCollateralDisabled(
  event: ReserveUsedAsCollateralDisabled
): void {}

export function handleReserveUsedAsCollateralEnabled(event: ReserveUsedAsCollateralEnabled): void {}

export function handleSupply(event: Supply): void {}

export function handleSwapBorrowRateMode(event: SwapBorrowRateMode): void {}

export function handleUserEModeSet(event: UserEModeSet): void {}

export function handleWithdraw(event: Withdraw): void {}
