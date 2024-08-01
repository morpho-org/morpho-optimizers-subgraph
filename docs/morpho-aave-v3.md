# Morpho Aave V3

## Specifications

### Supply only vs collateral

On morpho Aave v3, there are 2 types of supply positions: supply only or supply as collateral.

A supply as collateral cannot be matched P2P with a borrower, but it permits to borrow against it.

In order to keep the previous subgraph working, we need to add a new parameter to the `supply` and `withdraw` function: `isCollateral`.

A supply only has the same behavior as a supply on morpho Aave v2 or morpho compound: you have 2 scaled balances: `onPool` & `inP2P`

A collateral supply sets inP2P to 0 since you cannot be matched P2P.

### Market fields

The market is defining new fields:
- `totalCollateralOnPool` is the total underlying on the pool that represents collateral, updated as the same time as the `totalSupplyOnPool`.
- `_scaledPoolCollateral`, is the scaled amount of collateral on the pool.
- 
- `_scaledSupplyOnPool` is representing the supply only on the underlying pool, waiting to be matched.
- `_scaledSupplyInP2P` is representing the supply only matched P2P.

The scaled balance of the protocol is now represented by `_scaledSupplyOnPool` plus `_scaledSupplyInP2P` **and** `_scaledPoolCollateral`.


`totalSupplyOnPool` is the supply only on the underlying  pool.

The `totalDepositBalanceUSD` is the total supply on pool, the total supply matched P2P, and the total collateral.

The idleSupply is a new field, representing the supply amount that is not generating yields due to a supply cap on Aave v3.


For morpho Aave v3 markets, the supply cap is not null.

### General metrics

In order to compute the total on pool, in P2P or collateral, we are aggregating all the user scaled balances,
by splitting the collateral and the supply only. These metrics are really important since they cannot be retrieved on chain.

On morpho Aave v2 or morpho compound, the supply on pool is the aToken balance of the protocol. 
On morpho Aave v3, the aToken balance is the supply only on pool **and** the collateral.

We can also implement new metrics to have more data of the history between collateral and supply only. 
All the classic metrics are still available (`market.totalSupplyOnPool`), aggregating collateral and supply on pool for metrics related to the protocol balance on pool.
