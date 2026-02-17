import { createPublicClient, formatEther, getAddress, http, isAddress, parseAbi, parseEventLogs, type Address } from "viem";
import { bsc, bscTestnet } from "viem/chains";
import { pickLocaleText, type Locale, type LocaleTextMap } from "./i18n.js";

const NFA_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function MINT_FEE() view returns (uint256)",
  "event AgentFunded(uint256 indexed tokenId, uint256 amount)",
]);

export type NfaOnchainConfig = {
  enabled: boolean;
  chainId: 56 | 97;
  rpcUrl: string;
  contract?: Address;
};

type VerifyRentFundingTxArgs = {
  config: NfaOnchainConfig;
  expectedContract: string;
  expectedTokenId: string;
  expectedCaller: string;
  minAmountWei: string;
  txHash: string;
  lang?: Locale;
};

type VerifyRentFundingTxResult =
  | { ok: true; paidWei: string; blockNumber: string }
  | { ok: false; error: string };

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

function 文(lang: Locale, map: LocaleTextMap<string>): string {
  return pickLocaleText(lang, map);
}

function normalizeHash(v: string): string {
  return String(v || "").trim().toLowerCase();
}

function parseWei(v: string): bigint {
  try {
    return BigInt(String(v || "0").trim() || "0");
  } catch {
    return 0n;
  }
}

function normalizeChainId(v: string): 56 | 97 {
  const n = Number.parseInt(v || "56", 10);
  return n === 97 ? 97 : 56;
}

export function readNfaOnchainConfig(): NfaOnchainConfig {
  const chainId = normalizeChainId(envStr("BRIEF_NFA_CHAIN_ID") || "56");
  const defaultRpc = chainId === 97 ? "https://data-seed-prebsc-1-s1.binance.org:8545/" : "https://bsc-dataseed.binance.org/";
  const rpcUrl = envStr("BRIEF_NFA_RPC_URL") || envStr("BSC_RPC_URL") || defaultRpc;
  const contractRaw = envStr("BRIEF_NFA_CONTRACT");
  const contract = isAddress(contractRaw) ? getAddress(contractRaw) : undefined;
  return {
    enabled: Boolean(contract),
    chainId,
    rpcUrl,
    contract,
  };
}

function makeClient(config: NfaOnchainConfig) {
  const chain = config.chainId === 97 ? bscTestnet : bsc;
  return createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });
}

export async function readNfaContractMeta(config: NfaOnchainConfig): Promise<{
  name: string;
  symbol: string;
  mintFeeWei: string;
  mintFeeBnb: string;
} | null> {
  if (!config.enabled || !config.contract) return null;
  const client = makeClient(config);
  try {
    const [name, symbol, mintFee] = await Promise.all([
      client.readContract({ abi: NFA_ABI, address: config.contract, functionName: "name" }),
      client.readContract({ abi: NFA_ABI, address: config.contract, functionName: "symbol" }),
      client.readContract({ abi: NFA_ABI, address: config.contract, functionName: "MINT_FEE" }),
    ]);
    return {
      name: String(name),
      symbol: String(symbol),
      mintFeeWei: mintFee.toString(),
      mintFeeBnb: formatEther(mintFee),
    };
  } catch {
    return null;
  }
}

export async function verifyRentFundingTx(args: VerifyRentFundingTxArgs): Promise<VerifyRentFundingTxResult> {
  const lang: Locale = args.lang || "zh-CN";
  if (!args.config.enabled || !args.config.contract) {
    return {
      ok: false,
      error: 文(lang, {
        en: "Onchain contract is not configured, payment verification is unavailable",
        "zh-CN": "链上合约未配置，无法校验付费交易",
        "zh-TW": "鏈上合約未配置，無法校驗付費交易",
        ko: "온체인 컨트랙트가 설정되지 않아 결제 검증을 수행할 수 없습니다",
      }),
    };
  }
  if (!isAddress(args.expectedCaller)) {
    return {
      ok: false,
      error: 文(lang, {
        en: "Caller address is invalid",
        "zh-CN": "调用方地址无效",
        "zh-TW": "調用方地址無效",
        ko: "호출자 주소가 유효하지 않습니다",
      }),
    };
  }
  if (!isAddress(args.expectedContract)) {
    return {
      ok: false,
      error: 文(lang, {
        en: "Agent-bound contract address is invalid",
        "zh-CN": "助手绑定的合约地址无效",
        "zh-TW": "助手綁定的合約地址無效",
        ko: "에이전트에 바인딩된 컨트랙트 주소가 유효하지 않습니다",
      }),
    };
  }

  const txHash = normalizeHash(args.txHash);
  if (!/^0x[0-9a-f]{64}$/.test(txHash)) {
    return {
      ok: false,
      error: 文(lang, {
        en: "Payment transaction hash format is invalid",
        "zh-CN": "支付交易哈希格式无效",
        "zh-TW": "支付交易哈希格式無效",
        ko: "결제 트랜잭션 해시 형식이 유효하지 않습니다",
      }),
    };
  }

  let expectedTokenId: bigint;
  try {
    expectedTokenId = BigInt(String(args.expectedTokenId || "").trim());
  } catch {
    return {
      ok: false,
      error: 文(lang, {
        en: "Agent-bound tokenId is invalid",
        "zh-CN": "助手绑定的 tokenId 无效",
        "zh-TW": "助手綁定的 tokenId 無效",
        ko: "에이전트에 바인딩된 tokenId가 유효하지 않습니다",
      }),
    };
  }
  const minAmount = parseWei(args.minAmountWei);
  const expectedCaller = getAddress(args.expectedCaller).toLowerCase();
  const expectedContract = getAddress(args.expectedContract).toLowerCase();

  const client = makeClient(args.config);
  try {
    const [tx, receipt] = await Promise.all([
      client.getTransaction({ hash: txHash as `0x${string}` }),
      client.getTransactionReceipt({ hash: txHash as `0x${string}` }),
    ]);

    if (receipt.status !== "success") {
      return {
        ok: false,
        error: 文(lang, {
          en: "Payment transaction failed on-chain",
          "zh-CN": "支付交易未成功上链",
          "zh-TW": "支付交易未成功上鏈",
          ko: "결제 트랜잭션이 온체인에서 성공하지 않았습니다",
        }),
      };
    }
    if (!tx.to || tx.to.toLowerCase() !== expectedContract) {
      return {
        ok: false,
        error: 文(lang, {
          en: "Payment target contract does not match",
          "zh-CN": "支付交易目标合约不匹配",
          "zh-TW": "支付交易目標合約不匹配",
          ko: "결제 대상 컨트랙트가 일치하지 않습니다",
        }),
      };
    }
    if (tx.from.toLowerCase() !== expectedCaller) {
      return {
        ok: false,
        error: 文(lang, {
          en: "Payment sender does not match current wallet",
          "zh-CN": "支付交易发送者与当前钱包不一致",
          "zh-TW": "支付交易發送者與當前錢包不一致",
          ko: "결제 발신자가 현재 지갑과 일치하지 않습니다",
        }),
      };
    }
    if (tx.value < minAmount) {
      return {
        ok: false,
        error: 文(lang, {
          en: "Insufficient payment amount for this agent rent",
          "zh-CN": "支付金额不足，未达到该 Agent 的租金要求",
          "zh-TW": "支付金額不足，未達到該 Agent 的租金要求",
          ko: "결제 금액이 부족하여 해당 Agent의 요금 조건을 충족하지 못했습니다",
        }),
      };
    }

    const fundedLogs = parseEventLogs({
      abi: NFA_ABI,
      eventName: "AgentFunded",
      logs: receipt.logs,
      strict: false,
    }) as Array<{ address: Address; args: { tokenId?: bigint; amount?: bigint } }>;

    const matched = fundedLogs.some((log) => {
      const tokenId = log.args?.tokenId;
      const amount = log.args?.amount;
      return (
        log.address.toLowerCase() === expectedContract &&
        typeof tokenId === "bigint" &&
        typeof amount === "bigint" &&
        tokenId === expectedTokenId &&
        amount >= minAmount
      );
    });

    if (!matched) {
      return {
        ok: false,
        error: 文(lang, {
          en: "No matching AgentFunded event found in transaction",
          "zh-CN": "交易中未找到匹配该 Agent 的充值事件",
          "zh-TW": "交易中未找到匹配該 Agent 的充值事件",
          ko: "트랜잭션에서 해당 Agent에 일치하는 충전 이벤트를 찾지 못했습니다",
        }),
      };
    }

    return {
      ok: true,
      paidWei: tx.value.toString(),
      blockNumber: receipt.blockNumber.toString(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "rent_tx_verify_failed";
    return {
      ok: false,
      error: 文(lang, {
        en: `Payment verification failed: ${msg}`,
        "zh-CN": `支付交易校验失败: ${msg}`,
        "zh-TW": `支付交易校驗失敗: ${msg}`,
        ko: `결제 트랜잭션 검증 실패: ${msg}`,
      }),
    };
  }
}
