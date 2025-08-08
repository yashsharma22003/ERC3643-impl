/**
 * Hardhat interaction script to simulate an investment using the deployed TREX suite.
 *
 * This script performs the following actions:
 * 1. Defines two new users: an 'Investor' and 'AnotherInvestor'.
 * 2. Creates On-Chain Identities (OIDs) for both of them.
 * 3. Registers their identities in the IdentityRegistry.
 * 4. The deployer (acting as a trusted issuer) issues a 'KYC_AML_VERIFIED' claim to both identities.
 * 5. The deployer (acting as the token issuer) mints tokens for the 'Investor'.
 * 6. Verifies that the 'Investor' received the tokens.
 * 7. Demonstrates that the 'Investor' can transfer tokens to 'AnotherInvestor' (since both are verified).
 * 8. Demonstrates that a transfer to a non-verified account will fail.
 *
 * To run this script, use the following command AFTER running the deployment script:
 * npx hardhat run scripts/interact-with-trex.ts --network localhost
 */
import { ethers } from 'hardhat';
import { Contract, Signer } from 'ethers';
import OnchainID from '@onchain-id/solidity';

// =================================================================================
// IMPORTANT: Update these addresses from your deployment script's output!
// =================================================================================
const TOKEN_ADDRESS = '0x3Aa5ebB10DC797CAC828524e59A333d0A371443c';
const IDENTITY_REGISTRY_ADDRESS = '0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE';
const CLAIM_ISSUER_ADDRESS = '0x4A679253410272dd5232B3Ff7cF5dbB88f295319';
const IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS = '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853';

// The claim topic hash from your deployment output
const KYC_AML_CLAIM_TOPIC = '0x18be04bd8d115b448043fa0b06bdadd1fadc4027c7123595b5671541dbaae317';
// =================================================================================

// Helper to create an Identity for a user
async function createIdentity(user: Signer, implementationAuthorityAddress: string): Promise<Contract> {
  const userAddress = await user.getAddress();
  const factory = new ethers.ContractFactory(
    OnchainID.contracts.IdentityProxy.abi,
    OnchainID.contracts.IdentityProxy.bytecode,
    user, // The user themselves deploys their own identity proxy
  );
  const identity = await factory.deploy(implementationAuthorityAddress, userAddress);
  await identity.deployed();
  console.log(`- IdentityProxy for ${userAddress} deployed to: ${identity.address}`);
  return ethers.getContractAt('Identity', identity.address, user);
}

async function main() {
  console.log('🎬 Starting investment simulation...');

  // --- 1. SETUP ACTORS & CONTRACTS ---
  console.log('\n--- Phase 1: Setting up actors and contracts ---');
  const [deployer, investor, anotherInvestor, unverifiedUser] = await ethers.getSigners();
  console.log(`Deployer/Issuer: ${deployer.address}`);
  console.log(`Investor:        ${investor.address}`);
  console.log(`AnotherInvestor: ${anotherInvestor.address}`);
  console.log(`Unverified User: ${unverifiedUser.address}`);

  const token = await ethers.getContractAt('Token', TOKEN_ADDRESS, deployer);
  const identityRegistry = await ethers.getContractAt('IdentityRegistry', IDENTITY_REGISTRY_ADDRESS, deployer);
  const claimIssuer = await ethers.getContractAt('ClaimIssuer', CLAIM_ISSUER_ADDRESS, deployer);
  console.log('- Contract instances attached.');

  // --- 2. ONBOARD INVESTORS ---
  console.log('\n--- Phase 2: Onboarding Investors (Creating & Registering Identities) ---');
  // Create On-Chain Identities (OIDs) for both investors
  const investorIdentity = await createIdentity(investor, IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS);
  const anotherInvestorIdentity = await createIdentity(anotherInvestor, IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS);

  // The deployer (who is an agent on the IdentityRegistry) registers these new identities
  await identityRegistry.connect(deployer).registerIdentity(investor.address, investorIdentity.address, 99);
  await identityRegistry.connect(deployer).registerIdentity(anotherInvestor.address, anotherInvestorIdentity.address, 99);
  console.log('- Identities registered in the IdentityRegistry.');

  // --- 3. ISSUE COMPLIANCE CLAIMS ---
  console.log('\n--- Phase 3: Issuing KYC/AML Claims ---');

  const claimSigner = deployer;
  console.log(`- Using signer ${claimSigner.address} to sign the claim.`);

  // We will use empty data ('0x') to ensure the hash matches perfectly.
  const emptyClaimData = '0x';

  // Step 1: Prepare the claim hash and sign it OFF-CHAIN
  // This hash must match EXACTLY what ClaimIssuer.isClaimValid() expects.
  const dataHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes'],
      [investorIdentity.address, KYC_AML_CLAIM_TOPIC, emptyClaimData],
    ),
  );

  // Sign the hash to get the signature
  const signature = await claimSigner.signMessage(ethers.utils.arrayify(dataHash));
  console.log('- Claim has been signed off-chain.');

  // Step 2: Add the signed claim ON-CHAIN to the investor's identity contract
  console.log("- Adding signed claim to the investor's Identity contract...");
  await investorIdentity.connect(investor).addClaim(
    KYC_AML_CLAIM_TOPIC,
    1, // Scheme for EIP-191 signature
    CLAIM_ISSUER_ADDRESS,
    signature,
    emptyClaimData, // Use empty data here as well
    '', // URI is optional
  );
  console.log('- KYC claim added to the investor identity.');

  // This check should now pass
  const isInvestorVerified = await identityRegistry.isVerified(investorIdentity.address);
  console.log(`- Verification check: Is Investor eligible to receive tokens? ${isInvestorVerified}`);

  if (!isInvestorVerified) {
    console.error('❌ Verification failed! The script will now exit.');
    process.exit(1);
  }
  // --- 4. SIMULATE THE INVESTMENT (MINT TOKENS) ---
  console.log('\n--- Phase 4: Simulating the Investment ---');
  const investmentAmount = 1000;
  console.log(`- Minting ${investmentAmount} ${await token.symbol()} tokens for the Investor...`);

  const initialTotalSupply = await token.totalSupply();
  const initialInvestorBalance = await token.balanceOf(investorIdentity.address);

  // The deployer (token agent) mints tokens to the investor's IDENTITY address
  await token.connect(deployer).mint(investorIdentity.address, investmentAmount);
  console.log('- Minting complete.');

  const finalTotalSupply = await token.totalSupply();
  const finalInvestorBalance = await token.balanceOf(investorIdentity.address);

  console.log('\n--- Phase 5: Verifying Investment Outcome ---');
  console.log(`Investor's initial balance: ${initialInvestorBalance}`);
  console.log(`Investor's final balance:   ${finalInvestorBalance} (+${finalInvestorBalance.sub(initialInvestorBalance)})`);
  console.log(`Token total supply before:  ${initialTotalSupply}`);
  console.log(`Token total supply after:   ${finalTotalSupply} (+${finalTotalSupply.sub(initialTotalSupply)})`);
  if (finalInvestorBalance.eq(investmentAmount)) {
    console.log('- Investment successful! Balance confirmed. ✅');
  } else {
    console.log('- Something went wrong with the investment. ❌');
  }

  // --- 6. DEMONSTRATE COMPLIANCE-ENABLED TRANSFER ---
  console.log('\n--- Phase 6: Demonstrating Compliance in Transfers ---');
  const transferAmount = 150;

  // We need to issue a claim for the second investor as well for the transfer to succeed
  console.log('\n- Issuing KYC claim to AnotherInvestor to enable receiving tokens...');
  const anotherDataHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'bytes'],
      [anotherInvestorIdentity.address, KYC_AML_CLAIM_TOPIC, emptyClaimData],
    ),
  );
  const anotherSignature = await claimSigner.signMessage(ethers.utils.arrayify(anotherDataHash));
  await anotherInvestorIdentity.connect(anotherInvestor).addClaim(
    KYC_AML_CLAIM_TOPIC,
    1,
    CLAIM_ISSUER_ADDRESS,
    anotherSignature,
    emptyClaimData,
    '',
  );
  console.log('- KYC claim added to AnotherInvestor.');


  // Test 1: Verified Investor -> Verified AnotherInvestor (SHOULD SUCCEED)
  console.log(`\nAttempting to transfer ${transferAmount} tokens from Investor to AnotherInvestor (both verified)...`);
  // The investor connects to their identity contract to perform the transfer
  await token.connect(investor).transfer(anotherInvestorIdentity.address, transferAmount);
  const anotherInvestorBalance = await token.balanceOf(anotherInvestorIdentity.address);
  console.log(`- Transfer successful! AnotherInvestor balance: ${anotherInvestorBalance} ✅`);

  // Test 2: Verified Investor -> Unverified User (SHOULD FAIL)
  console.log(`\nAttempting to transfer ${transferAmount} tokens from Investor to Unverified User...`);
  try {
    // Note: We are attempting to send to the user's EOA, which has no identity and no claims.
    await token.connect(investor).transfer(unverifiedUser.address, transferAmount);
  } catch (error: any) {
    // The error reason comes from the DefaultCompliance contract
    if (error.message.includes('revert')) { // A generic check for a reverted transaction
      console.log("- Transfer failed as expected because the receiver is not verified. ✅");
    } else {
      console.error('- Transfer failed, but for an unexpected reason:', error.message);
    }
  }

  console.log('\n🎉 Investment simulation complete!');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});