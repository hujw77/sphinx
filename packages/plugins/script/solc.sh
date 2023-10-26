#!/bin/bash

# This setting ensures that this script will exit if any subsequent command in this script fails.
# Without this, the CI process will pass even if tests in this script fail.
set -e

# This script compiles the prod contracts in our Foundry plugin using the lowest solc version that
# we support, v0.8.0. Without this, it'd be possible for us to accidentally write contracts that
# don't compile with this Solidity version. We don't compile with the earliest version by default
# because we use certain features in our test suite that are only available in newer versions.
forge build --use '0.8.0' --contracts contracts/foundry --skip test --skip script

# This script compiles the prod contracts in our Foundry plugin using the optimizer. Since the
# optimizer is off in our repo by default, this ensures that we don't release contracts that lead to
# a "Stack too deep" error. It may be possible that there's never a scenario in which a "stack too
# deep" error will occur with the optimizer enabled, but not when it's disabled. However, we don't
# want to take that risk, so we check both cases just to be safe.
forge build --optimize --optimizer-runs 200 --contracts contracts/foundry --skip test --skip script
