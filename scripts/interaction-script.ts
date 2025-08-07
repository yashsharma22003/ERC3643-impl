// File: scripts/interact.ts
import { ethers } from 'hardhat';
import { Contract } from 'ethers';
import OnchainID from '@onchain-id/solidity';


async function main() {
  console.log('Starting interaction script...');

  const [deployer] = await ethers.getSigners();
  // Create a new wallet to act as our test investor
  const investor = ethers.Wallet.createRandom().connect(ethers.provider);

  // --- CONFIGURATION: PASTE YOUR DEPLOYED ADDRESSES HERE ---
  // Get these from the output of your last deployment script
  const TOKEN_ADDRESS = '0xae20FdF946bC8fF93bbd769A3E070C94D3C8714E';
  const IDENTITY_REGISTRY_ADDRESS = '0xb5e9567240C5d663Ecdc3763e88E1e6EcD399D26';
  const KYC_TOPIC = ethers.utils.id('KYC_APPROVED');
  // ---------------------------------------------------------

  // Fund the investor wallet so it can pay for gas if needed
  await deployer.sendTransaction({
    to: investor.address,
    value: ethers.utils.parseEther("1.0"), // Send 1 ETH
  });
  console.log(`\nCreated and funded test investor wallet: ${investor.address}`);


  // Get contract instances
  const token = await ethers.getContractAt('Token', TOKEN_ADDRESS, deployer);
  const identityRegistry = await ethers.getContractAt('IdentityRegistry', IDENTITY_REGISTRY_ADDRESS, deployer);

  // =======================================================================
  // STEP 1: Onboard & Whitelist the Investor
  // =======================================================================
  console.log('\nStep 1: Whitelisting investor...');

  // For this script, we'll use a simple Identity contract deployed for the user.
  const Identity = await ethers.getContractFactory(OnchainID.contracts.Identity.abi, OnchainID.contracts.Identity.bytecode, deployer);
  const identityContract = await Identity.deploy(investor.address, false);
  await identityContract.deployed();
  
  console.log(`- Deployed a new Identity contract for investor at: ${identityContract.address}`);

  // Register the investor's wallet with their new Identity contract
  await identityRegistry.registerIdentity(investor.address, identityContract.address, 356); // 356 is country code for India
  console.log(`- Registered identity for ${investor.address}`);

  // **FIX**: The investor (management key) must grant the deployer permission to be a claim signer.
  const CLAIM_SIGNER_KEY = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [deployer.address]));
  const CLAIM_SIGNER_PURPOSE = 3; // 3 is the purpose for CLAIM_SIGNER_KEY
  const KEY_TYPE = 1; // 1 for ECDSA
  
  await identityContract.connect(investor).addKey(CLAIM_SIGNER_KEY, CLAIM_SIGNER_PURPOSE, KEY_TYPE);
  console.log(`- Investor granted CLAIM_SIGNER permission to the deployer.`);


  // Issue the KYC claim by calling addClaim ON THE IDENTITY CONTRACT
  const claimData = ethers.utils.hexlify(ethers.utils.toUtf8Bytes('Verified by CircleHackathon Admin'));
  
  // The signature must be created by a key trusted by the Identity contract.
  // The deployer is now a trusted claim signer on this identity.
  const signature = await deployer._signTypedData(
      // Domain
      {
          name: 'Identity',
          version: '1',
          chainId: (await ethers.provider.getNetwork()).chainId,
          verifyingContract: identityContract.address,
      },
      // Types
      {
          Claim: [
              { name: 'issuer', type: 'address' },
              { name: 'topic', type: 'uint256' },
              { name: 'data', type: 'bytes' },
          ],
      },
      // Value
      {
          issuer: deployer.address, // The deployer is acting as the trusted issuer
          topic: KYC_TOPIC,
          data: claimData,
      },
  );

  // The deployer now has the correct key to add the claim.
  const claimScheme = 1; // 1 for ECDSA signature scheme
  const claimUri = ""; // URI can be empty for this example
  await identityContract.connect(deployer).addClaim(
    KYC_TOPIC,
    claimScheme,
    deployer.address,
    signature,
    claimData,
    claimUri
  );
  console.log(`- Added KYC claim to investor's identity contract.`);

  const isVerified = await identityRegistry.isVerified(investor.address);
  console.log(`- Verification check for investor via Registry: ${isVerified ? 'PASSED' : 'FAILED'}`);
  if (!isVerified) {
    throw new Error("Investor verification failed!");
  }

  // =======================================================================
  // STEP 2: Mint Tokens for the Investor
  // =======================================================================
  console.log('\nStep 2: Minting tokens for investor...');
  const amountToMint = ethers.utils.parseEther('100'); // Mint 100 tokens

  await token.mint(investor.address, amountToMint);
  console.log(`- Minted ${ethers.utils.formatEther(amountToMint)} GZB tokens to ${investor.address}`);

  // =======================================================================
  // STEP 3: Verify Balances
  // =======================================================================
  console.log('\nStep 3: Verifying token balance...');
  const balance = await token.balanceOf(investor.address);
  console.log(`- Investor's final GZB token balance: ${ethers.utils.formatEther(balance)}`);

  console.log('\n✅ Interaction script complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
