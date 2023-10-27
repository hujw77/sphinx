// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {
    SphinxConfig,
    Network,
    DeployOptions,
    Version
} from "@sphinx-labs/plugins/SphinxPluginTypes.sol";
import { SphinxClient } from "../client/SphinxClient.sol";
import { MaxArgs } from "../contracts/test/MaxArgs.sol";

/**
 * @title MaxArgsConfiguration
 * @dev Configuration script testing that we do not impose any additional restrictions on
 *      the number of input arguments you can use without triggering a stack too deep error.

 * @dev The maximum number of input arguments for a constructor or external function to not cause
 *      a stack too deep error is 11 (regardless of the use of our system). For internal functions,
 *      that number is higher because they are called inline and therefore do not use the stack.
 *      As a result, the maximum number of input args for an internal function is at least 12.
 *      Since we define all functions on the generated SphinxClient as internal, we run into no
 *      issue with the number of input arguments even when using our additional DeployOptions argument.
 *
 * Tests:
 *      - Deploying a contract with 11 input arguments
 *      - Calling a function with 11 input arguments
 */
contract MaxArgsConfiguration is SphinxClient {
    MaxArgs maxArgs;

    constructor() {
        sphinxConfig.projectName = "MaxArgs";
        sphinxConfig.owners = [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266];
        sphinxConfig.mainnets = [Network.ethereum];
        sphinxConfig.testnets = [Network.goerli];
        sphinxConfig.threshold = 1;
    }

    function run() public override sphinx {
        maxArgs = deployMaxArgs(
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            DeployOptions({ salt: bytes32(0), referenceName: "MyMaxArgs" })
        );
        maxArgs.addValues(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
    }
}