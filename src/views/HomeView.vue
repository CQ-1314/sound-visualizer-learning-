<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUnitsStore } from '@/stores/units'
import { FAQ_ITEMS, HOME_ACTIONS } from '@/data/coreUnits'
import { usePageCopy } from '@/composables/usePageCopy'
import { PAGES, type PageDef } from '@/data/pages'
import PageState from '@/components/PageState.vue'
import SiteFooter from '@/components/SiteFooter.vue'

const router = useRouter()
const unitsStore = useUnitsStore()
const searchQuery = ref('')

/** 儿童化文案位：P01（D 留位，G / I 定稿） */
const { copy } = usePageCopy('P01')

/** 单元区状态：loading / error / empty 三态互斥，加载完成且确实没有单元才算空 */
const unitsState = computed<'loading' | 'error' | 'empty' | null>(() => {
  if (unitsStore.loading) return 'loading'
  if (unitsStore.error) return 'error'
  if (!unitsStore.coreUnits.length) return 'empty'
  return null
})

onMounted(() => unitsStore.fetchPublished())

function doSearch() {
  router.push({ path: '/search', query: { q: searchQuery.value } })
}

function goAction(action: typeof HOME_ACTIONS[number]) {
  router.push(action.route)
}

function goFaq(item: typeof FAQ_ITEMS[number]) {
  router.push({ path: '/search', query: { q: item.keyword } })
}

/**
 * 家长入口 + 十页总览（第 5 周 D 交付）
 * ---------------------------------------------------------------------------
 * 为什么要加：侧边栏（App.vue）按 SRS D-15 只放孩子端 7 页，于是
 *   发音库 P06（/library）只有结果页一个「返回发音库」按钮能进，
 *   专业资料 P07（/materials）**全站零入口**，只能手输网址。
 *   结果页 P09（/feedback/:id）是流程页，本来也不该从导航进。
 * 这里在首页把十页列全并可直接点进去，孩子导航本身保持不动（D-15 不变）。
 */
interface PageRow extends PageDef {
  /** 可点击打开的首个 path（去掉带参数的，流程页不直接打开） */
  path: string
  openable: boolean
  role: string
  roleType: 'success' | 'warning' | 'info'
}

const tenPages: PageRow[] = PAGES.map(p => {
  const first = p.paths[0] ?? '/'
  const isParent = p.code === 'P06' || p.code === 'P07'
  const isFlow = p.code === 'P09'
  return {
    ...p,
    path: first,
    // 路径里带 :id 的是流程页，必须由上一页带参进入，不能凭空打开
    openable: !first.includes(':'),
    role: isFlow ? '流程页' : isParent ? '家长' : '孩子端',
    roleType: isFlow ? 'info' : isParent ? 'warning' : 'success',
  }
})

/** 家长向的两页：给自己一个显式入口，不用去翻十页表 */
const parentPages = tenPages.filter(p => p.role === '家长')

function openPage(p: PageRow) {
  if (p.openable) router.push(p.path)
}
</script>

<template>
  <div class="home-view">
    <section class="hero">
      <h1>看得见的声音</h1>
      <p class="tagline">搜一个音、看懂发音、跟着练、录音比较</p>
      <el-input
        v-model="searchQuery"
        size="large"
        placeholder="输入汉字、拼音或你的发音问题"
        prefix-icon="Search"
        clearable
        @keyup.enter="doSearch"
      >
        <template #append>
          <el-button type="primary" @click="doSearch">搜索</el-button>
        </template>
      </el-input>
    </section>

    <section class="actions">
      <el-button
        v-for="a in HOME_ACTIONS"
        :key="a.label"
        size="large"
        class="action-btn"
        @click="goAction(a)"
      >
        <strong>{{ a.label }}</strong>
        <span>{{ a.desc }}</span>
      </el-button>
    </section>

    <section class="faq">
      <h2>常见问题</h2>
      <div class="faq-list">
        <el-card v-for="f in FAQ_ITEMS" :key="f.q" shadow="hover" class="faq-card" @click="goFaq(f)">
          {{ f.q }}
        </el-card>
      </div>
    </section>

    <section class="units">
      <h2>首批学习单元（12个）</h2>
      <p class="subtitle">{{ copy.subtitle }}</p>

      <!-- 单元区的加载 / 错误 / 空态统一走文案位：后端没连上要说清，不能让人误以为「就是没有内容」 -->
      <PageState
        :state="unitsState"
        :copy="copy"
        :detail="unitsStore.error || undefined"
        @action="unitsStore.fetchPublished()"
      />

      <div v-if="unitsStore.coreUnits.length" class="unit-grid">
        <el-card
          v-for="u in unitsStore.coreUnits"
          :key="u.id"
          shadow="hover"
          class="unit-card"
          @click="router.push(`/learn/${u.id}`)"
        >
          <div class="char">{{ u.character }}</div>
          <div class="py">{{ u.pinyin }}</div>
          <p>{{ u.conclusion || u.description }}</p>
        </el-card>
      </div>
    </section>

    <section class="quick-test">
      <el-card shadow="never">
        <h2>快速体验</h2>
        <p>朗读「妈」字，约 30 秒，体验录音质量检查与声调分析。</p>
        <p class="meta">用途：临时体验检测流程；同意保存后才进入个人档案。</p>
        <el-button type="primary" size="large" @click="router.push('/test?unit=ma')">开始体验</el-button>
      </el-card>
    </section>

    <section class="parents">
      <h2>家长入口</h2>
      <p class="subtitle">
        发音库和专业资料是给家长看的，按 SRS D-15 不放进孩子导航（侧边栏），从这里进。
      </p>
      <div class="parent-actions">
        <el-button
          v-for="p in parentPages"
          :key="p.code"
          size="large"
          class="parent-btn"
          @click="router.push(p.path)"
        >
          <strong>{{ p.title }}</strong>
          <span>{{ p.childTitle }} · {{ p.path }}</span>
        </el-button>
      </div>
    </section>

    <section class="pages-index">
      <h2>十页总览（P01–P10）</h2>
      <p class="subtitle">
        页号与网址的唯一登记处是 <code>src/data/pages.ts</code>，这里按登记表把十页列全，方便逐页验收与跳转。
      </p>
      <div class="page-list">
        <div
          v-for="p in tenPages"
          :key="p.code"
          class="page-row"
          :class="{ 'is-disabled': !p.openable }"
          @click="openPage(p)"
        >
          <span class="page-code">{{ p.code }}</span>
          <code class="page-path">{{ p.path }}</code>
          <span class="page-title">{{ p.title }}</span>
          <span class="page-child">{{ p.childTitle }}</span>
          <el-tag size="small" :type="p.roleType" effect="plain">{{ p.role }}</el-tag>
        </div>
      </div>
      <p class="meta">「流程页」不直接打开：检测结果页（P09）需要先录一次音、由上一页带上关卡参数进入。</p>
    </section>

    <section class="profile-entry">
      <el-button text type="primary" @click="router.push('/archive')">进入我的声音档案 →</el-button>
      <span class="guest-hint">未登录也可临时体验；保存记录需先同意隐私说明。</span>
    </section>

    <SiteFooter />
  </div>
</template>

<style scoped>
.home-view { max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
.hero { background: #fff; border-radius: 12px; padding: 32px 24px; }
.hero h1 { margin: 0 0 8px; font-size: 28px; color: #303133; }
.tagline { margin: 0 0 20px; color: #606266; }
.actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.action-btn { height: auto; padding: 16px; display: flex; flex-direction: column; align-items: flex-start; text-align: left; white-space: normal; }
.action-btn strong { font-size: 16px; margin-bottom: 4px; }
.action-btn span { font-size: 12px; color: #909399; font-weight: normal; }
.faq h2, .units h2 { margin: 0 0 12px; font-size: 18px; }
.faq-list { display: grid; gap: 10px; }
.faq-card { cursor: pointer; }
.hint, .subtitle { color: #909399; font-size: 13px; margin: 0 0 12px; }
.unit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.unit-card { cursor: pointer; text-align: center; }
.char { font-size: 36px; font-weight: 700; }
.py { color: #409eff; margin-bottom: 8px; }
.unit-card p { font-size: 12px; color: #909399; margin: 0; line-height: 1.4; }
.quick-test h2 { margin: 0 0 8px; font-size: 18px; }
.quick-test p { margin: 0 0 8px; color: #606266; }
.meta { font-size: 12px; color: #909399; }
.profile-entry { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.guest-hint { font-size: 13px; color: #909399; }

/* ---- 家长入口 / 十页总览（第 5 周 D）---- */
.parents h2, .pages-index h2 { margin: 0 0 8px; font-size: 18px; }
.parent-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.parent-btn { height: auto; padding: 14px 16px; display: flex; flex-direction: column; align-items: flex-start; text-align: left; white-space: normal; }
.parent-btn strong { font-size: 16px; margin-bottom: 4px; }
.parent-btn span { font-size: 12px; color: #909399; font-weight: normal; }
.page-list { display: flex; flex-direction: column; border: 1px solid #ebeef5; border-radius: 10px; overflow: hidden; background: #fff; }
.page-row { display: grid; grid-template-columns: 56px 150px 1fr 1fr 76px; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f2f3f5; font-size: 14px; }
.page-row:last-child { border-bottom: none; }
.page-row:hover { background: #f5f7fa; }
.page-row.is-disabled { cursor: default; opacity: .55; }
.page-row.is-disabled:hover { background: transparent; }
.page-code { font-size: 12px; color: #909399; letter-spacing: .5px; }
.page-path { background: #f2f3f5; border-radius: 5px; padding: 2px 8px; font-size: 12px; color: #409eff; justify-self: start; }
.page-title { color: #303133; }
.page-child { color: #909399; font-size: 13px; }
@media (max-width: 700px) {
  .page-row { grid-template-columns: 48px 1fr 76px; }
  .page-path, .page-child { display: none; }
}
</style>
