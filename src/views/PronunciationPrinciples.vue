<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { PRINCIPLE_SECTIONS, PRO_TERMS_PREVIEW } from '@/data/principles'
import { usePageCopy } from '@/composables/usePageCopy'
import PageState from '@/components/PageState.vue'
import PageFeedback from '@/components/PageFeedback.vue'
import SiteFooter from '@/components/SiteFooter.vue'

const router = useRouter()
const { copy } = usePageCopy('P04')

// 段落本身是真实文案（src/data/principles.ts），保留不动；
// 只有内容缺失这种状态分支走文案位。
const hasSections = computed(() => PRINCIPLE_SECTIONS.length > 0)
</script>

<template>
  <div class="principles-view">
    <h2>发音原理</h2>
    <p class="intro">{{ copy.subtitle }}</p>

    <PageState v-if="!hasSections" state="empty" :copy="copy" />

    <el-card class="overview-card">
      <h3>声音形成总图</h3>
      <div class="flow">呼吸动力 → 声带振动 → 共鸣 → 构音 → 语言输出</div>
      <p class="note">默认显示通俗说明；专业术语（IPA、声学图等）按需展开。</p>
    </el-card>

    <div class="sections">
      <el-card v-for="s in PRINCIPLE_SECTIONS" :key="s.id" shadow="hover" class="section-card">
        <h3>{{ s.title }}</h3>
        <p class="summary">{{ s.summary }}</p>
        <el-collapse>
          <el-collapse-item title="详细说明" :name="s.id">
            <p>{{ s.body }}</p>
          </el-collapse-item>
          <el-collapse-item title="专业展开（按需）" :name="s.id + '-pro'">
            <ul>
              <li v-for="t in PRO_TERMS_PREVIEW" :key="t.term"><strong>{{ t.term }}</strong>：{{ t.brief }}</li>
            </ul>
            <p class="boundary">资料仅用于理解发音环节，不构成医学诊断依据。</p>
          </el-collapse-item>
        </el-collapse>
        <el-button type="primary" link @click="router.push(`/learn/${s.practiceUnit}`)">进入相关示范单元</el-button>
      </el-card>
    </div>

    <PageFeedback page="principles" type="learning" />
    <SiteFooter />
  </div>
</template>

<style scoped>
.principles-view { max-width: 900px; margin: 0 auto; }
.intro { color: #606266; margin-bottom: 20px; }
.overview-card { margin-bottom: 20px; }
.flow { font-size: 18px; font-weight: 600; color: #409eff; margin: 12px 0; }
.note, .boundary { font-size: 13px; color: #909399; }
.sections { display: flex; flex-direction: column; gap: 16px; }
.summary { color: #606266; }
</style>
