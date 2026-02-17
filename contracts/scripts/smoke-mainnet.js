const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const deploymentPath = './deployments/mainnet_deployment.json';
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const proxy = process.env.BRIEF_PROXY_ADDRESS || deployment.proxy;
  if (!proxy) {
    throw new Error('Proxy address missing.');
  }

  const ContractFactory = await hre.ethers.getContractFactory(deployment.contractName || 'BriefAgentNFA');
  const nfa = ContractFactory.attach(proxy);
  const [signer] = await hre.ethers.getSigners();

  console.log('network=mainnet');
  console.log(`contract=${proxy}`);
  console.log(`signer=${signer.address}`);

  const metadata = {
    persona: JSON.stringify({
      traits: ['risk-focused', 'concise'],
      style: 'brief',
      tone: 'pragmatic',
    }),
    experience: 'BRIEF mainnet smoke test agent',
    voiceHash: 'brief_smoke_voice',
    animationURI: '',
    vaultURI: '',
    vaultHash: hre.ethers.utils.formatBytes32String('brief-smoke'),
  };

  const createTx = await nfa.createAgent(
    signer.address,
    hre.ethers.constants.AddressZero,
    `brief://smoke/${Date.now()}`,
    metadata,
  );
  const createRc = await createTx.wait();
  const createEvent = createRc.events.find((e) => e.event === 'AgentCreated');
  if (!createEvent) {
    throw new Error('AgentCreated event not found');
  }
  const tokenId = createEvent.args.tokenId.toString();
  console.log(`create_tx=${createRc.transactionHash}`);
  console.log(`token_id=${tokenId}`);

  const fundAmount = hre.ethers.utils.parseEther(process.env.SMOKE_FUND_BNB || '0.00012');
  const fundTx = await nfa.fundAgent(tokenId, { value: fundAmount });
  const fundRc = await fundTx.wait();
  console.log(`fund_tx=${fundRc.transactionHash}`);
  console.log(`fund_amount_wei=${fundAmount.toString()}`);

  const withdrawAmount = hre.ethers.utils.parseEther(process.env.SMOKE_WITHDRAW_BNB || '0.00005');
  const withdrawTx = await nfa.withdrawFromAgent(tokenId, withdrawAmount);
  const withdrawRc = await withdrawTx.wait();
  console.log(`withdraw_tx=${withdrawRc.transactionHash}`);
  console.log(`withdraw_amount_wei=${withdrawAmount.toString()}`);

  const state = await nfa.getAgentState(tokenId);
  console.log(`agent_balance_wei=${state.balance.toString()}`);
  console.log('smoke_ok=true');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
