/**
 * Asset configuration for models and coins
 * Centralized mapping of symbols, full names, and icons
 */

// Import model icons
import groqIcon from '~/assets/icons/model/groq.webp'
import gptIcon from '~/assets/icons/model/gpt.png'
import claudeIcon from '~/assets/icons/model/claude.png'
import geminiIcon from '~/assets/icons/model/gemini.webp'
import deepseekIcon from '~/assets/icons/model/deepseek.png'
import qwenIcon from '~/assets/icons/model/qwen.png'

export interface CoinConfig {
  symbol: string
  fullName: string
  icon: string
}

export interface ModelConfig {
  identifier: string | string[] // Pattern(s) to match in model name
  fullName: string
  icon: string
  color?: string // Color theme for the model
}

/**
 * Coin configurations
 * Maps coin symbols to their full names and icons
 */
export const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  BNB: 'Binance Coin',
  XRP: 'XRP',
  DOGE: 'Dogecoin',
  HYPE: 'Hyperliquid',
  LINK: 'Chainlink',
  ZEC: 'Zcash',
  PROM: 'Prom',
  '4': '4',
  ARB: 'Arbitrum',
  CRV: 'Curve DAO',
  OP: 'Optimism',
  UNI: 'Uniswap',
  NEAR: 'NEAR Protocol',
  STX: 'Stacks',
}

/**
 * Model configurations
 * Maps model name patterns to their full names and icons
 */
export const MODELS: ModelConfig[] = [
  {
    identifier: ['groq', 'grok'],
    fullName: 'Groq',
    icon: groqIcon,
    color: 'gray',
  },
  {
    identifier: ['gpt', 'openai'],
    fullName: 'GPT',
    icon: gptIcon,
    color: 'green',
  },
  {
    identifier: ['claude', 'anthropic'],
    fullName: 'Claude',
    icon: claudeIcon,
    color: 'orange',
  },
  {
    identifier: ['gemini', 'google'],
    fullName: 'Gemini',
    icon: geminiIcon,
    color: 'sky',
  },
  {
    identifier: ['deepseek'],
    fullName: 'DeepSeek',
    icon: deepseekIcon,
    color: 'blue',
  },
  {
    identifier: ['qwen'],
    fullName: 'Qwen',
    icon: qwenIcon,
    color: 'purple',
  },
]

/**
 * Get coin configuration by symbol
 * @param symbol - Coin symbol (e.g., 'BTC', 'ETH')
 * @returns CoinConfig or undefined if not found
 */
export function coinBase(symbol: string): string {
  return symbol.toUpperCase().replace(/(USDT|USDC|USD)$/, '')
}

export function coinIconUrl(symbol: string): string {
  const base = coinBase(symbol)
  return base ? `https://files.coinswitch.co/public/coins/${base.toLowerCase()}.png` : ''
}

export function getCoinConfig(symbol: string): CoinConfig | undefined {
  const base = coinBase(symbol)
  if (!base) return undefined
  return { symbol: base, fullName: COIN_NAMES[base] ?? base, icon: coinIconUrl(base) }
}

/**
 * Get model configuration by model name
 * Matches model name against identifier patterns
 * @param modelName - Model name to match
 * @returns ModelConfig or undefined if not found
 */
export function getModelConfig(modelName: string): ModelConfig | undefined {
  const nameLower = modelName.toLowerCase()
  
  for (const model of MODELS) {
    const identifiers = Array.isArray(model.identifier) 
      ? model.identifier 
      : [model.identifier]
    
    if (identifiers.some(id => nameLower.includes(id.toLowerCase()))) {
      return model
    }
  }
  
  return undefined
}

/**
 * Get coin icon path by symbol
 * @param symbol - Coin symbol
 * @returns Icon path or empty string if not found
 */
export function getCoinIcon(symbol: string): string {
  return coinIconUrl(symbol)
}

/**
 * Get model icon path by model name
 * @param modelName - Model name
 * @returns Icon path or default GPT icon if not found
 */
export function getModelIcon(modelName: string): string {
  const config = getModelConfig(modelName)
  return config?.icon || gptIcon
}

/**
 * Get coin full name by symbol
 * @param symbol - Coin symbol
 * @returns Full name or symbol if not found
 */
export function getCoinFullName(symbol: string): string {
  const config = getCoinConfig(symbol)
  return config?.fullName || symbol
}

/**
 * Get model full name by model name
 * @param modelName - Model name
 * @returns Full name or model name if not found
 */
export function getModelFullName(modelName: string): string {
  const config = getModelConfig(modelName)
  return config?.fullName || modelName
}

/**
 * Get model color by model name
 * @param modelName - Model name
 * @returns Color name or 'blue' as default if not found
 */
export function getModelColor(modelName: string): string {
  const config = getModelConfig(modelName)
  return config?.color || 'blue'
}
