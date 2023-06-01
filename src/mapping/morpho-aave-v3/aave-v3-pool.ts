import { log } from "@graphprotocol/graph-ts";

import { Market } from "../../../generated/morpho-v1/schema";
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
} from "../../../generated/morpho-v1/templates/AaveV3Pool/AaveV3Pool";
import { MORPHO_AAVE_V2_ADDRESS, MORPHO_AAVE_V3_ADDRESS } from "../../constants";
import { getOrInitLendingProtocol } from "../../utils/initializers";
import { AaveMath } from "../../utils/maths/AaveMath";
import { _handleReserveUpdate } from "../common";
import { ReserveUpdateParams } from "../morpho-aave/lending-pool";

export function handleBackUnbacked(event: BackUnbacked): void {}

export function handleBorrow(event: Borrow): void {}

export function handleFlashLoan(event: FlashLoan): void {}

export function handleIsolationModeTotalDebtUpdated(event: IsolationModeTotalDebtUpdated): void {}

export function handleLiquidationCall(event: LiquidationCall): void {}

export function handleMintUnbacked(event: MintUnbacked): void {}

export function handleMintedToTreasury(event: MintedToTreasury): void {}

export function handleRebalanceStableBorrowRate(event: RebalanceStableBorrowRate): void {}

export function handleRepay(event: Repay): void {}

export function handleReserveDataUpdated(event: ReserveDataUpdated): void {
  const market = Market.load(event.params.reserve);
  if (!market) {
    log.info("[Reserve data updated] Market not created on Morpho: {}", [
      event.params.reserve.toHexString(),
    ]);
    return;
  }
  const protocol = getOrInitLendingProtocol(MORPHO_AAVE_V3_ADDRESS);

  const params = new ReserveUpdateParams(
    event,
    market.id,
    protocol,
    event.params.liquidityIndex,
    event.params.variableBorrowIndex,
    event.params.liquidityRate,
    event.params.variableBorrowRate
  );
  _handleReserveUpdate(params, new AaveMath());
}

export function handleReserveUsedAsCollateralDisabled(
  event: ReserveUsedAsCollateralDisabled
): void {}

export function handleReserveUsedAsCollateralEnabled(event: ReserveUsedAsCollateralEnabled): void {}

export function handleSupply(event: Supply): void {}

export function handleSwapBorrowRateMode(event: SwapBorrowRateMode): void {}

export function handleUserEModeSet(event: UserEModeSet): void {}

export function handleWithdraw(event: Withdraw): void {}
