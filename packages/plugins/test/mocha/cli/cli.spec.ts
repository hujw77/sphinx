import sinon from 'sinon'
import chai from 'chai'

import { SphinxContext, makeSphinxContext } from '../../../src/cli/context'
import { makeCLI } from '../../../src/cli/setup'
import {
  BothNetworksSpecifiedError,
  ConfirmAndDryRunError,
  getInvalidNetworksArgumentError,
} from '../../../src/cli/utils'

const expect = chai.expect

describe('CLI Commands', () => {
  const scriptPath = 'path/to/Script.s.sol'

  let sphinxContext: SphinxContext
  let exitSpy: sinon.SinonStub
  let consoleErrorSpy: sinon.SinonStub

  beforeEach(() => {
    sphinxContext = makeSphinxContext()

    // Spy on process.exit before each test
    exitSpy = sinon.stub(process, 'exit')
    // Stub console.error to prevent Yargs from logging error messages
    consoleErrorSpy = sinon.stub(console, 'error')
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('propose', () => {
    let proposeSpy: sinon.SinonStub

    beforeEach(() => {
      proposeSpy = sinon.stub(sphinxContext, 'propose')
    })

    it('fails if no script path is included', async () => {
      const args = ['propose', '--networks', 'testnets']

      makeCLI(args, sphinxContext)

      expect(exitSpy.calledWith(1)).to.be.true
      expect(consoleErrorSpy.called).to.be.true
      expect(consoleErrorSpy.firstCall.args[0]).to.include(
        'Not enough non-option arguments: got 0, need at least 1'
      )
    })

    it('fails if both --networks mainnets and --networks testnets are provided', () => {
      const args = [
        'propose',
        scriptPath,
        '--networks',
        'mainnets',
        '--networks',
        'testnets',
      ]

      makeCLI(args, sphinxContext)

      expect(proposeSpy.called).to.be.false
      expect(consoleErrorSpy.called).to.be.true
      expect(consoleErrorSpy.firstCall.args[0]).to.include(
        BothNetworksSpecifiedError
      )
    })

    it('fails if an invalid network is provided', () => {
      const wrongNetwork = 'wrongNetwork'
      const args = ['propose', scriptPath, '--networks', wrongNetwork]

      makeCLI(args, sphinxContext)

      expect(proposeSpy.called).to.be.false
      expect(consoleErrorSpy.called).to.be.true
      expect(consoleErrorSpy.firstCall.args[0]).to.include(
        getInvalidNetworksArgumentError(wrongNetwork)
      )
    })

    it('fails if no --networks is provided', () => {
      const args = ['propose', scriptPath]

      makeCLI(args, sphinxContext)

      expect(proposeSpy.called).to.be.false
      expect(consoleErrorSpy.called).to.be.true
      expect(consoleErrorSpy.firstCall.args[0]).to.include(
        'Missing required argument: networks'
      )
    })

    it('fails if both --confirm and --dry-run are specified', () => {
      const args = [
        'propose',
        scriptPath,
        '--confirm',
        '--dry-run',
        '--networks',
        'testnets',
      ]

      makeCLI(args, sphinxContext)

      expect(exitSpy.calledWith(1)).to.be.true
      expect(consoleErrorSpy.called).to.be.true
      expect(consoleErrorSpy.firstCall.args[0]).to.include(
        ConfirmAndDryRunError
      )
    })

    it('--networks testnets', () => {
      const args = ['propose', scriptPath, '--networks', 'testnets']

      makeCLI(args, sphinxContext)

      expect(proposeSpy.called).to.be.true

      const expectedParams = {
        confirm: false,
        isTestnet: true,
        isDryRun: false,
        silent: false,
        scriptPath,
        sphinxContext: sinon.match.any,
        targetContract: undefined,
      }

      // Assert that the propose function was called with the correct object
      expect(proposeSpy.calledWithMatch(expectedParams)).to.be.true
    })

    it('--networks mainnets', () => {
      const args = ['propose', scriptPath, '--networks', 'mainnets']

      makeCLI(args, sphinxContext)

      const expectedParams = {
        confirm: false,
        isTestnet: false, // Changed to false for mainnets
        isDryRun: false,
        silent: false,
        scriptPath,
        sphinxContext: sinon.match.any,
        targetContract: undefined,
      }

      expect(proposeSpy.calledWithMatch(expectedParams)).to.be.true
    })

    it('--networks mainnets --confirm', () => {
      const args = [
        'propose',
        scriptPath,
        '--networks',
        'mainnets',
        '--confirm',
      ]

      makeCLI(args, sphinxContext)

      const expectedParams = {
        confirm: true, // confirm is true
        isTestnet: false,
        isDryRun: false,
        silent: false,
        scriptPath,
        sphinxContext: sinon.match.any,
        targetContract: undefined,
      }

      expect(proposeSpy.calledWithMatch(expectedParams)).to.be.true
    })

    it('--networks mainnets --target-contract MyContract', () => {
      const args = [
        'propose',
        scriptPath,
        '--networks',
        'mainnets',
        '--target-contract',
        'MyContract',
      ]

      makeCLI(args, sphinxContext)

      const expectedParams = {
        confirm: false,
        isTestnet: false,
        isDryRun: false,
        silent: false,
        scriptPath,
        sphinxContext: sinon.match.any,
        targetContract: 'MyContract', // Specified target contract
      }

      expect(proposeSpy.calledWithMatch(expectedParams)).to.be.true
    })
  })

  describe('deploy', () => {
    let deploySpy: sinon.SinonStub

    beforeEach(() => {
      deploySpy = sinon.stub(sphinxContext, 'deploy')
    })

    it('fails if no script path is included', async () => {
      const args = ['deploy', '--network', 'ethereum']

      makeCLI(args, sphinxContext)

      expect(exitSpy.calledWith(1)).to.be.true
      expect(consoleErrorSpy.called).to.be.true
      expect(consoleErrorSpy.firstCall.args[0]).to.include(
        'Not enough non-option arguments: got 0, need at least 1'
      )
    })

    it('fails if no --network is provided', () => {
      const args = ['deploy', scriptPath]

      makeCLI(args, sphinxContext)

      expect(deploySpy.called).to.be.false
      expect(consoleErrorSpy.called).to.be.true
      expect(consoleErrorSpy.firstCall.args[0]).to.include(
        'Missing required argument: network'
      )
    })

    it('--network ethereum', () => {
      const network = 'ethereum'
      const args = ['deploy', scriptPath, '--network', network]

      makeCLI(args, sphinxContext)

      expect(deploySpy.called).to.be.true

      const expectedParams = {
        scriptPath,
        network,
        skipPreview: false,
        silent: false,
        sphinxContext: sinon.match.any,
        verify: false,
        targetContract: undefined,
      }

      expect(deploySpy.calledWithMatch(expectedParams)).to.be.true
    })

    it('--network ethereum --confirm', () => {
      const args = ['deploy', scriptPath, '--network', 'ethereum', '--confirm']

      makeCLI(args, sphinxContext)

      expect(deploySpy.called).to.be.true

      const expectedParams = {
        scriptPath,
        network: 'ethereum',
        skipPreview: true,
        silent: false,
        sphinxContext: sinon.match.any,
        verify: false,
        targetContract: undefined,
      }

      expect(deploySpy.calledWithMatch(expectedParams)).to.be.true
    })

    it('--network ethereum --target-contract MyContract', () => {
      const args = [
        'deploy',
        scriptPath,
        '--network',
        'ethereum',
        '--target-contract',
        'MyContract',
      ]

      makeCLI(args, sphinxContext)

      expect(deploySpy.called).to.be.true

      const expectedParams = {
        scriptPath,
        network: 'ethereum',
        skipPreview: false,
        silent: false,
        sphinxContext: sinon.match.any,
        verify: false,
        targetContract: 'MyContract',
      }

      expect(deploySpy.calledWithMatch(expectedParams)).to.be.true
    })

    it('--network ethereum --verify', () => {
      const args = ['deploy', scriptPath, '--network', 'ethereum', '--verify']

      makeCLI(args, sphinxContext)

      expect(deploySpy.called).to.be.true

      const expectedParams = {
        scriptPath,
        network: 'ethereum',
        skipPreview: false,
        silent: false,
        sphinxContext: sinon.match.any,
        verify: true,
        targetContract: undefined,
      }

      expect(deploySpy.calledWithMatch(expectedParams)).to.be.true
    })

    it('--network ethereum --silent', () => {
      const args = ['deploy', scriptPath, '--network', 'ethereum', '--silent']

      makeCLI(args, sphinxContext)

      expect(deploySpy.called).to.be.true

      const expectedParams = {
        scriptPath,
        network: 'ethereum',
        skipPreview: false,
        silent: true,
        sphinxContext: sinon.match.any,
        verify: false,
        targetContract: undefined,
      }

      expect(deploySpy.calledWithMatch(expectedParams)).to.be.true
    })
  })
})
