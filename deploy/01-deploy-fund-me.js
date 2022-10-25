// Below are 3 different ways to define deployment function

//------------------------
// 1.
// function deployFunc() {
//     console.log("Hi")
// }

// module.exports.default = deployFunc

//------------------------
// 2.
// module.exports = async (hre) => {
//    const { getNamedAccounts, deployments } = hre
//    // hre.getNamedAccounts
//    // hre.deployments
//}

//------------------------
// 3.

const {
    networkConfig,
    developmentChainIDs
} = require("../helper-hardhat-config")
const { network } = require("hardhat")
const { verify } = require("../utils/verify")

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId
    log(`Connected to network: ${network.name}`)
    let ethUsdPriceFeedAddress
    if (developmentChainIDs.includes(chainId)) {
        const ethUsdAggregatorContract = await deployments.get(
            "MockV3Aggregator"
        )
        ethUsdPriceFeedAddress = ethUsdAggregatorContract.address
        log("Using MockV3Aggregator")
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
        log(`Using price feed at ${ethUsdPriceFeedAddress}`)
    }

    const args = [ethUsdPriceFeedAddress]

    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, // put here constructor parameters
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1
    })
    log("______________________________________________")

    if (!developmentChainIDs.includes(chainId) && ETHERSCAN_API_KEY) {
        await verify(fundMe.address, args)
    }
}

module.exports.tags = ["all", "fundme"]
