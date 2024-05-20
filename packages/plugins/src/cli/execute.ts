import { relative, join } from 'path'
import { readFileSync } from 'fs'

import {
  isFile,
  fetchNameForNetwork,
  fetchSupportedNetworkByName,
  SphinxJsonRpcProvider,
  DeploymentContext,
  NetworkConfig,
  HumanReadableAction,
  attemptDeployment,
  InjectRoles,
  RemoveRoles,
  executeTransactionViaSigner,
  Deployment,
  fetchExecutionTransactionReceipts,
  convertEthersTransactionReceipt,
  SphinxTransactionReceipt,
  readDeploymentArtifactsForNetwork,
  makeDeploymentArtifacts,
  writeDeploymentArtifacts,
  displayDeploymentTable,
  // verifyDeploymentWithRetries,
} from '@hujw77/core'
import { ethers } from 'ethers'
import { Logger } from '@eth-optimism/common-ts'
import ora from 'ora'

export interface ExecuteArgs {
  proposalPath: string
  artifact: boolean
}

export const execute = async (args: ExecuteArgs) => {
  const { proposalPath, artifact } = args;
  const projectRoot = process.cwd()

  const spinner = ora({ isSilent: false })
  const logger = new Logger({
    name: 'Logger',
  })

  const deploymentPath = relative(projectRoot, proposalPath)
  const deploymentConfigFile = join(deploymentPath, 'deployment.json')
  const deploymentSigFile = join(deploymentPath, 'signature.json')

  if (!isFile(deploymentConfigFile) || !isFile(deploymentSigFile)) {
    throw new Error(
      `File does not exist at: ${deploymentConfigFile} or ${deploymentSigFile}\n` +
        `Please make sure this is a valid file path.`
    )
  }

  const deploymentConfig = JSON.parse(
    readFileSync(deploymentConfigFile, 'utf-8')
  )
  const treeSigners = JSON.parse(readFileSync(deploymentSigFile, 'utf-8'))

  const privateKey = process.env.PRIVATE_KEY
  // Check if the private key exists. It should always exist because we checked that it's defined
  // when we collected the transactions in the user's Forge script.
  if (!privateKey) {
    throw new Error(`Could not find 'PRIVATE_KEY' environment variable.`)
  }

  const networkConfigs = deploymentConfig.networkConfigs
  const merkleTree = deploymentConfig.merkleTree

  for (const networkConfig of networkConfigs) {
    const chainId = networkConfig.chainId
    const networkName = fetchNameForNetwork(BigInt(chainId))
    const supportedNetwork = fetchSupportedNetworkByName(networkName)

    const provider = new SphinxJsonRpcProvider(await supportedNetwork.rpcUrl())

    const signer = new ethers.Wallet(privateKey, provider)

    // We use no role injection when deploying on the live network since that obviously would not work
    const inject: InjectRoles = async () => {
      return
    }
    const remove: RemoveRoles = async () => {
      return
    }

    let receipts: Array<SphinxTransactionReceipt> | undefined
    const deployment: Deployment = {
      id: 'only required on website',
      multichainDeploymentId: 'only required on website',
      projectId: 'only required on website',
      chainId,
      status: 'approved',
      moduleAddress: networkConfig.moduleAddress,
      safeAddress: networkConfig.safeAddress,
      deploymentConfig,
      networkName,
      treeSigners,
    }
    const deploymentContext: DeploymentContext = {
      throwError: (message: string) => {
        throw new Error(message)
      },
      handleError: (e) => {
        throw e
      },
      handleAlreadyExecutedDeployment: async (context) => {
        receipts = (
          await fetchExecutionTransactionReceipts(
            [],
            context.deployment.moduleAddress,
            context.deployment.deploymentConfig.merkleTree.root,
            context.provider
          )
        ).map(convertEthersTransactionReceipt)
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
      logger,
    }

    const result = await attemptDeployment(deploymentContext)

    if (result) {
      receipts = result?.receipts
    }

    if (!receipts) {
      throw new Error(
        'Execution failed for an unexpected reason. This is a bug. Please report it to the developers.'
      )
    }

    spinner.succeed(`Deployment executed.`)

    if (artifact) {
      spinner.start(`Building deployment artifacts...`)

      const { projectName } = networkConfig.newConfig

      // Get the existing contract deployment artifacts and execution artifacts for the current network.
      // This object will potentially be modified when we make the new deployment artifacts.
      // Specifically, the `history` field of the contract deployment artifacts could be modified. Even
      // though we don't currently modify the execution artifacts, we include them anyways in case we
      // add logic in the future that modifies them. We don't include the compiler input artifacts
      // mainly as a performance optimization and because we don't expect to modify them in the future.
      const networkArtifacts = readDeploymentArtifactsForNetwork(
        projectName,
        chainId,
        networkConfig.executionMode
      )
      const deploymentArtifacts = {
        networks: {
          [chainId.toString()]: networkArtifacts,
        },
        compilerInputs: {},
      }

      await makeDeploymentArtifacts(
        {
          [chainId.toString()]: {
            provider,
            deploymentConfig,
            receipts,
          },
        },
        merkleTree.root,
        deploymentConfig.configArtifacts,
        deploymentArtifacts
      )

      spinner.succeed(`Built deployment artifacts.`)
      spinner.start(`Writing deployment artifacts...`)

      writeDeploymentArtifacts(
        projectName,
        networkConfig.executionMode,
        deploymentArtifacts
      )

      // Note that we don't display the artifact paths for the deployment artifacts because we may not
      // modify all of the artifacts that we read from the file system earlier.
      spinner.succeed(`Wrote deployment artifacts.`)

      displayDeploymentTable(networkConfig)
    }
    // if (true) {
    //   spinner.info(`Verifying contracts on Etherscan.`)
    //
    //   const etherscanApiEnvKey = supportedNetwork.blockexplorers.etherscan?.envKey
    //   if (!etherscanApiEnvKey) {
    //     continue
    //   }
    //   const etherscanApiKey = eval(`process.env.${etherscanApiEnvKey}`)
    //
    //   await verifyDeploymentWithRetries(
    //     deploymentConfig,
    //     provider,
    //     etherscanApiKey
    //   )
    // }
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
