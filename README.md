# syguard-contracts

Solidity contracts for SyGuard


## Introduction

Sygnum Bank, in partnership with Safe, plans to develop Sygnum Guardian - a tailored recovery service offering for Safe Smart Accounts (Safe — Leading the Smart Account standard on Ethereum ). Leveraging their programmability, Sygnum will create a recovery module that enables account owners (and only them) to recover access to their Safe accounts by swapping their keys with new ones created by them.

Sygnum has implemented a simple SwapOwnerModule, which empowers the operator to execute only Safe owner address swap transactions. All other "Safe transaction" can not be executed (e.g. transfer of assets). The SwapOwnerModule makes use of the Zodiac Delay Modifier to delay an owner swap such that a swap can get executed only after a certain time period after initialization (e.g. 7 days)

[Zodiac Delay Modifier](https://github.com/gnosis/zodiac-modifier-delay):A Safe module that allows approved addresses to execute transactions after a time delay, during which transactions can be marked as invalid by the Safe.

[Safe documentation](https://docs.safe.global/safe-smart-account/safe-smart-account)

[Safe Account contract](https://github.com/safe-global/safe-contracts): Safe allows secure management of blockchain assets.

Contract 1: SwapOwnerModule.sol

## Transparency & Limitation of Power
Module is only able to swap the keys (not to add nor execute any other transaction)

Customer(s) is/are notified about any recovery step

Safe{Wallet} must be inactive for a certain time period (off-chain)

Swap can be executed only after a certain time period (on-chain)

Within this time period swap can be stopped

## Blockchain transaction flow on new clients:

Deploy a minimal proxy of the modifier

Deploy a minimal proxy of the Sygnum Module

Link the modifier to the safe account (enable module, target: client’s safe account)

Link the module to the modifier (enable module, target: modifier)

Preferably the transactions will be batched, the target is the gnosis-safe account of the client.

## Sygnum module specifications
### Overview
Default Modifier Behavior: By default, the modifier can process any transaction from a linked address.

Sygnum Module: A specialized module will be created with a single function. This function will send a payload to the delay modifier, specifically to invoke the swapOwner function on the Safe account, thereby reducing Sygnum's power.

### Component Origins
Factory: Provided by the Zodiac team

Modifier's Master Copy (Delay modifier): Provided by the Zodiac team.

Safe Account/Safe{wallet}: Managed by the Safe team.

Module's Master Copy (Sygnum module): Developed by Sygnum.

Minimal Proxy Implementation (for Sygnum module): Based on the standard ERC-1167 (EIP-1167).

#### Ownership and Administration
Modifier Ownership Transfer: Post-setup, the ownership of the modifier will be transferred to address the client's Safe account.

Admin Functions: The Sygnum module has one admin or owner function.

Wallet Options
Sygnum Wallet: Can be either Fireblocks or a standard Safe account.

Reuse of Contracts
Master Copy and Factory: Existing contracts deployed by Gnosis will be reused where available. In cases where original contracts are missing, an exact copy of the audited code will be deployed on the chain.

### Glossary

Safe{Wallet}: The multisig wallet solution of (Gnosis) Safe

Wallet address: The authorized wallet address used to access the Safe{Wallet}

Key: The private key of the authorized wallet address

Safe{Wallet} Owner: Person, who has a authorized wallet with the role “owner” in a Safe{Wallet}

Safe{Wallet} Beneficial Owner: Legal owner of the assets in the Safe{Wallet}

Assets: the digital assets in the Safe{Wallet}

Safe{Wallet} Recovery Module: A backup of a Safe{Wallet} on Sygnum Guardianship

### Zodiac standards
Quote taken from the [Zodiac wiki page](https://zodiac.wiki/index.php/Introduction:_Zodiac_Standard)

>Avatars are programmable Ethereum accounts, like the Safe. Avatars are the address that holds balances, owns systems, executes transaction; is referenced externally; and ultimately represents your DAO. Avatars must expose an interface like IAvatar.sol.
>
>Modules are contracts enabled by an Avatar that implement some decision making logic. They should import Module.sol.
>
>Modifiers are contracts that sit between Modules and Avatars to modify the Module's behavior. For example, they might enforce a delay on all functions a Module attempts to execute. Modifiers should import Modifier.sol and must expose an interface like IAvatar.sol.
>
>Guards are contracts that can be enabled on Modules and implement pre- or post-checks on each transaction that the Module executes. This allows Avatars to do things like limit the scope of addresses and functions that a module can call or ensure a certain state is never changed by a module. Guards should import BaseGuard.sol.
