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

```javascript
{
  "identityImplementation": "0x13a54D666CB9De39a1299C056Bd0A37B4E3687B9",
  "identityImplementationAuthority": "0x22b1394F0b70513423747964B0A3352B1703Fffc",
  "claimTopicsRegistry": "0x13747407566E3D771cBE028F38712F7a5FB0983f",
  "claimIssuersRegistry": "0x5c35b3f582B04b20E50282CA6f17612b01De979a",
  "identityRegistryStorage": "0x595fEE3Ee25cbbf3259c7D7cf2CD16258FaFA13D",
  "identityRegistry": "0x7Eb85534067f0E123c85e60aBD8AF00EF642c361",
  "basicCompliance": "0x2e42Cd48Ad8089b219DB9Af45b755b777708Aac1",
  "token": "0xC74E0dde6FBb6ECfE71DC91efB789ec1412A9A19"
}
```

