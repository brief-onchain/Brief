const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const network = hre.network.name;
  const deploymentPath = `./deployments/${network}_deployment.json`;

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const proxyAddress = process.env.BRIEF_PROXY_ADDRESS || deployment.proxy;
  const contractName =
    process.env.BRIEF_UPGRADE_CONTRACT_NAME ||
    process.env.BRIEF_CONTRACT_NAME ||
    deployment.contractName ||
    'BriefAgentNFA';

  if (!proxyAddress) {
    throw new Error('Proxy address missing. Set BRIEF_PROXY_ADDRESS or ensure deployments/*.json has proxy.');
  }

  console.log(`\n♻️ Upgrading proxy on ${network}...`);
  console.log('🔗 Proxy:', proxyAddress);
  console.log('🏷️ New implementation contract:', contractName);

  const ContractFactory = await hre.ethers.getContractFactory(contractName);
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, ContractFactory);
  await upgraded.deployed();

  const newImplementation = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log('✅ Upgrade complete');
  console.log('🧩 New implementation:', newImplementation);

  const nextDeployment = {
    ...deployment,
    contractName,
    implementation: newImplementation,
    upgradedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deploymentPath, JSON.stringify(nextDeployment, null, 2));
  console.log('💾 Deployment info updated:', deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
