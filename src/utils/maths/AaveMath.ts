import { BigInt } from "@graphprotocol/graph-ts";

import { RAY_BI } from "../../constants";

import WadRayMath from "./WadRayMath";
import { IMaths } from "./maths.interface";

export class AaveMath implements IMaths {
  INDEX_ONE: BigInt = RAY_BI;
  indexMul: (x: BigInt, y: BigInt) => BigInt = WadRayMath.rayMul;
  indexDiv: (x: BigInt, y: BigInt) => BigInt = WadRayMath.rayDiv;
}
