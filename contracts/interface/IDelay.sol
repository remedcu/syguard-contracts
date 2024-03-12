// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0;

import {Enum} from "@gnosis.pm/zodiac/contracts/core/Modifier.sol";

interface IDelay {
    event DelaySetup(
        address indexed initiator,
        address indexed owner,
        address indexed avatar,
        address target
    );
    event TxCooldownSet(uint256 cooldown);
    event TxExpirationSet(uint256 expiration);
    event TxNonceSet(uint256 nonce);
    event TransactionAdded(
        uint256 indexed queueNonce,
        bytes32 indexed txHash,
        address to,
        uint256 value,
        bytes data,
        Enum.Operation operation
    );

    function txCooldown() external view returns (uint256);
    function txExpiration() external view returns (uint256);
    function txNonce() external view returns (uint256);
    function queueNonce() external view returns (uint256);
    function txHash(uint256) external view returns (bytes32);
    function txCreatedAt(uint256) external view returns (uint256);

    function setTxCooldown(uint256 _txCooldown) external;
    function setTxExpiration(uint256 _txExpiration) external;
    function setTxNonce(uint256 _txNonce) external;
    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    ) external returns (bool success);
    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    ) external returns (bool success, bytes memory returnData);
    function executeNextTx(
        address to,
        uint256 value,
        bytes calldata data,
        Enum.Operation operation
    ) external;
    function skipExpired() external;
    function getTransactionHash(
        address to,
        uint256 value,
        bytes memory data,
        Enum.Operation operation
    ) external pure returns (bytes32);
    function getTxHash(uint256 _nonce) external view returns (bytes32);
    function getTxCreatedAt(uint256 _nonce) external view returns (uint256);
}
