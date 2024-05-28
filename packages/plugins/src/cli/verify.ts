import { relative, join } from 'path'
import { readFileSync } from 'fs'
import {
  isFile,
  SphinxJsonRpcProvider,
  fetchSupportedNetworkByName,
  verifyDeploymentWithRetries,
} from '@hujw77/core'

export interface VerifyArgs {
  deploymentPath: string
  network: string
}

export const verify = async (args: VerifyArgs) => {
  const { deploymentPath, network } = args;
  const projectRoot = process.cwd()
  const deploymentConfigFile = relative(projectRoot, deploymentPath)
  if (!isFile(deploymentConfigFile)) {
    throw new Error(
      `File does not exist at: ${deploymentConfigFile}\n` +
        `Please make sure this is a valid file path.`
    )
  }

  const supportedNetwork = fetchSupportedNetworkByName(network)
  const provider = new SphinxJsonRpcProvider(await supportedNetwork.rpcUrl())

  const deploymentConfig = JSON.parse(
    readFileSync(deploymentConfigFile, 'utf-8')
  )

  const etherscanApiEnvKey = supportedNetwork.blockexplorers.etherscan?.envKey
  if (!etherscanApiEnvKey) {
    throw new Error(
      `Network: ${network} verify api not found`
    )
  }
  const etherscanApiKey = eval(`process.env.${etherscanApiEnvKey}`)

  await verifyDeploymentWithRetries(
    deploymentConfig,
    provider,
    etherscanApiKey
  )
}
