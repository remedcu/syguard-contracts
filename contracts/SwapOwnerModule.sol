// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Module, Enum} from "@gnosis.pm/zodiac/contracts/core/Module.sol";

interface IOwnerManager {
    function swapOwner(
        address prevOwner,
        address oldOwner,
        address newOwner
    ) external;
}

contract SwapOwnerModule is Module {
    event SwapOwnerSetup(
        address indexed initiator,
        address indexed owner,
        address indexed avatar,
        address target
    );

    event SwapOwner(address indexed oldOwner, address indexed newOwner);

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
        __Ownable_init(msg.sender);
        (address _target, address _avatar, address _owner) = abi.decode(
            initializeParams,
            (address, address, address)
        );
        require(_avatar != address(0), "Avatar can not be zero address");
        require(_target != address(0), "Target can not be zero address");
        require(_owner != address(0), "Owner can not be zero address");
        avatar = _avatar;
        target = _target;
        _transferOwnership(_owner);

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
        require(
            _swapOwner(prevOwner, oldOwner, newOwner),
            "Module transaction failed"
        );
        emit SwapOwner(oldOwner, newOwner);
    }

    function _swapOwner(
        address prevOwner,
        address oldOwner,
        address newOwner
    ) internal returns (bool) {
        return
            exec(
                target,
                0,
                abi.encodeCall(
                    IOwnerManager.swapOwner,
                    (prevOwner, oldOwner, newOwner)
                ),
                Enum.Operation.Call
            );
    }
}
