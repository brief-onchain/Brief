import {
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  getAddress,
  http,
  isAddress,
  parseAbi,
  parseEventLogs,
  type Address,
} from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { pickLocale, type LocaleCode, type LocaleTextMap } from "./i18n";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH = `0x${"0".repeat(64)}` as const;

const NFA_ABI = parseAbi([
  "function MINT_FEE() view returns (uint256)",
  "function getFreeMints(address user) view returns (uint256)",
  "function createAgent(address to,address logicAddress,string metadataURI,(string persona,string experience,string voiceHash,string animationURI,string vaultURI,bytes32 vaultHash) extendedMetadata) payable returns (uint256)",
  "function fundAgent(uint256 tokenId) payable",
  "function withdrawFromAgent(uint256 tokenId,uint256 amount)",
  "event AgentCreated(uint256 indexed tokenId,address indexed owner,address logicAddress,string metadataURI)",
]);

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
};

function 文(locale: LocaleCode, map: LocaleTextMap<string>): string {
  return pickLocale(locale, map);
}

function getProvider(locale: LocaleCode): Eip1193Provider {
  const p = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  if (!p)
    throw new Error(
      文(locale, {
        en: "Wallet not detected. Please install and connect a wallet first.",
        "zh-CN": "未检测到钱包，请先安装并连接钱包",
        "zh-TW": "未檢測到錢包，請先安裝並連接錢包",
        ko: "지갑이 감지되지 않았습니다. 먼저 설치 후 연결하세요.",
      })
    );
  return p;
}

function pickChain(chainId: number) {
  return Number(chainId) === 97 ? bscTestnet : bsc;
}

async function getWalletAndPublic(args: { chainId: number; rpcUrl?: string; locale?: LocaleCode }) {
  const locale = args.locale || "zh-CN";
  const provider = getProvider(locale);
  const chain = pickChain(args.chainId);
  const walletClient = createWalletClient({
    chain,
    transport: custom(provider),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(String(args.rpcUrl || chain.rpcUrls.default.http[0] || "").trim() || undefined),
  });
  const [account] = await walletClient.requestAddresses();
  if (!account)
    throw new Error(
      文(locale, {
        en: "Failed to get wallet address",
        "zh-CN": "未获取到钱包地址",
        "zh-TW": "未取得錢包地址",
        ko: "지갑 주소를 가져오지 못했습니다",
      })
    );
  return { walletClient, publicClient, account: getAddress(account) as Address };
}

function toAddress(v: string, locale: LocaleCode): Address {
  if (!isAddress(v))
    throw new Error(
      文(locale, {
        en: "Invalid contract address",
        "zh-CN": "合约地址无效",
        "zh-TW": "合約地址無效",
        ko: "컨트랙트 주소가 올바르지 않습니다",
      })
    );
  return getAddress(v);
}

function toTokenId(v: string, locale: LocaleCode): bigint {
  try {
    return BigInt(String(v || "").trim());
  } catch {
    throw new Error(
      文(locale, {
        en: "Invalid tokenId",
        "zh-CN": "tokenId 无效",
        "zh-TW": "tokenId 無效",
        ko: "tokenId가 올바르지 않습니다",
      })
    );
  }
}

function toWei(v: string, locale: LocaleCode): bigint {
  try {
    return BigInt(String(v || "0").trim() || "0");
  } catch {
    throw new Error(
      文(locale, {
        en: "Invalid amount format",
        "zh-CN": "金额格式无效",
        "zh-TW": "金額格式無效",
        ko: "금액 형식이 올바르지 않습니다",
      })
    );
  }
}

export async function createOnchainAgent(args: {
  contract: string;
  chainId: number;
  rpcUrl?: string;
  metadataURI?: string;
  locale?: LocaleCode;
}): Promise<{
  txHash: string;
  tokenId?: string;
  paidWei: string;
}> {
  const locale = args.locale || "zh-CN";
  const contract = toAddress(args.contract, locale);
  const { walletClient, publicClient, account } = await getWalletAndPublic(args);

  const [mintFee, freeMints] = await Promise.all([
    publicClient.readContract({ abi: NFA_ABI, address: contract, functionName: "MINT_FEE" }),
    publicClient.readContract({ abi: NFA_ABI, address: contract, functionName: "getFreeMints", args: [account] }),
  ]);

  const payValue = freeMints > 0n ? 0n : mintFee;
  const data = encodeFunctionData({
    abi: NFA_ABI,
    functionName: "createAgent",
    args: [
      account,
      ZERO_ADDRESS,
      args.metadataURI || "",
      {
        persona: '{"mode":"brief","style":"concise"}',
        experience: "BRIEF onchain agent",
        voiceHash: "brief-default",
        animationURI: "",
        vaultURI: "",
        vaultHash: ZERO_HASH,
      },
    ],
  });

  const txHash = await walletClient.sendTransaction({
    account,
    to: contract,
    data,
    value: payValue,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(
      文(locale, {
        en: "Onchain agent creation transaction failed",
        "zh-CN": "创建链上 Agent 交易失败",
        "zh-TW": "建立鏈上 Agent 交易失敗",
        ko: "온체인 Agent 생성 트랜잭션이 실패했습니다",
      })
    );
  }

  const createdLogs = parseEventLogs({
    abi: NFA_ABI,
    eventName: "AgentCreated",
    logs: receipt.logs,
    strict: false,
  }) as Array<{ address: Address; args: { tokenId?: bigint; owner?: Address } }>;

  const found = createdLogs.find((x) => x.address.toLowerCase() === contract.toLowerCase() && (!x.args.owner || x.args.owner.toLowerCase() === account.toLowerCase()));
  const tokenId = found?.args?.tokenId;

  return {
    txHash,
    tokenId: typeof tokenId === "bigint" ? tokenId.toString() : undefined,
    paidWei: payValue.toString(),
  };
}

export async function fundOnchainAgent(args: {
  contract: string;
  chainId: number;
  rpcUrl?: string;
  tokenId: string;
  amountWei: string;
  locale?: LocaleCode;
}): Promise<{ txHash: string }> {
  const locale = args.locale || "zh-CN";
  const contract = toAddress(args.contract, locale);
  const tokenId = toTokenId(args.tokenId, locale);
  const amount = toWei(args.amountWei, locale);
  if (amount <= 0n)
    throw new Error(
      文(locale, {
        en: "Funding amount must be greater than 0",
        "zh-CN": "充值金额必须大于 0",
        "zh-TW": "充值金額必須大於 0",
        ko: "충전 금액은 0보다 커야 합니다",
      })
    );
  const { walletClient, publicClient, account } = await getWalletAndPublic(args);

  const data = encodeFunctionData({
    abi: NFA_ABI,
    functionName: "fundAgent",
    args: [tokenId],
  });
  const txHash = await walletClient.sendTransaction({
    account,
    to: contract,
    data,
    value: amount,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success")
    throw new Error(
      文(locale, {
        en: "Funding transaction failed",
        "zh-CN": "充值交易失败",
        "zh-TW": "充值交易失敗",
        ko: "충전 트랜잭션 실패",
      })
    );
  return { txHash };
}

export async function withdrawOnchainAgent(args: {
  contract: string;
  chainId: number;
  rpcUrl?: string;
  tokenId: string;
  amountWei: string;
  locale?: LocaleCode;
}): Promise<{ txHash: string }> {
  const locale = args.locale || "zh-CN";
  const contract = toAddress(args.contract, locale);
  const tokenId = toTokenId(args.tokenId, locale);
  const amount = toWei(args.amountWei, locale);
  if (amount <= 0n)
    throw new Error(
      文(locale, {
        en: "Withdraw amount must be greater than 0",
        "zh-CN": "提取金额必须大于 0",
        "zh-TW": "提取金額必須大於 0",
        ko: "출금 금액은 0보다 커야 합니다",
      })
    );
  const { walletClient, publicClient, account } = await getWalletAndPublic(args);

  const data = encodeFunctionData({
    abi: NFA_ABI,
    functionName: "withdrawFromAgent",
    args: [tokenId, amount],
  });
  const txHash = await walletClient.sendTransaction({
    account,
    to: contract,
    data,
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success")
    throw new Error(
      文(locale, {
        en: "Withdraw transaction failed",
        "zh-CN": "提取交易失败",
        "zh-TW": "提取交易失敗",
        ko: "출금 트랜잭션 실패",
      })
    );
  return { txHash };
}

export async function payAgentRent(args: {
  contract: string;
  chainId: number;
  rpcUrl?: string;
  tokenId: string;
  amountWei: string;
  locale?: LocaleCode;
}): Promise<{ txHash: string }> {
  return fundOnchainAgent(args);
}
