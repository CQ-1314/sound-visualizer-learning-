/**
 * 关卡数据层（第 4 周 D 交付：LearningView 关卡页骨架 + 接 C 的 /api/units）
 * ---------------------------------------------------------------------------
 * 数据来源与优先级：
 *   1) CMS（后端 /api/units，C 负责）：示范、练习步骤、常见误区、检测开关、审核状态
 *   2) 冻结表（src/data/levels.ts，CON-02）：关卡 ID / 顺序 / 目标音 / 分组 / 例字 / 文案位
 *
 * 硬规则（排期第七节「到点宁可不发布，不许空页面 / 假分」）：
 *   - CMS 未发布 → 该关一律「未开放」，不渲染检测入口、不出现任何分数；
 *   - 已发布但未开放检测 → 只能学（示范 + 练习），检测按钮不出现；
 *   - 已发布且开放检测 → 才出现录音 → 结果页闭环。
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { levelsApi } from '@/api'
import type { CmsUnit } from '@/types'
import { LEVELS, GROUP_LABELS, resolveLevel, type LevelDef } from '@/data/levels'

export type LevelAvailability = 'open' | 'learn_only' | 'unopened'

export interface LevelView extends LevelDef {
  /** CMS 中命中的单元 id（L01 或历史别名），未命中为 null */
  cmsId: string | null
  /** 是否已由 CMS 录入并发布 */
  published: boolean
  /** 是否开放检测（分级开放：不能稳定评分的关只学不测） */
  detectionOpen: boolean
  /** 可用状态：可练可测 / 只能学 / 未开放 */
  availability: LevelAvailability
  /** CMS 内容（示范、练习、误区）；未发布为 null */
  unit: CmsUnit | null
}

function buildView(def: LevelDef, byId: Map<string, CmsUnit>): LevelView {
  // 优先用 L01–L30 正式 id；未建库时回落到历史别名（联调过渡）
  const unit = byId.get(def.code) ?? def.cmsIds.map(id => byId.get(id)).find(Boolean) ?? null
  const published = !!unit && unit.status === 'published'
  const detectionOpen = published && !!unit?.verified
  const availability: LevelAvailability = detectionOpen
    ? 'open'
    : published
      ? 'learn_only'
      : 'unopened'

  return {
    ...def,
    cmsId: unit?.id ?? null,
    published,
    detectionOpen,
    availability,
    unit,
  }
}

export const useLevelsStore = defineStore('levels', () => {
  /** CMS 已发布单元（按 id 索引） */
  const publishedUnits = ref<CmsUnit[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  const byId = computed(() => new Map(publishedUnits.value.map(u => [u.id, u])))

  /** 30 关全量视图（冻结表 + CMS 数据合并），顺序即关卡顺序 */
  const levels = computed<LevelView[]>(() =>
    LEVELS.map(def => buildView(def, byId.value)).sort((a, b) => a.order - b.order)
  )

  /** 按分组给关卡页列表用：单韵母 → 声母 → 拼读 */
  const levelGroups = computed(() =>
    (['final', 'initial', 'syllable'] as const).map(key => ({
      key,
      label: GROUP_LABELS[key],
      items: levels.value.filter(l => l.group === key),
    }))
  )

  const openedCount = computed(() => levels.value.filter(l => l.availability === 'open').length)
  const learnOnlyCount = computed(() => levels.value.filter(l => l.availability === 'learn_only').length)
  const unopenedCount = computed(() => levels.value.filter(l => l.availability === 'unopened').length)

  function getLevel(code: string): LevelView | undefined {
    const def = resolveLevel(code)
    return def ? levels.value.find(l => l.code === def.code) : undefined
  }

  /** 拉取 CMS 已发布单元；成功后合并到冻结表。失败不清空旧数据，只置 error。 */
  async function fetchLevels(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    error.value = null
    try {
      const res = await levelsApi.list('published')
      publishedUnits.value = Array.isArray(res.data) ? (res.data as CmsUnit[]) : []
      loaded.value = true
    } catch (e) {
      // 联调期后端未启动时给出明确文案，页面据此显示错误态
      error.value = '关卡数据加载失败：请确认 C 的后端 /api/units 已启动'
      console.error('[levels] fetch failed', e)
    } finally {
      loading.value = false
    }
  }

  return {
    publishedUnits, loading, error, loaded,
    levels, levelGroups, openedCount, learnOnlyCount, unopenedCount,
    getLevel, fetchLevels,
  }
})
