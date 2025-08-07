/**
 * Hardhat deployment script for the full TREX Protocol Suite.
 *
 * This script deploys all necessary implementation contracts, authorities, factories,
 * and proxies. All administrative controls and initial roles are assigned to the
 * deployer account. After execution, the deployer will be the owner and primary
 * agent for all components, and can then delegate permissions as required.
 *
 * To run this script, use the following command:
 * npx hardhat run scripts/deploy-trex-suite.ts --network <your-network-name>
 *
 * Example:
 * npx hardhat run scripts/deploy-trex-suite.ts --network sepolia
 */
import { ethers } from 'hardhat';
import OnchainID from '@onchain-id/solidity';
import { Contract, Signer } from 'ethers';

// Helper function to deploy an Identity Proxy, adapted for the deploy script
async function deployIdentityProxy(implementationAuthority: Contract['address'], managementKey: string, signer: Signer) {
  const identity = await new ethers.ContractFactory(OnchainID.contracts.IdentityProxy.abi, OnchainID.contracts.IdentityProxy.bytecode, signer).deploy(
    implementationAuthority,
    managementKey,
  );
  await identity.deployed();
  console.log(`- IdentityProxy (for management key ${managementKey}) deployed to: ${identity.address}`);
  return ethers.getContractAt('Identity', identity.address, signer);
}

async function main() {
  console.log('Starting full TREX suite deployment...');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer account: ${deployer.address}\n`);

  // A random wallet to act as the signing key for the ClaimIssuer contract.
  // In a real scenario, this key would be managed securely off-chain.
  const claimIssuerSigningKey = ethers.Wallet.createRandom();

  // =======================================================================
  // PHASE 1: Deploying Foundational Implementations
  // =======================================================================
  console.log('Phase 1: Deploying implementation contracts...');
  const claimTopicsRegistryImplementation = await ethers.deployContract('ClaimTopicsRegistry', deployer);
  await claimTopicsRegistryImplementation.deployed();
  const trustedIssuersRegistryImplementation = await ethers.deployContract('TrustedIssuersRegistry', deployer);
  await trustedIssuersRegistryImplementation.deployed();
  const identityRegistryStorageImplementation = await ethers.deployContract('IdentityRegistryStorage', deployer);
  await identityRegistryStorageImplementation.deployed();
  const identityRegistryImplementation = await ethers.deployContract('IdentityRegistry', deployer);
  await identityRegistryImplementation.deployed();
  const modularComplianceImplementation = await ethers.deployContract('ModularCompliance', deployer);
  await modularComplianceImplementation.deployed();
  const tokenImplementation = await ethers.deployContract('Token', deployer);
  await tokenImplementation.deployed();
  const identityImplementation = await new ethers.ContractFactory(
    OnchainID.contracts.Identity.abi,
    OnchainID.contracts.Identity.bytecode,
    deployer,
  ).deploy(deployer.address, true);
  await identityImplementation.deployed();
  console.log('- All implementation contracts deployed.\n');

  // =======================================================================
  // PHASE 2: Deploying Authorities & Factories
  // =======================================================================
  console.log('Phase 2: Deploying authorities and factories...');
  const identityImplementationAuthority = await new ethers.ContractFactory(
    OnchainID.contracts.ImplementationAuthority.abi,
    OnchainID.contracts.ImplementationAuthority.bytecode,
    deployer,
  ).deploy(identityImplementation.address);
  await identityImplementationAuthority.deployed();
  console.log(`- IdentityImplementationAuthority deployed to: ${identityImplementationAuthority.address}`);

  const identityFactory = await new ethers.ContractFactory(OnchainID.contracts.Factory.abi, OnchainID.contracts.Factory.bytecode, deployer).deploy(
    identityImplementationAuthority.address,
  );
  await identityFactory.deployed();
  console.log(`- IdentityFactory deployed to: ${identityFactory.address}`);

  const trexImplementationAuthority = await ethers.deployContract(
    'TREXImplementationAuthority',
    [true, ethers.constants.AddressZero, ethers.constants.AddressZero],
    deployer,
  );
  await trexImplementationAuthority.deployed();
  console.log(`- TREXImplementationAuthority deployed to: ${trexImplementationAuthority.address}`);

  const versionStruct = { major: 4, minor: 0, patch: 0 };
  const contractsStruct = {
    tokenImplementation: tokenImplementation.address,
    ctrImplementation: claimTopicsRegistryImplementation.address,
    irImplementation: identityRegistryImplementation.address,
    irsImplementation: identityRegistryStorageImplementation.address,
    tirImplementation: trustedIssuersRegistryImplementation.address,
    mcImplementation: modularComplianceImplementation.address,
  };
  await trexImplementationAuthority.connect(deployer).addAndUseTREXVersion(versionStruct, contractsStruct);
  console.log('- TREX version set on TREXImplementationAuthority.');

  const trexFactory = await ethers.deployContract('TREXFactory', [trexImplementationAuthority.address, identityFactory.address], deployer);
  await trexFactory.deployed();
  console.log(`- TREXFactory deployed to: ${trexFactory.address}`);
  await identityFactory.connect(deployer).addTokenFactory(trexFactory.address);
  console.log('- TREXFactory registered with IdentityFactory.\n');


  // =======================================================================
  // PHASE 3: Deploying User-Facing Proxies
  // =======================================================================
  console.log('Phase 3: Deploying user-facing proxy contracts...');
  const claimTopicsRegistry = await ethers
    .deployContract('ClaimTopicsRegistryProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('ClaimTopicsRegistry', proxy.address));
  console.log(`- ClaimTopicsRegistry (Proxy) deployed to: ${claimTopicsRegistry.address}`);

  const trustedIssuersRegistry = await ethers
    .deployContract('TrustedIssuersRegistryProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('TrustedIssuersRegistry', proxy.address));
  console.log(`- TrustedIssuersRegistry (Proxy) deployed to: ${trustedIssuersRegistry.address}`);

  const identityRegistryStorage = await ethers
    .deployContract('IdentityRegistryStorageProxy', [trexImplementationAuthority.address], deployer)
    .then(async (proxy) => ethers.getContractAt('IdentityRegistryStorage', proxy.address));
  console.log(`- IdentityRegistryStorage (Proxy) deployed to: ${identityRegistryStorage.address}`);

  const defaultCompliance = await ethers.deployContract('DefaultCompliance', deployer);
  await defaultCompliance.deployed();
  console.log(`- DefaultCompliance module deployed to: ${defaultCompliance.address}`);

  const identityRegistry = await ethers
    .deployContract(
      'IdentityRegistryProxy',
      [trexImplementationAuthority.address, trustedIssuersRegistry.address, claimTopicsRegistry.address, identityRegistryStorage.address],
      deployer,
    )
    .then(async (proxy) => ethers.getContractAt('IdentityRegistry', proxy.address));
  console.log(`- IdentityRegistry (Proxy) deployed to: ${identityRegistry.address}`);

  // The deployer will be the initial owner/issuer of the token
  const tokenOID = await deployIdentityProxy(identityImplementationAuthority.address, deployer.address, deployer);

  const tokenName = 'TREXDINO';
  const tokenSymbol = 'TREX';
  const tokenDecimals = 0; // Using number instead of BigNumber for simplicity in deploy script
  const token = await ethers
    .deployContract(
      'TokenProxy',
      [
        trexImplementationAuthority.address,
        identityRegistry.address,
        defaultCompliance.address,
        tokenName,
        tokenSymbol,
        tokenDecimals,
        tokenOID.address,
      ],
      deployer,
    )
    .then(async (proxy) => ethers.getContractAt('Token', proxy.address));
  console.log(`- Token "${tokenName}" (${tokenSymbol}) (Proxy) deployed to: ${token.address}\n`);

  // =======================================================================
  // PHASE 4: Post-Deployment Wiring & Initialization
  // =======================================================================
  console.log('Phase 4: Configuring permissions and initial state...');
  await identityRegistryStorage.connect(deployer).bindIdentityRegistry(identityRegistry.address);
  console.log('- IdentityRegistryStorage bound to IdentityRegistry.');

  // Grant the deployer account agent permissions on the token and registry
  await token.connect(deployer).addAgent(deployer.address);
  console.log('- Deployer set as an Agent on the Token.');
  await identityRegistry.connect(deployer).addAgent(deployer.address);
  await identityRegistry.connect(deployer).addAgent(token.address);
  console.log('- Deployer and Token contract set as Agents on the IdentityRegistry.');

  // Configure a sample claim topic
  const claimTopics = [ethers.utils.id('KYC_AML_VERIFIED')];
  await claimTopicsRegistry.connect(deployer).addClaimTopic(claimTopics[0]);
  console.log(`- Claim Topic "KYC_AML_VERIFIED" (${claimTopics[0]}) added.`);

  // Deploy and configure a sample Claim Issuer contract, owned by the deployer
  const claimIssuerContract = await ethers.deployContract('ClaimIssuer', [deployer.address], deployer);
  await claimIssuerContract.deployed();
  await claimIssuerContract
    .connect(deployer)
    .addKey(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['address'], [claimIssuerSigningKey.address])), 3, 1);
  console.log(`- ClaimIssuer contract deployed at: ${claimIssuerContract.address}`);
  console.log(`- Associated signing key (for off-chain use): ${claimIssuerSigningKey.address}`);

  // Trust the newly deployed Claim Issuer
  await trustedIssuersRegistry.connect(deployer).addTrustedIssuer(claimIssuerContract.address, claimTopics);
  console.log('- ClaimIssuer added to TrustedIssuersRegistry.');

  // Unpause the token to allow transfers
  await token.connect(deployer).unpause();
  console.log('- Token has been unpaused and is now transferable.');

  console.log('\n✅ TREX suite deployment and configuration complete!');
  console.log('====================================================');
  console.log('Deployer has all administrative and operational roles.');
  console.log('====================================================');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
