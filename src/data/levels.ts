/**
 * 30 关 L01–L30 冻结表（前端侧读取器）
 * ---------------------------------------------------------------------------
 * 唯一真源：src/data/levels.freeze.json（后端联调脚本 backend/tools/seed_levels_30.py 读同一份，
 * 避免前后端各写一套关卡表）。
 *
 * 依据：《团队学习与第一二学期开发周排期详细方案》第 4 周（9/21–9/27）· 卡点 CON-02（09-22）
 *   冻结口径：30 关的 ID、顺序、每关目标音
 *     6 单韵母（L01–L06）+ 23 声母〔21 + y + w〕（L07–L29）+「妈」拼读 m+a 及 mā/má/mǎ/mà（L30）
 *   此后不得为凑数改 ID 或插空关。
 *
 * 分工口径：
 *   - 本文件只冻结「关卡身份」（ID / 顺序 / 目标音 / 分组 / 例字）与「文案位」；
 *   - 「示范音频、练习步骤、检测开关、审核状态、版本」一律由 CMS（后端 /api/units，C 负责）决定，
 *     见 src/stores/levels.ts：CMS 没录入 / 没发布 → 该关显示「未开放」，不出现检测入口、不出现分数；
 *   - cmsIds 是「历史已发布单元」的别名，仅用于 1.0 收敛期的联调过渡；C 按 30 关正式建库后
 *     以 unit.id === level.code（L01…L30）为准，别名自动失效。
 */
import freeze from './levels.freeze.json'

/** CON-02 冻结版本号：任何改动必须同步 C（CMS 建库）与 F（验收口径） */
export const LEVEL_FREEZE_VERSION: string = freeze.version

export type LevelGroup = 'final' | 'initial' | 'syllable'

export const GROUP_LABELS: Record<LevelGroup, string> = {
  final: '单韵母',
  initial: '声母',
  syllable: '拼读',
}

export interface FrozenLevel {
  code: string
  order: number
  /** 目标音（冻结） */
  target: string
  group: LevelGroup
  /** 展示用拼音（带声调，仅作读音提示） */
  pinyin: string
  /** 儿童端展示用例字 */
  char: string
  /** 历史已发布单元别名（联调过渡用） */
  cmsIds: string[]
}

export interface LevelDef extends FrozenLevel {
  /** 分组中文名 */
  groupLabel: string
  /** 儿童化引导语位（D 留位，G / I 定稿后替换；正式示范音以审核通过的录音为准） */
  childHint: string
}

const FROZEN_LEVELS = freeze.levels as unknown as FrozenLevel[]

/** 儿童化引导语模板（文案位）：按分组给出统一句式，具体文案由 G / I 定稿 */
function childHintFor(level: FrozenLevel): string {
  if (level.group === 'final') return `把嘴巴放松，跟着示范音慢慢读「${level.target}」。`
  if (level.group === 'initial') return `先摆好口型，再轻轻念出「${level.target}」。`
  return `声母加韵母，连起来读「${level.char}」：${level.pinyin}。`
}

export const LEVELS: LevelDef[] = FROZEN_LEVELS.map(level => ({
  ...level,
  groupLabel: GROUP_LABELS[level.group],
  childHint: childHintFor(level),
}))

export const LEVEL_COUNT = LEVELS.length
export const LEVEL_CODES = LEVELS.map(l => l.code)

const LEVEL_BY_CODE = new Map(LEVELS.map(l => [l.code, l]))

/** 按关卡 ID（L01–L30）取关卡定义 */
export function getLevelByCode(code: string): LevelDef | undefined {
  return LEVEL_BY_CODE.get(code.toUpperCase())
}

/** 兼容旧链接：按历史单元 id 反查所属关卡（如 /learn/ma_tone → L30） */
export function getLevelByCmsId(unitId: string): LevelDef | undefined {
  return LEVELS.find(l => l.cmsIds.includes(unitId))
}

/** 路由参数 → 关卡定义：既支持 L01–L30，也支持历史单元 id */
export function resolveLevel(idOrUnitId: string | undefined): LevelDef | undefined {
  if (!idOrUnitId) return undefined
  return getLevelByCode(idOrUnitId) ?? getLevelByCmsId(idOrUnitId)
}

/** 上一关 / 下一关（关卡页导航骨架） */
export function getLevelNeighbors(code: string): { prev?: LevelDef; next?: LevelDef } {
  const def = getLevelByCode(code)
  if (!def) return {}
  return {
    prev: LEVELS.find(l => l.order === def.order - 1),
    next: LEVELS.find(l => l.order === def.order + 1),
  }
}
