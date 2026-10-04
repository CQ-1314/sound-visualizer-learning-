<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { PRO_CATEGORIES, PRO_MATERIALS } from '@/data/proMaterials'
import { usePageCopy } from '@/composables/usePageCopy'
import PageState from '@/components/PageState.vue'
import PageFeedback from '@/components/PageFeedback.vue'
import SiteFooter from '@/components/SiteFooter.vue'

const router = useRouter()
const { copy } = usePageCopy('P07')
const category = ref('')

const filtered = computed(() => category.value
  ? PRO_MATERIALS.filter(m => m.category === category.value)
  : PRO_MATERIALS
)

/** 资料一条都没有：整页空态；只是当前分类没有：列表内提示 */
const noMaterials = computed(() => PRO_MATERIALS.length === 0)
const noMatched = computed(() => !noMaterials.value && filtered.value.length === 0)
</script>

<template>
  <div class="materials-view">
    <h2>专业资料</h2>
    <p class="intro">{{ copy.subtitle }}</p>

    <!-- 来源字段如实标注「示意」：不粉饰成正式授权 -->
    <p class="source-note">每张卡片的「来源」为示意说明，尚未取得正式引用授权，仅作学习参考。</p>

    <PageState v-if="noMaterials" state="empty" :copy="copy" :show-action="false" />

    <div v-if="!noMaterials" class="cats">
      <el-tag :effect="!category ? 'dark' : 'plain'" @click="category = ''" style="cursor:pointer">全部</el-tag>
      <el-tag
        v-for="c in PRO_CATEGORIES"
        :key="c.id"
        :effect="category === c.id ? 'dark' : 'plain'"
        style="cursor:pointer;margin-left:8px"
        @click="category = c.id"
      >{{ c.name }}</el-tag>
    </div>

    <div class="list">
      <el-card v-for="m in filtered" :key="m.id" shadow="hover">
        <h3>{{ m.title }}</h3>
        <p>{{ m.summary }}</p>
        <p class="scope"><strong>适用边界：</strong>{{ m.scope }}</p>
        <p class="meta">来源：{{ m.source }} · 许可：{{ m.license }}</p>
        <div class="related">
          <span>相关单元：</span>
          <el-button v-for="uid in m.relatedUnits" :key="uid" link type="primary" @click="router.push(`/learn/${uid}`)">{{ uid }}</el-button>
        </div>
      </el-card>
      <PageState v-if="noMatched" state="empty" :copy="copy" compact :show-action="false" />
    </div>

    <PageFeedback page="materials" type="content" />
    <SiteFooter />
  </div>
</template>

<style scoped>
.materials-view { max-width: 900px; margin: 0 auto; }
.intro { color: #606266; margin-bottom: 16px; }
.source-note { color: #909399; font-size: 13px; margin: 0 0 16px; }
.cats { margin-bottom: 16px; }
.list { display: flex; flex-direction: column; gap: 12px; }
.scope, .meta { font-size: 13px; color: #909399; }
.related { margin-top: 8px; }
</style>
