import { relative } from 'path'
import { readFileSync } from 'fs'
import { SphinxModuleABI } from '@sphinx-labs/contracts'
import {
  isFile,
  signMerkleRoot,
  fetchNameForNetwork,
  SphinxJsonRpcProvider,
  DeploymentConfig,
  DeploymentContext,
  NetworkConfig,
  HumanReadableAction,
  attemptDeployment,
  InjectRoles,
  RemoveRoles,
  executeTransactionViaSigner,
  Deployment,
} from '@sphinx-labs/core'
import { ethers } from 'ethers'
import { red } from 'chalk'
import ora from 'ora'

import { getFoundryToml } from '../foundry/options'

export interface ExecuteArgs {
  proposalPath: string
}

export const execute = async ( args: ExecuteArgs) => {

  const projectRoot = process.cwd()

  const spinner = ora({ isSilent: false })

  const deploymentConfigPath = relative(projectRoot, args.proposalPath)

  if (!isFile(deploymentConfigPath)) {
    throw new Error(
      `File does not exist at: ${deploymentConfigPath}\n` +
        `Please make sure this is a valid file path.`
    )
  }

  const deploymentConfig = JSON.parse(readFileSync(deploymentConfigPath, 'utf-8'))

  const privateKey = process.env.PRIVATE_KEY
  // Check if the private key exists. It should always exist because we checked that it's defined
  // when we collected the transactions in the user's Forge script.
  if (!privateKey) {
    throw new Error(`Could not find 'PRIVATE_KEY' environment variable.`)
  }

  const networkConfigs = deploymentConfig.networkConfigs
  const merkleTree = deploymentConfig.merkleTree

  for (const networkConfig of networkConfigs) {
    const network = fetchNameForNetwork(BigInt(networkConfig.chainId))
    const foundryToml = await getFoundryToml()
    const { rpcEndpoints } = foundryToml
    const forkUrl = rpcEndpoints[network]
    if (!forkUrl) {
      console.error(
        red(
          `No RPC endpoint specified in your foundry.toml for the network: ${network}.`
        )
      )
      process.exit(1)
    }

    const provider = new SphinxJsonRpcProvider(forkUrl)
    let signer = new ethers.Wallet(privateKey, provider)

    const treeSigner = {
      signer: signer.address,
      signature: await signMerkleRoot(merkleTree.root, signer),
    }

    const sphinxModuleReadOnly = new ethers.Contract(
      networkConfig.moduleAddress,
      SphinxModuleABI
    )

    const merkleRootState = await sphinxModuleReadOnly.merkleRootStates(merkleTree.root)

    // We use no role injection when deploying on the live network since that obviously would not work
    let inject: InjectRoles = async () => {
      return
    }
    let remove: RemoveRoles = async () => {
      return
    }

    const deployment: Deployment = {
      id: 'only required on website',
      multichainDeploymentId: 'only required on website',
      projectId: 'only required on website',
      chainId: networkConfig.chainId,
      status: merkleRootState.status,
      moduleAddress: networkConfig.moduleAddress,
      safeAddress: networkConfig.safeAddress,
      deploymentConfig,
      networkName: network,
      treeSigners: [treeSigner],
    }
    const deploymentContext: DeploymentContext = {
      throwError: (message: string) => {
        throw new Error(message)
      },
      handleError: (e) => {
        throw e
      },
      handleAlreadyExecutedDeployment: () => {
        throw new Error(
          'Deployment has already been executed. This is a bug. Please report it to the developers.'
        )
      },
      handleExecutionFailure: (
        _deploymentContext: DeploymentContext,
        _networkConfig: NetworkConfig,
        failureReason: HumanReadableAction
      ) => {
        throw new Error(
          `The following action reverted during the execution:\n${failureReason.reason}`
        )
      },
      handleSuccess: async () => {
        return
      },
      executeTransaction: executeTransactionViaSigner,
      injectRoles: inject,
      removeRoles: remove,
      deployment,
      wallet: signer,
      provider,
      spinner,
    }
    const result = await attemptDeployment(deploymentContext)

    if (!result) {
      throw new Error(
        'Simulation failed for an unexpected reason. This is a bug. Please report it to the developers.'
      )
    }

    const { receipts } = result
    console.log(receipts)

    // spinner.start(`Building deployment artifacts...`)
    //
    // const { projectName } = networkConfig.newConfig
    //
    // // Get the existing contract deployment artifacts and execution artifacts for the current network.
    // // This object will potentially be modified when we make the new deployment artifacts.
    // // Specifically, the `history` field of the contract deployment artifacts could be modified. Even
    // // though we don't currently modify the execution artifacts, we include them anyways in case we
    // // add logic in the future that modifies them. We don't include the compiler input artifacts
    // // mainly as a performance optimization and because we don't expect to modify them in the future.
    // const networkArtifacts = readDeploymentArtifactsForNetwork(
    //   projectName,
    //   chainId,
    //   executionMode
    // )
    // const deploymentArtifacts = {
    //   networks: {
    //     [chainId.toString()]: networkArtifacts,
    //   },
    //   compilerInputs: {},
    // }
    //
    // await makeDeploymentArtifacts(
    //   {
    //     [chainId.toString()]: {
    //       provider,
    //       deploymentConfig,
    //       receipts,
    //     },
    //   },
    //   merkleTree.root,
    //   configArtifacts,
    //   deploymentArtifacts
    // )
    //
    // spinner.succeed(`Built deployment artifacts.`)
    // spinner.start(`Writing deployment artifacts...`)
    //
    // writeDeploymentArtifacts(
    //   projectName,
    //   networkConfig.executionMode,
    //   deploymentArtifacts
    // )
    //
    // // Note that we don't display the artifact paths for the deployment artifacts because we may not
    // // modify all of the artifacts that we read from the file system earlier.
    // spinner.succeed(`Wrote deployment artifacts.`)
    //
    // displayDeploymentTable(networkConfig)

  }

  // return {
  //   deploymentConfig,
  //   merkleTree,
  //   preview,
  //   receipts,
  //   configArtifacts,
  //   deploymentArtifacts,
  // }
}
