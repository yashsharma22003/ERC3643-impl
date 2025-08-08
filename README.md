# T-REX : Token for Regulated EXchanges

![GitHub](https://img.shields.io/github/license/ERC-3643/ERC-3643?color=green)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/ERC-3643/ERC-3643)
![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/ERC-3643/ERC-3643/publish-release.yml)
![GitHub repo size](https://img.shields.io/github/repo-size/ERC-3643/ERC-3643)
![GitHub Release Date](https://img.shields.io/github/release-date/ERC-3643/ERC-3643)




----

<br><br>

<p align="center">
  <a href="https://tokeny.com/erc3643-whitepaper/">
  <img src="./docs/img/T-REX.png" width="150" title="t-rex">
  </a>
</p>


## Overview

The T-REX (Token for Regulated EXchanges) protocol is a comprehensive suite of Solidity smart contracts,
implementing the [ERC-3643 standard](https://eips.ethereum.org/EIPS/eip-3643) and designed to enable the issuance, management, and transfer of security
tokens in
compliance with regulations. It ensures secure and compliant transactions for all parties involved in the token exchange.

## Key Components

The T-REX protocol consists of several key components:

- **[ONCHAINID](https://github.com/onchain-id/solidity)**: A smart contract deployed by a user to interact with the security token or any other application
  where an on-chain identity may be relevant. It stores keys and claims related to a specific identity.

- **Trusted Issuers Registry**: This contract houses the addresses of all trusted claim issuers associated with a specific token.

- **Claim Topics Registry**: This contract maintains a list of all trusted claim topics related to the security token.

- **Identity Registry**: This contract holds the identity contract addresses of all eligible users authorized to hold the token. It is responsible for claim verification.

- **Compliance Smart Contract**: This contract independently operates to check whether a transfer is in compliance with the established rules for the token.

- **Security Token Contract**: This contract interacts with the Identity Registry to check the eligibility status of investors, enabling token holding and transactions.

## Getting Started

1. Clone the repository: `git clone https://github.com/ERC-3643/ERC-3643.git`
2. Install dependencies: `npm ci`
3. Compile the contracts: `hardhat compile`
4. Run tests: `hardhat test`

## Documentation

For a detailed understanding of the T-REX protocol, please refer to the [whitepaper](./docs/TREX-WhitePaper.pdf).
All functions of T-REX smart contracts are described in the [T-REX documentation](https://docs.tokeny.com/docs/smart-contracts)

## Contributing

We welcome contributions from the community. Please refer to the [CONTRIBUTING](./CONTRIBUTING.md) guide for more details.

## License

This project is licensed under the [GNU General Public License v3.0](./LICENSE.md).

----

<div style="padding: 16px;">
   <a href="https://tokeny.com/wp-content/uploads/2023/04/Tokeny_TREX-v4_SC_Audit_Report.pdf" target="_blank">
       <img src="https://hacken.io/wp-content/uploads/2023/02/ColorWBTypeSmartContractAuditBackFilled.png" alt="Proofed by Hacken - Smart contract audit" style="width: 258px; height: 100px;">
   </a>
</div>

## Polygon Amoy Deployments

Deployer account: 0x0af700A3026adFddC10f7Aa8Ba2419e8503592f7

Phase 1: Deploying implementation contracts...
- All implementation contracts deployed.

Phase 2: Deploying authorities and factories...
- IdentityImplementationAuthority deployed to: 0x86B01eDe35eD51061d60b2bA5F22830C583d4bE2
- IdentityFactory deployed to: 0x137af86dBB80720B7123827A4d221026f5025416
- TREXImplementationAuthority deployed to: 0x5E8DA73D8C4C4E549dD5016EC45C5702F1d740a2
- TREX version set on TREXImplementationAuthority.
- TREXFactory deployed to: 0x8040A9446c71C080A69A1FE8DdA7Cf5578268748
- TREXFactory registered with IdentityFactory.

Phase 3: Deploying user-facing proxy contracts...
- ClaimTopicsRegistry (Proxy) deployed to: 0xfd76509aEC510C8efeF4F5A8c10C74a9cA338129
- TrustedIssuersRegistry (Proxy) deployed to: 0xD3FE34F39e376Be9c0Cf447b2c2263A867091a8b
- IdentityRegistryStorage (Proxy) deployed to: 0x6F216966050F8513c167A6bb9D03CAa9fc3cCCac
- DefaultCompliance module deployed to: 0x1b1a55393Fb88F01b90683E9548FcF7ae2Bd348B
- IdentityRegistry (Proxy) deployed to: 0xB4a91f196B43DcA8E815FC8d375a01704D3795f3
- IdentityProxy (for management key 0x0af700A3026adFddC10f7Aa8Ba2419e8503592f7) deployed to: 0xB3Bf331E48BF97A277505fb472c2ce2337550EB7
- Token "TREXDINO" (TREX) (Proxy) deployed to: 0xe3565d06336FE261bB6b9dacF44EFc7AE357B13F

Phase 4: Configuring permissions and initial state...
- IdentityRegistryStorage bound to IdentityRegistry.
- Deployer set as an Agent on the Token.
- Deployer and Token contract set as Agents on the IdentityRegistry.
- Claim Topic "KYC_AML_VERIFIED" (0x18be04bd8d115b448043fa0b06bdadd1fadc4027c7123595b5671541dbaae317) added.
- ClaimIssuer contract deployed at: 0x47E6b6730941561aaeba4D0037b03202F9cFe405
- Associated signing key (for off-chain use): 0x0af700A3026adFddC10f7Aa8Ba2419e8503592f7
- ClaimIssuer added to TrustedIssuersRegistry.
- Token has been unpaused and is now transferable.

✅ TREX suite deployment and configuration complete!

----
