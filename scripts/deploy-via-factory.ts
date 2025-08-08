/**
 * Hardhat script to deploy a full TREX suite using the TREXFactory.
 *
 * This script demonstrates how to call the `deployTREXSuite` function, which
 * deploys and configures all necessary contracts in a single transaction.
 *
 * To run this script, use the following command AFTER deploying the initial factory:
 * npx hardhat run scripts/deploy-via-factory.ts --network localhost
 */
import { ethers } from 'hardhat';

// =================================================================================
// IMPORTANT: Update this address from your deployment script's output!
// =================================================================================
// This is the address of the TREXFactory contract itself.
const TREX_FACTORY_ADDRESS = '0x8040A9446c71C080A69A1FE8DdA7Cf5578268748';
// =================================================================================

async function main() {
  console.log('🎬 Starting TREX suite deployment via the factory...');

  const [deployer] = await ethers.getSigners();
  console.log(`- Using deployer account: ${deployer.address}`);

  // Get an instance of the deployed TREXFactory contract
  const trexFactory = await ethers.getContractAt('ITREXFactory', TREX_FACTORY_ADDRESS, deployer);

  // --- 1. Deploy a dedicated ClaimIssuer contract ---
  // The factory expects the address of a contract, not a regular wallet.
  console.log('\n--- Deploying a dedicated ClaimIssuer contract first ---');
  const claimIssuerContract = await ethers.deployContract('ClaimIssuer', [deployer.address], deployer);
  await claimIssuerContract.deployed();
  console.log(`- ClaimIssuer contract deployed at: ${claimIssuerContract.address}`);
  // Authorize the deployer's key to sign claims on this new issuer contract
  await claimIssuerContract
    .connect(deployer)
    .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [deployer.address])), 3, 1);
  console.log('- Deployer key authorized for signing on the ClaimIssuer contract.');


  // --- 2. Prepare all necessary parameters ---
  console.log('\n--- Preparing deployment parameters ---');

  // A unique salt to ensure a deterministic deployment address via CREATE2.
  // Change this for each new token you want to deploy.
  const salt = 'RealEstateToken-NYC-Building-01';

  // Define the details for the token itself.
  const tokenDetails = {
    owner: deployer.address,
    name: 'Tokenized NYC Building',
    symbol: 'TNYCB',
    decimals: 18,
    irs: ethers.constants.AddressZero, // Let the factory deploy a new IdentityRegistryStorage
    ONCHAINID: ethers.constants.AddressZero, // Let the factory create a new OnchainID for the token
    tokenAgents: [deployer.address], // The deployer will be an agent on the token
    irAgents: [deployer.address], // The deployer will also be an agent on the Identity Registry
    complianceModules: [], // We'll use the default compliance, so no extra modules needed
    complianceSettings: [], // No settings needed for the default compliance
  };

  // Define the claim and issuer details for compliance.
  const claimDetails = {
    claimTopics: [ethers.utils.id('INVESTOR_ACCREDITATION')],
    issuers: [claimIssuerContract.address], // <-- FIX: Use the address of the deployed ClaimIssuer contract
    issuerClaims: [[ethers.utils.id('INVESTOR_ACCREDITATION')]], // The issuer is trusted for this specific claim
  };

  // --- 3. Log the parameters for verification ---
  console.log('\n--- Deployment Parameters to be Sent ---');
  console.log('Salt:', salt);
  console.log('Token Details:', tokenDetails);
  console.log('Claim Details:', claimDetails);
  console.log('----------------------------------------');

  // --- 4. Call the deployTREXSuite function ---
  console.log('\n--- Sending transaction to TREXFactory ---');
  try {
    const tx = await trexFactory.connect(deployer).deployTREXSuite(salt, tokenDetails, claimDetails);

    console.log(`- Transaction sent! Hash: ${tx.hash}`);
    console.log('- Waiting for transaction to be mined...');

    const receipt = await tx.wait();

    // The factory emits an event with the addresses of all the deployed contracts.
    // We can parse the logs to find this information.
    const deployEvent = receipt.events?.find((e) => e.event === 'TREXSuiteDeployed');

    if (deployEvent && deployEvent.args) {
      console.log('\n✅ TREX suite deployed successfully via factory!');
      console.log('====================================================');
      console.log(`Token Contract:      ${deployEvent.args.token}`);
      console.log(`Identity Registry:   ${deployEvent.args.ir}`);
      console.log(`Compliance Contract: ${deployEvent.args.mc}`);
      console.log('====================================================');
    } else {
      console.error('❌ Deployment seemed to succeed, but the TREXSuiteDeployed event was not found. The transaction likely reverted.');
    }
  } catch (error) {
    console.error('\n❌ Deployment failed!');
    console.error(error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
