import * as fs from 'fs'
import path from 'path'
import { exec } from 'child_process'

import { execAsync } from '@sphinx/core'
import {
  foundryTestFileName,
  sampleContractFileName,
  sampleConfigFileNameTypeScript,
  hhTestFileNameTypeScript,
} from '@sphinx/plugins'
import { expect } from 'chai'

const configDirPath = 'sphinx'
const deploymentArtifactDir = 'deployments'

describe('Init Task', () => {
  let configPath: string
  let contractPath: string
  let foundryTestPath: string
  let hardhatTestPath: string
  before(async () => {
    const forgeConfigOutput = await execAsync('forge config --json')
    const forgeConfig = JSON.parse(forgeConfigOutput.stdout)
    const { src, test } = forgeConfig

    configPath = path.join(configDirPath, sampleConfigFileNameTypeScript)
    contractPath = path.join(src, sampleContractFileName)
    foundryTestPath = path.join(test, foundryTestFileName)

    hardhatTestPath = path.join(test, hhTestFileNameTypeScript)
  })

  beforeEach(async () => {
    // Start an Anvil node, which is required for the deployment tests
    exec(`anvil --silent &`)
  })

  afterEach(async () => {
    // Kill the Anvil node
    await execAsync(`kill $(lsof -t -i:8545)`)

    // Delete all of the generated files

    fs.rmSync(configPath)
    fs.rmSync(contractPath)

    if (fs.existsSync(foundryTestPath)) {
      fs.rmSync(foundryTestPath)
    }

    if (fs.existsSync(hardhatTestPath)) {
      fs.rmSync(hardhatTestPath)
    }

    if (fs.existsSync(deploymentArtifactDir)) {
      fs.rmSync(deploymentArtifactDir, { recursive: true, force: true })
    }
  })

  it('Succeeds for a sample Foundry project with a TypeScript Sphinx config', async () => {
    const deploymentArtifactOne = path.join(
      deploymentArtifactDir,
      'anvil',
      'ContractOne.json'
    )
    const deploymentArtifactTwo = path.join(
      deploymentArtifactDir,
      'anvil',
      'ContractTwo.json'
    )

    // Check that the sample files haven't been created yet
    expect(fs.existsSync(configPath)).to.be.false
    expect(fs.existsSync(contractPath)).to.be.false
    expect(fs.existsSync(foundryTestPath)).to.be.false

    await execAsync('npx sphinx init --ts')

    // Check that the files have been created
    expect(fs.existsSync(configPath)).to.be.true
    expect(fs.existsSync(contractPath)).to.be.true
    expect(fs.existsSync(foundryTestPath)).to.be.true

    // Next, we'll run the test and deployment. If a Foundry test case fails, or if there's some
    // other error that occurs when running either command, this test case will also fail.
    await execAsync(`forge test`)

    // Check that the deployment artifacts haven't been created yet
    expect(fs.existsSync(deploymentArtifactOne)).to.be.false
    expect(fs.existsSync(deploymentArtifactTwo)).to.be.false

    await execAsync(
      `npx sphinx deploy --confirm --config ${configPath} --broadcast --rpc http://localhost:8545 ` +
        `--private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
    )

    // Check that the deployment artifacts have been created
    expect(fs.existsSync(deploymentArtifactOne)).to.be.true
    expect(fs.existsSync(deploymentArtifactTwo)).to.be.true
  })

  it('Succeeds for a sample Hardhat project with a TypeScript Sphinx config', async () => {
    const deploymentArtifactOne = path.join(
      deploymentArtifactDir,
      'hardhat',
      'ContractOne.json'
    )
    const deploymentArtifactTwo = path.join(
      deploymentArtifactDir,
      'hardhat',
      'ContractTwo.json'
    )

    // Check that the sample files haven't been created yet
    expect(fs.existsSync(configPath)).to.be.false
    expect(fs.existsSync(contractPath)).to.be.false
    expect(fs.existsSync(hardhatTestPath)).to.be.false

    // This command infers that we're using a TypeScript project based on the fact that we have a
    // hardhat.config.ts (instead of .js).
    await execAsync('npx hardhat sphinx-init')

    // Check that the files have been created
    expect(fs.existsSync(configPath)).to.be.true
    expect(fs.existsSync(contractPath)).to.be.true
    expect(fs.existsSync(hardhatTestPath)).to.be.true

    // Check that the deployment artifacts haven't been created yet
    expect(fs.existsSync(deploymentArtifactOne)).to.be.false
    expect(fs.existsSync(deploymentArtifactTwo)).to.be.false

    // Next, we'll run the test and script files. If a Hardhat test case fails, or if there's some
    // other error that occurs when running either command, this test case will also fail.
    await execAsync(
      `npx hardhat test ${hardhatTestPath} --config-path ${configPath} --signer 0`
    )
    await execAsync(
      `npx hardhat sphinx-deploy --confirm --config-path ${configPath} --network localhost --signer 0`
    )

    // Check that the deployment artifacts have been created
    expect(fs.existsSync(deploymentArtifactOne)).to.be.true
    expect(fs.existsSync(deploymentArtifactTwo)).to.be.true
  })
})