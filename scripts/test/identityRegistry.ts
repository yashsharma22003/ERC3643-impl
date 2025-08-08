import { ethers } from 'hardhat';
import { Contract, Signer } from 'ethers';
import OnchainID from '@onchain-id/solidity';
import { token } from '../../typechain-types/contracts';

const TOKEN_ADDRESS = '0x5f3f1dBD7B74C6B46e8c44f98792A1dAf8d69154';
const IDENTITY_REGISTRY_ADDRESS = '0x4c5859f0F772848b2D91F1D83E2Fe57935348029';
const CLAIM_ISSUER_ADDRESS = '0x4A679253410272dd5232B3Ff7cF5dbB88f295319';
const IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS = '0x998abeb3E57409262aE5b751f60747921B33613E';

// The claim topic hash from your deployment output
const KYC_AML_CLAIM_TOPIC = '0x18be04bd8d115b448043fa0b06bdadd1fadc4027c7123595b5671541dbaae317';

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
    const [deployer, investor, anotherInvestor, unverifiedUser] = await ethers.getSigners();
    console.log("creating Identity");
    const investorIdentity = await createIdentity(investor, IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS);
    console.log("Identitity=", investorIdentity);

    console.log("Initialzing identity registry contract instant");
    const identityRegistry = await ethers.getContractAt('IdentityRegistry', IDENTITY_REGISTRY_ADDRESS, deployer);

    console.log("Registering Identity for deployer");
    const deployerIdentity = await createIdentity(deployer, IDENTITY_IMPLEMENTATION_AUTHORITY_ADDRESS);


    console.log("Registering identities...");
    const registrytx = await identityRegistry.connect(deployer).registerIdentity(deployer.address, deployerIdentity.address, 0);
    const registrytx2 = await identityRegistry.connect(deployer).registerIdentity(investor.address, investorIdentity.address, 0);
    
    console.log("identity registered", registrytx);
    console.log("identity registered", registrytx2);


    const token = await ethers.getContractAt("Token", TOKEN_ADDRESS);
    console.log("Minting 100 tokens for deployer", deployer.address);
    const minttx = await token.connect(deployer).mint(deployer.address, ethers.utils.parseEther("100"));
    console.log("mint tx = ", minttx);

    console.log('Transfering token to investor', investor.address);
    const transfertx = await token.connect(deployer).transfer(investor.address, ethers.utils.parseEther("1"));
    console.log("Transfer tx = ", transfertx);
}

main();