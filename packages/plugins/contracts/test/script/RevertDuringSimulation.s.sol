// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { ISphinxModule } from "@hujw77/contracts/contracts/core/interfaces/ISphinxModule.sol";
import { Script } from "sphinx-forge-std/Script.sol";
import { Network } from "@hujw77/contracts/contracts/foundry/SphinxPluginTypes.sol";
import { Sphinx } from "@hujw77/contracts/contracts/foundry/Sphinx.sol";
import { RevertDuringSimulation } from "../RevertDuringSimulation.sol";

contract RevertDuringSimulation_Script is Script, Sphinx {
    function configureSphinx() public override {
        sphinxConfig.projectName = "Simple_Project";
    }

    function run() public sphinx {
        RevertDuringSimulation reverter = new RevertDuringSimulation{ salt: 0 }(sphinxModule());
        reverter.revertDuringSimulation();
    }
}
