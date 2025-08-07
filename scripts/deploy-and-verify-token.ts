/**
 * Hardhat deployment and verification script for a TREX (ERC-3643) Token Suite.
 *
 * This script performs two main actions:
 * 1. DEPLOY: It uses a pre-deployed TREXFactory to create a new token suite,
 * including the Token, IdentityRegistry, Compliance, and other registries.
 * 2. VERIFY: After deployment, it runs a series of checks to confirm that all
 * contracts are correctly linked and configured.
 *
 * To run this script:
 * npx hardhat run scripts/deployAndVerifyToken.ts --network <your-network-name>
 */
import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import assert from 'assert'; // Using Node.js's built-in assert for checks

// A simple helper to log check results
const check = (label: string, success: boolean) => {
  console.log(`- ✅ ${label}: ${success ? 'OK' : 'FAIL'}`);
  assert.ok(success, `${label} check failed!`);
};

async function main() {
  console.log('Starting TREX Token Suite deployment and verification...');

  const [deployer] = await ethers.getSigners();
  console.log(`\nDeployer account: ${deployer.address}`);

  // --- CONFIGURATION: PASTE YOUR DEPLOYED ADDRESSES HERE ---
  const TREX_FACTORY_ADDRESS = '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e'; // Address from your factory deployment
  // ---------------------------------------------------------

  const trexFactory = await ethers.getContractAt('TREXFactory', TREX_FACTORY_ADDRESS, deployer);
  console.log(`Attached to TREXFactory at: ${trexFactory.address}\n`);

  // =======================================================================
  // PHASE 1: DEPLOY THE TOKEN SUITE
  // =======================================================================
  console.log('Phase 1: Deploying the Token Suite via Factory...');

  const KYC_TOPIC = ethers.utils.id('KYC_APPROVED'); // Use a descriptive ID
  const salt = `RWA_REAL_ESTATE_GZB_01_${Date.now()}`; // Unique salt for deployment

  // Prepare ClaimDetails
  const claimDetails = {
    claimTopics: [KYC_TOPIC],
    issuers: [deployer.address], // Deployer is the initial trusted issuer
    issuerClaims: [[KYC_TOPIC]],
  };

  // Prepare TokenDetails
  const tokenDetails = {
    owner: deployer.address,
    name: 'Ghaziabad Heights',
    symbol: 'GZB',
    decimals: 18,
    irs: ethers.constants.AddressZero, // Deploy a new one
    ONCHAINID: ethers.constants.AddressZero, // Deploy a new one
    irAgents: [deployer.address],
    tokenAgents: [deployer.address],
    complianceModules: [],
    complianceSettings: [],
  };

  const tx = await trexFactory.deployTREXSuite(salt, tokenDetails, claimDetails);
  const receipt = await tx.wait();
  console.log(`- Token suite deployed successfully. Transaction hash: ${receipt.transactionHash}`);

  // Extract deployed contract addresses from the event
  const deployEvent = receipt.events?.find((e: any) => e.event === 'TREXSuiteDeployed');
  if (!deployEvent || !deployEvent.args) {
    throw new Error('TREXSuiteDeployed event not found in transaction receipt.');
  }

  // EDITED: Access event arguments by index for greater reliability
  const tokenAddress = deployEvent.args[0];
  const identityRegistryAddress = deployEvent.args[1];
  // Note: args[2] is identityRegistryStorage, which we don't need to verify here
  const trustedIssuersRegistryAddress = deployEvent.args[3];
  // Note: args[4] is claimTopicsRegistry
  const complianceAddress = deployEvent.args[5]; // The gateway is the compliance contract

  console.log(`\nDeployed Contract Addresses:
  - Token (GZB): ${tokenAddress}
  - IdentityRegistry: ${identityRegistryAddress}
  - Compliance (Gateway): ${complianceAddress}
  - TrustedIssuersRegistry: ${trustedIssuersRegistryAddress}\n`);


  // =======================================================================
  // PHASE 2: VERIFY THE SETUP
  // =======================================================================
  console.log('Phase 2: Verifying contract setup and linkages...');

  // Get contract instances for verification
  const token = await ethers.getContractAt('Token', tokenAddress, deployer);
  const identityRegistry = await ethers.getContractAt('IdentityRegistry', identityRegistryAddress, deployer);
  const compliance = await ethers.getContractAt('ModularCompliance', complianceAddress, deployer);
  const trustedIssuersRegistry = await ethers.getContractAt('TrustedIssuersRegistry', trustedIssuersRegistryAddress, deployer);

  // 1. Check Ownership
  check('Token owner is deployer', (await token.owner()) === deployer.address);
  check('IdentityRegistry owner is deployer', (await identityRegistry.owner()) === deployer.address);
  check('Compliance owner is deployer', (await compliance.owner()) === deployer.address);

  // 2. Check Linkages
  check('Token is linked to correct IdentityRegistry', (await token.identityRegistry()) === identityRegistry.address);
  check('Token is linked to correct Compliance module', (await token.compliance()) === compliance.address);
  check('IdentityRegistry is linked to correct TrustedIssuersRegistry', (await identityRegistry.issuersRegistry()) === trustedIssuersRegistry.address);

  // 3. Check Compliance Rules
//   const isBound = await compliance.isModuleBound(compliance.address);
//   check('Compliance module is self-bound (active)', isBound);

  // 4. Check Roles and Permissions
  check('Deployer has AGENT_ROLE on Token', await token.isAgent(deployer.address));
//   check('Deployer has AGENT_ROLE on IdentityRegistry', await identityRegistry.hasRole(AGENT_ROLE, deployer.address));

  // 5. Check Claim and Issuer Setup
  check('Deployer is a Trusted Issuer', await trustedIssuersRegistry.isTrustedIssuer(deployer.address));
  const topics = await trustedIssuersRegistry.getTrustedIssuerClaimTopics(deployer.address);
  check('Trusted Issuer is configured for KYC_TOPIC', topics[0].toHexString() === KYC_TOPIC);


  console.log('\n✅ All checks passed! Your RWA token is correctly deployed and configured.');
  console.log('=============================================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
