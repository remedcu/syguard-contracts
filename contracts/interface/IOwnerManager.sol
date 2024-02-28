// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IOwnerManager {
    function swapOwner(
        address prevOwner,
        address oldOwner,
        address newOwner
    ) external;
}