// Warning: The constants in this file are commonly imported from the frontend of the Sphinx Managed website.
// Be careful when importing external dependencies to this file because they may cause issues when this file
// is imported by the website.

import { isSupportedNetworkName } from './utils'

export type SupportedLocalNetworkName = 'anvil'

export type SupportedMainnetNetworkName =
  | 'ethereum'
  | 'optimism'
  | 'arbitrum'
  | 'polygon'
  | 'bnb'
  | 'gnosis'
  | 'linea'
  | 'polygon_zkevm'
  | 'avalanche'
  | 'fantom'
  | 'base'
export type SupportedTestnetNetworkName =
  | 'sepolia'
  | 'optimism_sepolia'
  | 'arbitrum_sepolia'
  | 'polygon_mumbai'
  | 'bnb_testnet'
  | 'gnosis_chiado'
  | 'linea_goerli'
  | 'polygon_zkevm_goerli'
  | 'avalanche_fuji'
  | 'fantom_testnet'
  | 'base_sepolia'

export type SupportedNetworkName =
  | SupportedMainnetNetworkName
  | SupportedTestnetNetworkName
  | SupportedLocalNetworkName

/**
 * Data returned by the `anvil_metadata` and `hardhat_metadata` RPC methods.
 *
 * @param forkedNetwork Info about the network that the local node is forking, if it exists. If the
 * local node isn't forking a network, this field can be `undefined` or `null` depending on whether
 * the network is an Anvil or Hardhat node.
 */
export type LocalNetworkMetadata = {
  clientVersion: string
  chainId: number
  instanceId: string
  latestBlockNumber: number
  latestBlockHash: string
  forkedNetwork?: {
    chainId: number
    forkBlockNumber: number
    forkBlockHash: string
  } | null
  snapshots?: Record<string, unknown>
}

// This is the same as the `Network` enum defined in Solidity, which is used in the Foundry plugin.
// The fields in the two enums must be kept in sync, and the order of the fields must be the same.
export const NetworkEnum = {
  anvil: BigInt(0),
  // Production networks:
  ethereum: BigInt(1),
  optimism: BigInt(2),
  arbitrum: BigInt(3),
  polygon: BigInt(4),
  bnb: BigInt(5),
  gnosis: BigInt(6),
  linea: BigInt(7),
  polygon_zkevm: BigInt(8),
  avalanche: BigInt(9),
  fantom: BigInt(10),
  base: BigInt(11),
  // Testnets:
  sepolia: BigInt(12),
  optimism_sepolia: BigInt(13),
  arbitrum_sepolia: BigInt(14),
  polygon_mumbai: BigInt(15),
  bnb_testnet: BigInt(16),
  gnosis_chiado: BigInt(17),
  linea_goerli: BigInt(18),
  polygon_zkevm_goerli: BigInt(19),
  avalanche_fuji: BigInt(20),
  fantom_testnet: BigInt(21),
  base_sepolia: BigInt(22),
}

export const networkEnumToName = (
  networkEnum: bigint
): SupportedNetworkName => {
  switch (networkEnum) {
    case NetworkEnum.anvil:
      return 'anvil'
    case NetworkEnum.ethereum:
      return 'ethereum'
    case NetworkEnum.optimism:
      return 'optimism'
    case NetworkEnum.arbitrum:
      return 'arbitrum'
    case NetworkEnum.polygon:
      return 'polygon'
    case NetworkEnum.bnb:
      return 'bnb'
    case NetworkEnum.gnosis:
      return 'gnosis'
    case NetworkEnum.linea:
      return 'linea'
    case NetworkEnum.polygon_zkevm:
      return 'polygon_zkevm'
    case NetworkEnum.avalanche:
      return 'avalanche'
    case NetworkEnum.fantom:
      return 'fantom'
    case NetworkEnum.base:
      return 'base'
    case NetworkEnum.sepolia:
      return 'sepolia'
    case NetworkEnum.optimism_sepolia:
      return 'optimism_sepolia'
    case NetworkEnum.arbitrum_sepolia:
      return 'arbitrum_sepolia'
    case NetworkEnum.polygon_mumbai:
      return 'polygon_mumbai'
    case NetworkEnum.bnb_testnet:
      return 'bnb_testnet'
    case NetworkEnum.gnosis_chiado:
      return 'gnosis_chiado'
    case NetworkEnum.linea_goerli:
      return 'linea_goerli'
    case NetworkEnum.polygon_zkevm_goerli:
      return 'polygon_zkevm_goerli'
    case NetworkEnum.avalanche_fuji:
      return 'avalanche_fuji'
    case NetworkEnum.fantom_testnet:
      return 'fantom_testnet'
    case NetworkEnum.base_sepolia:
      return 'base_sepolia'
    default:
      throw new Error(`Unsupported network enum ${networkEnum}`)
  }
}

// Maps a live network name to its chain ID. Does not include testnets.
export const SUPPORTED_MAINNETS: Record<
  SupportedMainnetNetworkName,
  SupportedMainnetChainId
> = {
  ethereum: 1,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137,
  bnb: 56,
  gnosis: 100,
  linea: 59144,
  polygon_zkevm: 1101,
  avalanche: 43114,
  fantom: 250,
  base: 8453,
}

export const SUPPORTED_LOCAL_NETWORKS: Record<
  SupportedLocalNetworkName,
  SupportedLocalChainId
> = {
  anvil: 31337,
}

export const SUPPORTED_TESTNETS: Record<
  SupportedTestnetNetworkName,
  SupportedTestnetChainId
> = {
  sepolia: 11155111,
  optimism_sepolia: 11155420,
  arbitrum_sepolia: 421614,
  polygon_mumbai: 80001,
  bnb_testnet: 97,
  gnosis_chiado: 10200,
  linea_goerli: 59140,
  polygon_zkevm_goerli: 1442,
  avalanche_fuji: 43113,
  fantom_testnet: 4002,
  base_sepolia: 84532,
}
export const SUPPORTED_NETWORKS = {
  ...SUPPORTED_MAINNETS,
  ...SUPPORTED_TESTNETS,
  ...SUPPORTED_LOCAL_NETWORKS,
}

// Used when it's necessary to enumerate the ids of supported networks.
export const supportedMainnetIds = Object.values(SUPPORTED_MAINNETS)
export const supportedTestnetIds = Object.values(SUPPORTED_TESTNETS)

export type SupportedLocalChainId = 31337

export type SupportedMainnetChainId =
  | 1
  | 10
  | 42161
  | 137
  | 56
  | 100
  | 59144
  | 1101
  | 43114
  | 250
  | 8453
export type SupportedTestnetChainId =
  | 11155111
  | 11155420
  | 80001
  | 97
  | 421614
  | 10200
  | 59140
  | 1442
  | 43113
  | 4002
  | 84532
export type SupportedChainId =
  | SupportedMainnetChainId
  | SupportedTestnetChainId
  | SupportedLocalChainId

export const DrippieDripSizesTestnets = {
  sepolia: '0.15',
  optimism_sepolia: '0.15',
  arbitrum_sepolia: '0.15',
  bnb_testnet: '0.15',
  polygon_mumbai: '0.15',
  gnosis_chiado: '0.15',
  linea_goerli: '0.15',
  polygon_zkevm_goerli: '0.15',
  avalanche_fuji: '1',
  fantom_testnet: '1',
  base_sepolia: '0.15',
}

export const DrippieDripSizesMainnets = {
  ethereum: '.15',
  optimism: '.025',
  arbitrum: '.025',
  polygon: '1',
  bnb: '.05',
  gnosis: '1',
  linea: '0.025',
  polygon_zkevm: '0.025',
  avalanche: '1',
  fantom: '1',
  base: '0.025',
}

export const DrippieDripSizes: Record<
  SupportedMainnetNetworkName | SupportedTestnetNetworkName,
  string
> = {
  ...DrippieDripSizesTestnets,
  ...DrippieDripSizesMainnets,
}

export const fetchCurrencyForNetwork = (chainId: SupportedChainId) => {
  switch (chainId) {
    // mainnet
    case 1:
      return 'ETH'
    // sepolia
    case 11155111:
      return 'ETH'
    // optimism
    case 10:
      return 'ETH'
    // optimism sepolia
    case 11155420:
      return 'ETH'
    // arbitrum
    case 42161:
      return 'ETH'
    // arbitrum sepolia
    case 421614:
      return 'ETH'
    // BNB
    case 56:
      return 'BNB'
    // BNB testnet
    case 97:
      return 'BNB'
    // Gnosis
    case 100:
      return 'xDAI'
    // Chiado
    case 10200:
      return 'xDAI'
    // Polygon
    case 137:
      return 'MATIC'
    // Polygon Mumbai
    case 80001:
      return 'MATIC'
    // Polygon zkEVM Testnet
    case 1101:
      return 'ETH'
    // Polygon zkEVM Mainnet
    case 1442:
      return 'ETH'
    // Linea Mainnet
    case 59144:
      return 'ETH'
    // Linea Testnet
    case 59140:
      return 'ETH'
    case 4002:
      return 'FTM'
    case 250:
      return 'FTM'
    case 43113:
      return 'AVAX'
    case 43114:
      return 'AVAX'
    case 8453:
      return 'ETH'
    case 84532:
      return 'ETH'
    default:
      throw new Error('Unsupported network')
  }
}

export const fetchURLForNetwork = (chainId: SupportedChainId) => {
  if (process.env.RUNNING_LOCALLY === 'true') {
    return `http://127.0.0.1:${42000 + (chainId % 1000)}`
  }

  if (!process.env.ALCHEMY_API_KEY) {
    throw new Error('ALCHEMY_API_KEY key not defined')
  }
  switch (chainId) {
    // mainnet
    case 1:
      return `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    // sepolia
    case 11155111:
      return `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    // optimism
    case 10:
      return `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    // optimism sepolia
    case 11155420:
      return `https://opt-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    // arbitrum sepilia
    case 421614:
      return `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    // arbitrum mainnet
    case 42161:
      return `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    // bnbt
    case 97:
      if (!process.env.BNB_TESTNET_URL) {
        throw new Error('BNB_TESTNET_URL key not defined')
      }
      return process.env.BNB_TESTNET_URL
    case 56:
      if (!process.env.BNB_MAINNET_URL) {
        throw new Error('BNB_MAINNET_URL key not defined')
      }
      return process.env.BNB_MAINNET_URL
    // gnosis chiado
    case 10200:
      if (!process.env.CHIADO_RPC_URL) {
        throw new Error('CHIADO_RPC_URL key not defined')
      }
      return process.env.CHIADO_RPC_URL
    case 100:
      if (!process.env.GNOSIS_MAINNET_URL) {
        throw new Error('GNOSIS_MAINNET_URL key not defined')
      }
      return process.env.GNOSIS_MAINNET_URL
    // polygon mumbai
    case 80001:
      return `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    case 137:
      return `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    case 1101:
      if (!process.env.POLYGON_ZKEVM_MAINNET_URL) {
        throw new Error('POLYGON_ZKEVM_MAINNET_URL key not defined')
      }
      return process.env.POLYGON_ZKEVM_MAINNET_URL
    case 1442:
      if (!process.env.POLYGON_ZKEVM_TESTNET_URL) {
        throw new Error('POLYGON_ZKEVM_TESTNET_URL key not defined')
      }
      return process.env.POLYGON_ZKEVM_TESTNET_URL
    case 59144:
      return `https://linea-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
    case 59140:
      return `https://linea-goerli.infura.io/v3/${process.env.INFURA_API_KEY}`
    case 4002:
      if (!process.env.FANTOM_TESTNET_RPC_URL) {
        throw new Error('FANTOM_TESTNET_RPC_URL key not defined')
      }
      return process.env.FANTOM_TESTNET_RPC_URL
    case 250:
      if (!process.env.FANTOM_MAINNET_RPC_URL) {
        throw new Error('FANTOM_MAINNET_RPC_URL key not defined')
      }
      return process.env.FANTOM_MAINNET_RPC_URL
    case 43113:
      return `https://avalanche-fuji.infura.io/v3/${process.env.INFURA_API_KEY}`
    case 43114:
      return `https://avalanche-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`
    case 8453:
      return `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    case 84532:
      return `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    default:
      throw new Error(`Unsupported chain for id ${chainId}`)
  }
}

export const toSupportedNetworkName = (
  networkName: string
): SupportedNetworkName => {
  if (!isSupportedNetworkName(networkName)) {
    throw new Error(`Network isn't supported: ${networkName}`)
  }
  return networkName
}

export const toSupportedChainId = (chainId: number): SupportedChainId => {
  const network = Object.keys(SUPPORTED_NETWORKS).find(
    (n) => SUPPORTED_NETWORKS[n] === Number(chainId)
  )
  if (!network) {
    throw new Error(`Chain ID isn't supported: ${network}`)
  }
  return chainId as SupportedChainId
}
