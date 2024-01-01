// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { console } from "sphinx-forge-std/console.sol";
import { Vm } from "sphinx-forge-std/Vm.sol";
import { Script } from "sphinx-forge-std/Script.sol";
import { Test } from "sphinx-forge-std/Test.sol";

import { Network, DeployOptions, NetworkInfo, OptionalAddress, SphinxMerkleTree, SphinxConfig, Version, HumanReadableAction } from "@sphinx-labs/contracts/contracts/foundry/SphinxPluginTypes.sol";
import { MyContract1, MyOwnable } from "../../contracts/test/MyContracts.sol";
import { SphinxConstants } from "@sphinx-labs/contracts/contracts/foundry/SphinxConstants.sol";
import { SphinxTestUtils } from "../../contracts/test/SphinxTestUtils.sol";
import { SphinxUtils } from "@sphinx-labs/contracts/contracts/foundry/SphinxUtils.sol";
import { Sphinx } from "../../contracts/foundry/Sphinx.sol";
import { GnosisSafe } from "@sphinx-labs/contracts/node_modules/@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import { ISphinxModule } from "@sphinx-labs/contracts/contracts/core/interfaces/ISphinxModule.sol";
import { MerkleRootStatus } from "@sphinx-labs/contracts/contracts/core/SphinxDataTypes.sol";

/**
 * @notice Tests the proposal logic for the Sphinx plugin.
 */
abstract contract AbstractProposal_Test is Sphinx, Test, SphinxConstants {

    address finalOwner = address(0x200);

    SphinxTestUtils testUtils;
    SphinxUtils sphinxUtils;

    Network[] initialTestnets = [Network.arbitrum_sepolia, Network.optimism_sepolia];
    string[] initialTestnetNames = ["arbitrum_sepolia", "optimism_sepolia"];

    MyOwnable ownable;

    GnosisSafe safe;
    ISphinxModule module;

    address proposer = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65;

    constructor() {
        sphinxUtils = new SphinxUtils();
        vm.makePersistent(address(sphinxUtils));

        sphinxConfig.projectName = "Multisig project";
        // Accounts #0-3 on Anvil
        sphinxConfig.owners = [
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266,
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            0x90F79bf6EB2c4f870365E785982E1f101E93b906
        ];
        // Account #4 on Anvil
        sphinxConfig.threshold = 3;
        sphinxConfig.testnets = initialTestnets;
        sphinxConfig.orgId = "1111";

        testUtils = new SphinxTestUtils();
        vm.makePersistent(address(testUtils));

        safe = GnosisSafe(payable(sphinxSafe()));
        module = ISphinxModule(sphinxModule());

        bytes memory initCode = abi.encodePacked(type(MyOwnable).creationCode, abi.encode(address(safe), 500));

        // We must set the address here because the `run` function is not called in this process.
        // Instead, it's called during the collection phase, which occurs in a separate process
        // that's invoked by TypeScript before this process is executed.
        ownable = MyOwnable(computeCreate2Address(bytes32(0), keccak256(initCode), CREATE2_FACTORY));
    }

    function assertSafeInitialized() internal {
        address[] memory owners = safe.getOwners();
        assertEq(owners.length, sphinxConfig.owners.length, "Incorrect number of owners");
        for (uint j = 0; j < sphinxConfig.owners.length; j++) {
            assertTrue(safe.isOwner(sphinxConfig.owners[j]), "missing owner");
        }
        assertEq(
            address(module.safeProxy()),
            address(safe),
            "safe address in module is not correct"
        );
        assertEq(
            safe.isModuleEnabled(address(module)),
            true,
            "module is not enabled"
        );
    }

    function assertMerkleRootCompleted(uint256 _expectedNumLeaves, bytes32 _activeRoot, string memory _configUri) internal {
        (
            uint256 numLeaves,
            uint256 leavesExecuted,
            string memory uri,
            address executor,
            MerkleRootStatus status,
            bool arbitraryChain
        ) = module.merkleRootStates(_activeRoot);
        assertEq(uint8(status), uint8(MerkleRootStatus.COMPLETED), "status is not COMPLETED");
        assertEq(numLeaves, _expectedNumLeaves, "numLeaves is incorrect");
        assertEq(leavesExecuted, numLeaves, "leavesExecuted is incorrect");
        assertEq(uri, _configUri, "uri is incorrect");
        assertEq(executor, managedServiceAddress);
        assertEq(module.activeMerkleRoot(), bytes32(0), "activeRoot is incorrect");
        assertFalse(arbitraryChain);
    }

    function initialDeployment() internal {
        new MyOwnable{ salt: bytes32(0) }(address(safe), 500);
        ownable.set(8);
        ownable.increment();
        ownable.increment();
        ownable.transferOwnership(finalOwner);
    }
}

/**
 * @notice Tests a proposal for a project that has not been deployed on any network yet.
 */
contract Proposal_Initial_Test is AbstractProposal_Test, Script {

    // This is called by our TypeScript logic. It's not called in the Forge test.
    function run() public override virtual sphinx {
        initialDeployment();
    }

    function test_initial_proposal() public {
        bytes32 root = vm.envBytes32("ROOT");
        string memory configUri = vm.envString("CONFIG_URI");

        this.sphinxSimulateProposal({
            _networkNames: initialTestnetNames,
            _simulationInputsFilePath: vm.envString("SIMULATION_INPUTS_FILE_PATH")
        });
        uint8[2] memory forkIds = [0, 1];

        assertEq(forkIds.length, sphinxConfig.testnets.length);
        assertEq(sphinxConfig.testnets.length, 2);

        for (uint256 i = 0; i < sphinxConfig.testnets.length; i++) {
            Network network = sphinxConfig.testnets[i];
            vm.selectFork(forkIds[i]);

            // Check that we're on the correct network. In other words, check that the active fork's
            // chain ID matches the expected testnet's chain ID.
            assertEq(block.chainid, sphinxUtils.getNetworkInfo(network).chainId);

            assertSafeInitialized();

            // Six leaves were executed: `approve`, deploy `MyOwnable`, and `ownable.set`, `ownable.increment` x 2, `ownable.transferOwnership`
            assertMerkleRootCompleted(6, root, configUri);

            // Check that the contract was deployed correctly.
            assertEq(ownable.value(), 10);
            assertEq(ownable.owner(), finalOwner);
        }
    }
}

/**
 * @notice Tests a proposal for a project that was previously deployed. In this test, a contract
 *         is added to the project, then a new proposal is created. This occurs
 *         on the same networks that the project was previously deployed on.
 */
contract Proposal_AddContract_Test is AbstractProposal_Test, Script {

    MyContract1 myNewContract;

    function setUp() public {
        // We must set the address here because the `run` function is not called during the test.
        // Instead, it's called during the collection phase, which occurs in a separate process
        // that's invoked by TypeScript before the test is executed.
        bytes memory initCode = abi.encodePacked(type(MyContract1).creationCode, abi.encode(5, 6, address(7), address(8)));
        myNewContract = MyContract1(computeCreate2Address(bytes32(0), keccak256(initCode), CREATE2_FACTORY));
    }

    function run() public override sphinx {
        new MyContract1{ salt: bytes32(0) }(5, 6, address(7), address(8));
    }

    function test_add_contract_between_proposals() external {
        bytes32 root = vm.envBytes32("ROOT");
        this.sphinxSimulateProposal({
            _networkNames: initialTestnetNames,
            _simulationInputsFilePath: vm.envString("SIMULATION_INPUTS_FILE_PATH")
        });
        uint8[2] memory forkIds = [0, 1];
        string memory configUri = vm.envString("CONFIG_URI");

        assertEq(forkIds.length, sphinxConfig.testnets.length, "incorrect number of forks");
        assertEq(sphinxConfig.testnets.length, 2, "incorrect number of testnets");

        for (uint256 i = 0; i < forkIds.length; i++) {
            vm.selectFork(forkIds[i]);

            // Check that we're on the correct network. In other words, check that the active fork's
            // chain ID matches the expected testnet's chain ID.
            assertEq(block.chainid, sphinxUtils.getNetworkInfo(sphinxConfig.testnets[i]).chainId);

            // Two leaves were executed: `approve` and deploy `MyContract1`
            assertMerkleRootCompleted(2, root, configUri);

            // Check that the contract was deployed correctly.
            assertEq(myNewContract.intArg(), 5, "intArg incorrect");
            assertEq(myNewContract.uintArg(), 6, "uintArg incorrect");
            assertEq(myNewContract.addressArg(), address(7), "addressArg incorrect");
            assertEq(myNewContract.otherAddressArg(), address(8), "otherAddressArg incorrect");
        }
    }
}
