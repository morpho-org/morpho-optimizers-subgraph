import { ethereum } from "@graphprotocol/graph-ts";

import {
  AccrueInterest,
  AccrueInterest1,
  CToken,
} from "../../../generated/morpho-v1/templates/CToken/CToken";
import { MORPHO_COMPOUND_ADDRESS } from "../../constants";
import { getOrInitLendingProtocol } from "../../utils/initializers";
import { CompoundMath } from "../../utils/maths/CompoundMath";
import { _handleReserveUpdate } from "../common";
import { ReserveUpdateParams } from "../morpho-aave/lending-pool";

export function handleAccrueInterestV1(event: AccrueInterest1): void {
  handleAccrueInterest(event);
}

export function handleAccrueInterestV2(event: AccrueInterest): void {
  handleAccrueInterest(event);
}

function handleAccrueInterest(event: ethereum.Event): void {
  const protocol = getOrInitLendingProtocol(MORPHO_COMPOUND_ADDRESS);
  const cTokenInstance = CToken.bind(event.address);
  const supplyPoolRatePerBlock = cTokenInstance.supplyRatePerBlock();
  const borrowPoolRatePerBlock = cTokenInstance.borrowRatePerBlock();

  const supplyPoolIndex = cTokenInstance.exchangeRateStored();
  const borrowPoolIndex = cTokenInstance.borrowIndex();

  const supplyPoolRate = supplyPoolRatePerBlock;
  const borrowPoolRate = borrowPoolRatePerBlock;
  _handleReserveUpdate(
    new ReserveUpdateParams(
      event,
      event.address,
      protocol,
      supplyPoolIndex,
      borrowPoolIndex,
      supplyPoolRate,
      borrowPoolRate
    ),
    new CompoundMath()
  );
}
