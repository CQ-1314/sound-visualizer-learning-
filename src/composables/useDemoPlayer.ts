/**
 * 示范音播放（第 5 周 D 交付：关卡页至少一关示范可播放）
 * ---------------------------------------------------------------------------
 * 播放优先级：
 *   1) CMS 已发布的正式示范音（unit.demoAudio）→ 播真实音频，**不**显示语音合成声明；
 *   2) 未提供示范音 → 回落浏览器语音合成（TTS），并标记 source='tts'，
 *      页面据此挂上 TTS_DISCLAIMER，绝不让合成音冒充正式授权示范音。
 *
 * 依赖：示范音由 I 提供、经 C 走 CMS 审核发布后写入 pronunciation_units.demo_audio，
 * 后端以 demoAudio 字段返回（见 backend/database.py 的 _unit_to_dict）。
 * 字段就位后前端**无需再改代码**，本 composable 会自动切到真实音频。
 */
import { ref } from 'vue'
import { useSpeechDemo, TTS_DISCLAIMER } from '@/composables/useSpeechDemo'

export type DemoSource = 'demo-audio' | 'tts'

export function useDemoPlayer() {
  const tts = useSpeechDemo()
  const isPlaying = ref(false)
  /** 上一次实际使用的音源：正式示范音还是语音合成 */
  const lastSource = ref<DemoSource | null>(null)
  let audio: HTMLAudioElement | null = null

  function stop() {
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio = null
    }
    tts.stop()
    isPlaying.value = false
  }

  /**
   * @param text     回落 TTS 时朗读的文本（一般是目标音或例字）
   * @param audioUrl CMS 的正式示范音地址；为空则回落 TTS
   * @param slow     慢速播放（音频走 playbackRate，TTS 走 rate）
   */
  async function play(text: string, audioUrl?: string | null, slow = false): Promise<void> {
    stop()
    const url = (audioUrl ?? '').trim()

    if (url) {
      lastSource.value = 'demo-audio'
      isPlaying.value = true
      await new Promise<void>((resolve, reject) => {
        const el = new Audio(url)
        audio = el
        el.playbackRate = slow ? 0.6 : 1
        el.onended = () => {
          isPlaying.value = false
          audio = null
          resolve()
        }
        el.onerror = () => {
          isPlaying.value = false
          audio = null
          reject(new Error('示范音播放失败，可能是文件缺失或格式不支持'))
        }
        el.play().catch(reject)
      })
      return
    }

    lastSource.value = 'tts'
    isPlaying.value = true
    try {
      await tts.speak(text, slow ? 'slow' : 'normal')
    } finally {
      isPlaying.value = false
    }
  }

  return {
    isPlaying,
    lastSource,
    play,
    stop,
    /** 只有在用语音合成示意时才需要展示这句声明 */
    disclaimer: TTS_DISCLAIMER,
  }
}
