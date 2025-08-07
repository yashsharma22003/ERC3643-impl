/**
 * Hardhat interaction script for an already deployed TREX Protocol Suite.
 *
 * This script demonstrates the core lifecycle of a TREX token:
 * 1. Onboarding a new investor by creating their OnchainID and issuing a KYC claim.
 * 2. Minting tokens to the now-verified investor.
 * 3. Checking the final token balance.
 *
 * To run this script, first update the addresses in the CONFIGURATION section,
 * then run the following command:
 * npx hardhat run scripts/interact-with-suite.ts --network <your-network-name>
 */
import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';
import { Contract, Wallet } from 'ethers';

async function main() {
  console.log('Starting interaction with deployed TREX suite...');

  const [deployer] = await ethers.getSigners();
  console.log(`\nUsing deployer/admin account: ${deployer.address}`);

  // =======================================================================
  // CONFIGURATION: PASTE YOUR DEPLOYED ADDRESSES AND KEYS HERE
  // =======================================================================
  // Addresses from your `deploy-trex-suite.ts` output
  const TOKEN_ADDRESS = '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c';
  const IDENTITY_REGISTRY_ADDRESS = '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE';
  const IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';
  const CLAIM_ISSUER_ADDRESS = '0x4A679253410272dd5232B3Ff7cF5dbB88f295319';

  // The private key for the `claimIssuerSigningKey` generated during deployment.
  const claimIssuerSigningKey = new ethers.Wallet(
    // NOTE: Replace with the actual private key from your deployment log if you have it saved.
    // Using a known private key for consistency in this example.
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', 
    ethers.provider
  );
  // =======================================================================

  // Create a new wallet to act as our test investor
  const investor = ethers.Wallet.createRandom().connect(ethers.provider);
  await deployer.sendTransaction({
    to: investor.address,
    value: ethers.utils.parseEther("1.0"),
  });
  console.log(`Created and funded test investor wallet: ${investor.address}\n`);

  // Get contract instances
  const token = await ethers.getContractAt('Token', TOKEN_ADDRESS, deployer);
  const identityRegistry = await ethers.getContractAt('IdentityRegistry', IDENTITY_REGISTRY_ADDRESS, deployer);
  const claimIssuer = await ethers.getContractAt('ClaimIssuer', CLAIM_ISSUER_ADDRESS, deployer);

  // =======================================================================
  // STEP 1: Onboard & Whitelist the Investor
  // =======================================================================
  console.log('Step 1: Onboarding and whitelisting investor...');

  // Deploy an IdentityProxy for the new investor
  const IdentityProxy = new ethers.ContractFactory(OnchainID.contracts.IdentityProxy.abi, OnchainID.contracts.IdentityProxy.bytecode, deployer);
  const investorIdentity = await IdentityProxy.deploy(
    IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS,
    investor.address // The investor has initial management control
  ).then(proxy => ethers.getContractAt('Identity', proxy.address));
  await investorIdentity.deployed();
  console.log(`- Deployed IdentityProxy for investor at: ${investorIdentity.address}`);

  // Register the investor's wallet with their Identity contract in the main registry
  await identityRegistry.connect(deployer).registerIdentity(investor.address, investorIdentity.address, 356); // 356 for India
  console.log(`- Registered investor's wallet in the IdentityRegistry.`);

  // Prepare and sign the KYC claim using the authorized signing key
  const claimTopic = ethers.utils.id('KYC_AML_VERIFIED');
  const claimData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Verified on ' + new Date().toISOString()));

  const signature = await claimIssuerSigningKey._signTypedData(
    {
      name: 'ClaimIssuer',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: claimIssuer.address,
    },
    {
      Claim: [
        { name: 'subject', type: 'address' },
        { name: 'topic', type: 'uint256' },
        { name: 'value', type: 'bytes' },
      ],
    },
    {
      subject: investorIdentity.address,
      topic: claimTopic,
      value: claimData,
    },
  );

  // **FIX**: The investor must grant the `deployer` (the msg.sender) permission to add claims.
  const CLAIM_SIGNER_KEY = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [deployer.address]));
  await investorIdentity.connect(investor).addKey(CLAIM_SIGNER_KEY, 3, 1); // 3 = CLAIM_SIGNER_KEY, 1 = ECDSA
  console.log(`- Investor granted CLAIM_SIGNER permission to the Deployer.`);

  // Now the deployer has permission to submit the claim
  await investorIdentity.connect(deployer).addClaim(claimTopic, 1, claimIssuer.address, signature, claimData, '');
  console.log(`- Added KYC claim to investor's Identity contract.`);

  // Verify the investor's status through the registry
  const isVerified = await identityRegistry.isVerified(investor.address);
  console.log(`- Verification check for investor via Registry: ${isVerified ? 'PASSED' : 'FAILED'}`);
  if (!isVerified) {
    throw new Error("Investor verification failed!");
  }

  // =======================================================================
  // STEP 2: Mint Tokens for the Investor
  // =======================================================================
  console.log('\nStep 2: Minting tokens for the verified investor...');
  const amountToMint = 100; // Mint 100 tokens (decimals is 0 in deploy script)
  await token.connect(deployer).mint(investor.address, amountToMint);
  console.log(`- Minted ${amountToMint} ${await token.symbol()} tokens to ${investor.address}`);

  // =======================================================================
  // STEP 3: Verify Final Balances
  // =======================================================================
  console.log('\nStep 3: Verifying token balance...');
  const balance = await token.balanceOf(investor.address);
  console.log(`- Investor's final ${await token.symbol()} token balance: ${balance.toString()}`);

  console.log('\n✅ Interaction script complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
