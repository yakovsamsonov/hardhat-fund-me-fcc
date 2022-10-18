const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { developmentChainIDs } = require("../../helper-hardhat-config")

!developmentChainIDs.includes(network.config.chainId)
    ? describe.skip
    : describe("FundMe", async function() {
          let fundMe
          let deployer
          let mockV3Aggregator
          let accountZero
          const sendValue = ethers.utils.parseEther("1") // "1000000000000000000" // 1 eth
          beforeEach(async function() {
              // run deploy scripts using hardhat-deploy package
              // const accounts = await ethers.getSigners()
              // const accountZero = accounts[0]
              // console.log(network.config.url)
              // const provider = await ethers.getDefaultProvider(network.config.url)

              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["all"])
              // const wallet = new ethers.Wallet(deployer, provider)
              // console.log(wallet.address)
              fundMe = await ethers.getContract("FundMe", deployer)
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })

          describe("constructor", async function() {
              it("sets the aggregator addresses correctly", async function() {
                  const responce = await fundMe.getPriceFeed()
                  assert.equal(responce, mockV3Aggregator.address)
              })

              it("sets contract owner correctly", async function() {
                  const contractOwner = await fundMe.getOwner()
                  assert.equal(contractOwner, deployer)
              })
          })

          /*describe("receive", async function() {
        it("payment transaction to contact saves sender as funder", async function() {
            nonce = await accountZero.getTransactionCount()
            console.log(nonce)
            transaction = {
                to: fundMe.address,
                nonce: nonce,
                value: 10000,
                chainId: network.config.chainId
            }
        })
    })*/

          describe("fund", async function() {
              it("fails if you don't send enough ETH", async function() {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Didn't send enough"
                  )
              })

              it("updated the amount funded data structure", async function() {
                  await fundMe.fund({ value: sendValue })
                  const responce = await fundMe.getAddressToAmountFunded(
                      deployer
                  )
                  assert.equal(responce.toString(), sendValue.toString())
              })

              it("adds funder to list of funders", async function() {
                  await fundMe.fund({ value: sendValue })
                  const funder = await fundMe.getFunder(0)
                  assert.equal(funder, deployer)
              })
          })

          describe("withdraw", async function() {
              beforeEach(async function() {
                  await fundMe.fund({ value: sendValue })
              })

              it("withdraw ETH from single funder", async function() {
                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  const transactionResponce = await fundMe.withdraw()
                  const transactionReciept = await transactionResponce.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })

              it("allows to withdraw with multiple funders", async function() {
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      const fundMeConnectedContract = await fundMe.connect(
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }

                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  const transactionResponce = await fundMe.withdraw()
                  const transactionReciept = await transactionResponce.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  await expect(fundMe.getFunder(0)).to.be.reverted
                  for (i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmountFunded(
                              accounts[i].address
                          ),
                          0
                      )
                  }
              })

              it("only allows owner to withdraw", async function() {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1]
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  )
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotOwner")
              })

              it("cheaper withdraw testing", async function() {
                  const startingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const startingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  const transactionResponce = await fundMe.cheaperWithdraw()
                  const transactionReciept = await transactionResponce.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReciept
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  const endingFundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance = await fundMe.provider.getBalance(
                      deployer
                  )

                  assert.equal(endingFundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )
              })
          })
      })
