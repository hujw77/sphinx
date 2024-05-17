import {
  DeploymentConfig,
  ConfigArtifacts,
  GetConfigArtifacts,
  NetworkConfig,
  ProposalRequest,
  RelayProposal,
  SphinxJsonRpcProvider,
  SphinxTransactionReceipt,
  StoreDeploymentConfig,
  getPreview,
  isLiveNetwork,
  relayProposal,
  storeDeploymentConfig,
  userConfirmation,
} from '@hujw77/core'
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider'
import { SphinxMerkleTree } from '@hujw77/contracts'

import {
  assertNoLinkedLibraries,
  getNetworkGasEstimate,
  makeGetConfigArtifacts,
} from '../foundry/utils'
import { ProposeArgs, buildNetworkConfigArray, propose } from './propose'
import { DeployArgs, deploy } from './deploy'
import { ExecuteArgs, execute } from './execute'
import {
  AssertNoLinkedLibraries,
  BuildNetworkConfigArray,
  FetchRemoteArtifacts,
  GetNetworkGasEstimate,
} from './types'
import { fetchRemoteArtifacts } from './artifacts'

export type SphinxContext = {
  makeGetConfigArtifacts: (
    artifactFolder: string,
    buildInfoFolder: string,
    projectRoot: string,
    cachePath: string
  ) => GetConfigArtifacts
  prompt: (question: string) => Promise<void>
  isLiveNetwork: (
    provider: SphinxJsonRpcProvider | HardhatEthersProvider
  ) => Promise<boolean>
  propose: (args: ProposeArgs) => Promise<{
    proposalRequest?: ProposalRequest
    deploymentConfigData?: string
    configArtifacts?: ConfigArtifacts
    networkConfigArray?: Array<NetworkConfig>
    merkleTree?: SphinxMerkleTree
  }>
  deploy: (args: DeployArgs) => Promise<{
    deploymentConfig?: DeploymentConfig
    merkleTree?: SphinxMerkleTree
    preview?: ReturnType<typeof getPreview>
    receipts?: Array<SphinxTransactionReceipt>
    configArtifacts?: ConfigArtifacts
  }>
  execute: (args: ExecuteArgs) => Promise<void>
  getNetworkGasEstimate: GetNetworkGasEstimate
  buildNetworkConfigArray: BuildNetworkConfigArray
  storeDeploymentConfig: StoreDeploymentConfig
  relayProposal: RelayProposal
  fetchRemoteArtifacts: FetchRemoteArtifacts
  assertNoLinkedLibraries: AssertNoLinkedLibraries
}

export const makeSphinxContext = (): SphinxContext => {
  return {
    makeGetConfigArtifacts,
    prompt: userConfirmation,
    isLiveNetwork,
    propose,
    deploy,
    execute,
    getNetworkGasEstimate,
    buildNetworkConfigArray,
    storeDeploymentConfig,
    relayProposal,
    fetchRemoteArtifacts,
    assertNoLinkedLibraries,
  }
}
