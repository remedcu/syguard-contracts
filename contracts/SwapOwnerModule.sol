// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Module, Enum} from "@gnosis.pm/zodiac/contracts/core/Module.sol";
import {IOwnerManager} from "./interface/IOwnerManager.sol";
import {IDelay} from "./interface/IDelay.sol";

contract SwapOwnerModule is Module {
    event SwapOwnerSetup(
        address indexed initiator,
        address indexed owner,
        address indexed avatar,
        address target
    );
    event SwapOwner(address indexed oldOwner, address indexed newOwner);
    mapping(uint256 => uint256) public swapNonceToDelayQueueNonce;
    uint256 public swapTxNonce;

    /// @param _avatar Address of the avatar (e.g. a Gnosis Safe) Avatars must expose an interface like IAvatar.sol.
    /// @param _target Address of the contract that will call execTransactionFromModule function (Delay modifier)
    /// @param _owner Address of the owner
    constructor(address _target, address _avatar, address _owner) {
        bytes memory initParams = abi.encode(_target, _avatar, _owner);
        setUp(initParams);
    }

    /// @notice Public setup function to allow deployment via factory / proxy pattern
    /// @param initializeParams ABI encoded parameters (see constructor)
    function setUp(bytes memory initializeParams) public override initializer {
        (address _target, address _avatar, address _owner) = abi.decode(
            initializeParams,
            (address, address, address)
        );
        require(_avatar != address(0), "Avatar can not be zero address");
        require(_target != address(0), "Target can not be zero address");
        require(_owner != address(0), "Owner can not be zero address");
        __Ownable_init(_owner);
        avatar = _avatar;
        target = _target;

        emit SwapOwnerSetup(msg.sender, _target, _avatar, _owner);
        emit AvatarSet(address(0), _avatar);
        emit TargetSet(address(0), _target);
    }

    /**
     * @notice Craft a payload that will call the function swapOwner in the Safe contract which replaces the owner `oldOwner` in the Safe with `newOwner`.
     * @dev This can only be done via a Safe transaction.
     * @dev Validation is done
     * @dev https://github.com/safe-global/safe-contracts/blob/0acdd35a203299585438f53885df630f9d486a86/contracts/base/OwnerManager.sol#L99
     * @param prevOwner Owner that pointed to the owner to be replaced in the linked list
     * @param oldOwner Owner address to be replaced.
     * @param newOwner New owner address.
     */
    function startRecovery(
        address prevOwner,
        address oldOwner,
        address newOwner
    ) external onlyOwner {
        IDelay delay = IDelay(target);
        // Nonce given by the delay to the current recovery
        uint256 delayQueueNonce = delay.queueNonce();

        if (swapTxNonce > 0) {
            _checkLastQueuedTx(delay);
        }

        require(
            _swapOwner(prevOwner, oldOwner, newOwner),
            "Module transaction failed"
        );
        //Map the swapNonce to the delay nonce to be able to find the transaction in the delay contract
        swapNonceToDelayQueueNonce[swapTxNonce] = delayQueueNonce;
        swapTxNonce++;
        emit SwapOwner(oldOwner, newOwner);
    }

    function _checkLastQueuedTx(IDelay delay) internal view {
        // Current executable nonce from delay
        uint256 delayTxNonce = delay.txNonce();
        uint256 txCooldown = delay.txCooldown();
        uint256 txExpiration = delay.txExpiration();
        // Nonce given by the delay to the last recovery queued
        uint256 lastTxQueueNonce = swapNonceToDelayQueueNonce[swapTxNonce - 1];
        //Check if transaction has not been executed and if a tx has ever been queued
        if (lastTxQueueNonce >= delayTxNonce) {
            uint256 lastTxCreatedAt = delay.txCreatedAt(lastTxQueueNonce);
            //Require the cooldown period to have passed
            require(
                block.timestamp - lastTxCreatedAt > txCooldown,
                "Cooldown period has not passed"
            );
            //Check if transaction has an expiration
            if (txExpiration > 0) {
                //Require the transaction to be expired
                require(
                    lastTxCreatedAt + txCooldown + txExpiration <
                        block.timestamp,
                    "Transaction has not expired"
                );
            } else {
                revert("A recovery is pending execution");
            }
        }
    }

    function _swapOwner(
        address prevOwner,
        address oldOwner,
        address newOwner
    ) internal returns (bool) {
        return
            exec(
                // avatar, in our case the safe will execute the below function
                avatar,
                0,
                abi.encodeCall(
                    IOwnerManager.swapOwner,
                    (prevOwner, oldOwner, newOwner)
                ),
                Enum.Operation.Call
            );
    }
}
