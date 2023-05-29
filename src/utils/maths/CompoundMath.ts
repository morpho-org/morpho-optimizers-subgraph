import { BigInt } from "@graphprotocol/graph-ts";

import { WAD_BI } from "../../constants";

import WadRayMath from "./WadRayMath";
import { IMaths } from "./maths.interface";

export class CompoundMath implements IMaths {
  INDEX_ONE: BigInt = WAD_BI;
  indexMul: (x: BigInt, y: BigInt) => BigInt = WadRayMath.wadMul;
  indexDiv: (x: BigInt, y: BigInt) => BigInt = WadRayMath.wadDiv;
}
