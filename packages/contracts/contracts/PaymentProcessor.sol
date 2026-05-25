// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentProcessor is Ownable {
    using SafeERC20 for IERC20;

    address public merchant;
    mapping(address token => bool accepted) public acceptedTokens;

    event MerchantUpdated(address indexed merchant);
    event TokenAcceptanceUpdated(address indexed token, bool accepted);
    event PaymentReceived(
        bytes32 indexed orderId,
        address indexed payer,
        address indexed token,
        uint256 amount
    );

    constructor(address initialOwner, address initialMerchant) Ownable(initialOwner) {
        require(initialMerchant != address(0), "INVALID_MERCHANT");
        merchant = initialMerchant;
    }

    function setMerchant(address newMerchant) external onlyOwner {
        require(newMerchant != address(0), "INVALID_MERCHANT");
        merchant = newMerchant;
        emit MerchantUpdated(newMerchant);
    }

    function setAcceptedToken(address token, bool accepted) external onlyOwner {
        require(token != address(0), "INVALID_TOKEN");
        acceptedTokens[token] = accepted;
        emit TokenAcceptanceUpdated(token, accepted);
    }

    function payOrder(bytes32 orderId, address token, uint256 amount) external {
        require(orderId != bytes32(0), "INVALID_ORDER");
        require(acceptedTokens[token], "TOKEN_NOT_ACCEPTED");
        require(amount > 0, "INVALID_AMOUNT");

        IERC20(token).safeTransferFrom(msg.sender, merchant, amount);
        emit PaymentReceived(orderId, msg.sender, token, amount);
    }
}
