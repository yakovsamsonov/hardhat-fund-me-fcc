// 12.26.21

// SPDX-License-Identifier: MIT
// {Style} Pragma
pragma solidity ^0.8.8;

// {Style} Import
import "./PriceConverter.sol";

// {Style} Error Code
error FundMe__NotOwner();

// {Style} Interfaces, Libraries, Contracts

/// @title A contract for croud funding
/// @author Yakov Samsonov
/// @notice This contract is to demo simple funding contracts
/// @dev This implements price feed as our library

contract FundMe {
    // {Style} Type declarations
    using PriceConverter for uint256;

    // {Style} State variables
    uint256 public constant MINIMUM_USD = 50 * 1e18;

    AggregatorV3Interface private immutable i_priceFeed;
    address private immutable i_owner;
    address[] private s_funders;
    mapping(address => uint256) private s_addressToAmountFunded;

    // {Style} Events

    // {Style} Modifiers
    modifier onlyOwner() {
        // require(msg.sender == i_owner, "Sender is not owner");
        if (msg.sender != i_owner) {
            revert FundMe__NotOwner();
        } //more gas effecient
        _;
    }

    // {Style} Functions
    constructor(address priceFeedAddress) {
        i_owner = msg.sender;
        i_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    /// @notice This function funds contract
    /// @dev This implements price feed as our library
    /* @param name description */
    /* @return name description */
    function fund() public payable {
        // Want to be able to set a minimum fund amount in USD
        // 1. How do we send ETH to this contract?
        require(
            msg.value.getConversionRate(i_priceFeed) >= MINIMUM_USD,
            "Didn't send enough"
        ); // 1e18 == 1 * 10 ** 18 == 1 ETH
        s_funders.push(msg.sender);
        s_addressToAmountFunded[msg.sender] = msg.value;
        // 18 decimals
    }

    function withdraw() public onlyOwner {
        /* starting index, ending index, step amount */
        for (
            uint256 funderIndex = 0;
            funderIndex < s_funders.length;
            funderIndex++
        ) {
            address funder = s_funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        // reset the array
        s_funders = new address[](0);

        //withdraw funds
        //transfer throws exception if above gas limit 2300
        //transfer works only with payable addresses
        //payable(msg.sender).transfer(address(this).balance);

        //send returns bool
        //bool sendSuccess = payable(msg.sender).send(address(this).balance);
        //require(sendSuccess, "Send failed");

        //call
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function cheaperWithdraw() public onlyOwner {
        address[] memory funders = s_funders;
        // mappings can't be in memory for now in Solidity
        for (
            uint256 funderIndex = 0;
            funderIndex < funders.length;
            funderIndex++
        ) {
            address funder = funders[funderIndex];
            s_addressToAmountFunded[funder] = 0;
        }
        s_funders = new address[](0);

        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call failed");
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getFunder(uint256 index) public view returns (address) {
        return s_funders[index];
    }

    function getAddressToAmountFunded(address funder)
        public
        view
        returns (uint256)
    {
        return s_addressToAmountFunded[funder];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return i_priceFeed;
    }
}
