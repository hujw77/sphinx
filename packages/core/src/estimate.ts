import { GasEstimates } from './languages'

export type DeployContractCost = {
  referenceName: string
  cost: bigint
}

export const getEstDeployContractCost = (
  gasEstimates: GasEstimates
): bigint => {
  const { totalCost, codeDepositCost } = gasEstimates.creation

  if (totalCost === 'infinite') {
    // The `totalCost` is 'infinite' because the contract has a constructor, which means the
    // Solidity compiler won't determine the cost of the deployment since the constructor can
    // contain arbitrary logic. In this case, we use the `executionCost` along a buffer multiplier
    // of 1.5.
    return (BigInt(codeDepositCost) * 3n) / 2n
  } else {
    return BigInt(totalCost)
  }
}
