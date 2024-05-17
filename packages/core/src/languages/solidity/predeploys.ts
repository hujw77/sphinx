import { assert } from 'console'

import { AbiCoder, Contract, ZeroHash, ethers } from 'ethers'
import {
  DETERMINISTIC_DEPLOYMENT_PROXY_ADDRESS,
  DrippieArtifact,
  ManagedServiceArtifact,
  OWNER_MULTISIG_ADDRESS,
  getCheckBalanceLowAddress,
  getDrippieAddress,
  getManagedServiceAddress,
  getOwnerAddress,
  getSphinxConstants,
} from '@hujw77/contracts'
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider'
import ora from 'ora'

import {
  isContractDeployed,
  getGasPriceOverrides,
  isLiveNetwork,
  getImpersonatedSigner,
  fundAccountMaxBalance,
} from '../../utils'
import { SphinxJsonRpcProvider } from '../../provider'
import { ExecutionMode, RELAYER_ROLE } from '../../constants'
import {
  fetchDripSizeForNetwork,
  fetchDripVersionForNetwork,
  fetchDecimalsForNetwork,
} from '../../networks'

export const ensureSphinxAndGnosisSafeDeployed = async (
  provider: SphinxJsonRpcProvider | HardhatEthersProvider,
  wallet: ethers.Wallet,
  executionMode: ExecutionMode,
  includeManagedServiceRoles: boolean,
  relayers: string[] = [],
  spinner?: ora.Ora
) => {
  if (
    executionMode === ExecutionMode.LocalNetworkCLI ||
    executionMode === ExecutionMode.Platform
  ) {
    // Fund the wallet to ensure that it has enough funds to deploy the contracts.
    await fundAccountMaxBalance(wallet.address, provider)
  }

  await deploySphinxSystem(
    provider,
    wallet,
    relayers,
    executionMode,
    includeManagedServiceRoles,
    spinner
  )
}

export const cancelPreviousDripVersions = async (
  Drippie: Contract,
  provider: SphinxJsonRpcProvider | HardhatEthersProvider,
  wallet: ethers.Signer,
  executionMode: ExecutionMode,
  dripName: string,
  currentDripVersion: number,
  spinner?: ora.Ora
) => {
  if (currentDripVersion === 0) {
    return
  } else {
    for (let version = 0; version < currentDripVersion; version++) {
      const previousDripName =
        version === 0 ? dripName : `${dripName}_${version}`

      // Cancel drip if not archived
      const [status] = await Drippie.drips(previousDripName)
      if (status !== BigInt(3) && status !== BigInt(0)) {
        spinner?.start(`Archiving outdated drip: ${previousDripName}...`)
        if (status !== BigInt(1)) {
          await (
            await Drippie.status(
              previousDripName,
              1,
              await getGasPriceOverrides(provider, wallet, executionMode)
            )
          ).wait()
        }

        await (
          await Drippie.status(
            previousDripName,
            3,
            await getGasPriceOverrides(provider, wallet, executionMode)
          )
        ).wait()

        spinner?.succeed(
          `Finished archiving outdated drip: ${previousDripName}`
        )
      }
    }
  }
}

export const checkSystemDeployed = async (
  provider: SphinxJsonRpcProvider | HardhatEthersProvider
): Promise<boolean> => {
  const contracts = getSphinxConstants()

  // Create an array of promises for each contract's code
  const codePromises = contracts.map(({ expectedAddress }) =>
    provider.getCode(expectedAddress)
  )

  // Resolve all promises in parallel
  const codes = await Promise.all(codePromises)

  // Check if any code is '0x', indicating the contract is not deployed
  return codes.every((code) => code !== '0x')
}

export const assignManagedServiceRoles = async (
  provider: SphinxJsonRpcProvider | HardhatEthersProvider,
  signer: ethers.Signer,
  relayers: string[],
  executionMode: ExecutionMode,
  spinner?: ora.Ora
) => {
  // Next, we get the owner address, which differs depending on the situation:
  // 1. If the owner is the multisig and we're deploying on a test node then we can use an impersonated signer.
  // 2. If the owner is the multisig and we're deploying on a live network then we have to use the gnosis safe ethers adapter (which we have not implemented yet).
  // 3. We also allow the user to specify a different owner via process.env.SPHINX_INTERNAL__OWNER_PRIVATE_KEY. This is useful for testing on live networks without using the multisig.
  //    In this case, we need to create a signer using the SPHINX_INTERNAL__OWNER_PRIVATE_KEY and use that.
  let owner: ethers.Signer

  // If deploying on a live network and the target owner is the multisig, then throw an error because
  // we have not setup the safe ethers adapter yet.
  const isLiveNetwork_ = await isLiveNetwork(provider)
  if (isLiveNetwork_ && getOwnerAddress() === OWNER_MULTISIG_ADDRESS) {
    if (!process.env.SPHINX_INTERNAL__OWNER_PRIVATE_KEY) {
      throw new Error('Must define SPHINX_INTERNAL__OWNER_PRIVATE_KEY')
    }

    owner = new ethers.Wallet(
      process.env.SPHINX_INTERNAL__OWNER_PRIVATE_KEY!,
      provider
    )
  } else {
    // if target owner is multisig, then use an impersonated multisig signer
    if (getOwnerAddress() === OWNER_MULTISIG_ADDRESS) {
      owner = await getImpersonatedSigner(OWNER_MULTISIG_ADDRESS, provider)
    } else {
      // if target owner is not multisig, then use the owner signer
      // SPHINX_INTERNAL__OWNER_PRIVATE_KEY will always be defined if the OWNER_ADDRESS is not the OWNER_MULTISIG_ADDRESS
      owner = new ethers.Wallet(
        process.env.SPHINX_INTERNAL__OWNER_PRIVATE_KEY!,
        provider
      )
    }

    if (!isLiveNetwork_) {
      // Fund the signer
      await (
        await signer.sendTransaction({
          to: await owner.getAddress(),
          value: ethers.parseEther('1'),
        })
      ).wait()
    }
  }

  const ManagedService = new ethers.Contract(
    getManagedServiceAddress(),
    ManagedServiceArtifact.abi,
    owner
  )

  spinner?.start('Assigning relayers roles...')
  for (const relayer of relayers) {
    if ((await ManagedService.hasRole(RELAYER_ROLE, relayer)) === false) {
      await (
        await ManagedService.grantRole(
          RELAYER_ROLE,
          relayer,
          await getGasPriceOverrides(provider, owner, executionMode)
        )
      ).wait()
    }
  }
  spinner?.succeed('Finished assigning relayers roles')

  const Drippie = new ethers.Contract(
    getDrippieAddress(),
    DrippieArtifact.abi,
    owner
  )

  spinner?.start('Creating relayer drips...')
  for (const relayer of relayers) {
    const chainId = (await provider.getNetwork()).chainId

    const currentDripVersion = fetchDripVersionForNetwork(chainId)
    const baseDripName = `sphinx_fund_${relayer}`
    const dripName =
      baseDripName + (currentDripVersion > 0 ? `_${currentDripVersion}` : '')

    const reentrant = false
    const interval = 1
    const dripcheck = getCheckBalanceLowAddress()
    const checkparams = AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256'],
      [
        relayer,
        ethers.parseEther(fetchDripSizeForNetwork(chainId)) * BigInt(10),
      ]
    )
    const actions = [
      {
        target: relayer,
        data: ZeroHash,
        value: ethers.parseUnits(
          fetchDripSizeForNetwork(chainId),
          fetchDecimalsForNetwork(chainId)
        ),
      },
    ]

    const [status] = await Drippie.drips(dripName)
    if (status === BigInt(2)) {
      spinner?.info(`Drip ${dripName} already exists`)
    } else if (status === BigInt(0)) {
      spinner?.start(`Creating drip ${dripName}...`)
      await (
        await Drippie.create(
          dripName,
          {
            reentrant,
            interval,
            dripcheck,
            checkparams,
            actions,
          },
          await getGasPriceOverrides(provider, owner, executionMode)
        )
      ).wait()
      await (
        await Drippie.status(
          dripName,
          2,
          await getGasPriceOverrides(provider, owner, executionMode)
        )
      ).wait()
    } else if (status === BigInt(1)) {
      spinner?.start(`Setting status for drip ${dripName}...`)
      await (
        await Drippie.status(
          dripName,
          2,
          await getGasPriceOverrides(provider, owner, executionMode)
        )
      ).wait()
      spinner?.succeed(`Finished setting status for drip ${dripName}`)
    } else {
      throw new Error(`Drip ${dripName} has archived status`)
    }
  }
  spinner?.succeed('Finished creating relayer drips')
}

export const deploySphinxSystem = async (
  provider: SphinxJsonRpcProvider | HardhatEthersProvider,
  signer: ethers.Signer,
  relayers: string[],
  executionMode: ExecutionMode,
  includeManagedServiceRoles: boolean,
  spinner?: ora.Ora
): Promise<void> => {
  const block = await provider.getBlock('latest')
  if (!block) {
    throw new Error('Failed to get latest block.')
  }

  for (const {
    artifact,
    constructorArgs,
    expectedAddress,
  } of getSphinxConstants()) {
    const { abi, bytecode, contractName } = artifact

    spinner?.start(`Deploying ${contractName}...`)

    const contract = await doDeterministicDeploy(provider, executionMode, {
      signer,
      contract: {
        abi,
        bytecode,
      },
      args: constructorArgs,
      salt: ethers.ZeroHash,
    })

    const addr = await contract.getAddress()
    assert(addr === expectedAddress, `address mismatch for ${contractName}`)

    spinner?.succeed(`Deployed ${contractName}, ${await contract.getAddress()}`)
  }

  spinner?.succeed(`Finished deploying Sphinx contracts`)

  if (includeManagedServiceRoles) {
    await assignManagedServiceRoles(
      provider,
      signer,
      relayers,
      executionMode,
      spinner
    )
  }
}

export const getDeterministicFactoryAddress = async (
  provider: SphinxJsonRpcProvider | HardhatEthersProvider
) => {
  // Deploy the deterministic deployer.
  if (
    (await isContractDeployed(
      DETERMINISTIC_DEPLOYMENT_PROXY_ADDRESS,
      provider
    )) === false
  ) {
    const sender = '0x3fab184622dc19b6109349b94811493bf2a45362'

    // Try to fund the sender account. Will work if we're running against a local hardhat node. If
    // we're not running against hardhat then this will fail silently. We'll just need to try the
    // deployment and see if the sender has enough funds to pay for the deployment.
    try {
      await provider.send('hardhat_setBalance', [
        sender,
        '0xFFFFFFFFFFFFFFFFFFFFFF',
      ])
    } catch {
      // Ignore.
    }

    // Send the raw deployment transaction for the deterministic deployer.
    try {
      const txnHash = await provider.send('eth_sendRawTransaction', [
        '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222',
      ])
      const txn = await provider.getTransaction(txnHash)
      if (!txn) {
        throw new Error(`Failed to deploy CREATE2 factory.`)
      }
      await txn.wait()
    } catch (err) {
      if (err.message.includes('insufficient balance')) {
        throw new Error(
          `insufficient balance to deploy deterministic deployer, please fund the sender: ${sender}`
        )
      } else {
        throw err
      }
    }
  }

  return DETERMINISTIC_DEPLOYMENT_PROXY_ADDRESS
}

export const doDeterministicDeploy = async (
  provider: SphinxJsonRpcProvider | HardhatEthersProvider,
  executionMode: ExecutionMode,
  options: {
    contract: {
      abi: any
      bytecode: string
    }
    salt: string
    signer: ethers.Signer
    args?: any[]
  }
): Promise<ethers.Contract> => {
  const factory = new ethers.ContractFactory(
    options.contract.abi,
    options.contract.bytecode
  )
  const deployer = await getDeterministicFactoryAddress(provider)

  const deploymentTx = await factory.getDeployTransaction(
    ...(options.args || [])
  )
  if (deploymentTx.data === undefined) {
    throw new Error(`Deployment transaction data is undefined`)
  }

  const address = ethers.getCreate2Address(
    deployer,
    options.salt,
    ethers.keccak256(deploymentTx.data)
  )

  // Short circuit if already deployed.
  if (await isContractDeployed(address, provider)) {
    return new ethers.Contract(address, options.contract.abi, options.signer)
  }

  // Create a transaction request with gas price overrides.
  const txnRequest = await getGasPriceOverrides(
    provider,
    options.signer,
    executionMode,
    {
      to: deployer,
      data: options.salt + ethers.toBeHex(deploymentTx.data).slice(2),
    }
  )

  // Deploy the contract.
  await (await options.signer.sendTransaction(txnRequest)).wait()

  if ((await isContractDeployed(address, provider)) === false) {
    throw new Error(`failed to deploy contract at ${address}`)
  }

  return new ethers.Contract(address, options.contract.abi, options.signer)
}
