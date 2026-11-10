<template>
  <div class="app-layout">
    <div class="sidebar">
      <h3>聊天会话</h3>
      <button @click="newSession">➕新建对话</button>
      <div class="session-list">
        <div
          v-for="(s, idx) in sessionList"
          :key="s.id"
          class="session-item"
          :class="{ active: currentSessionId === s.id }"
          @click="switchSession(s.id)"
        >
          <span class="session-title">{{ s.title }}</span>
          <button class="session-del" @click.stop="delSession(idx)">×</button>
        </div>
      </div>
    </div>
    <div class="main-area">
      <h1>本地大模型检索聊天</h1>
      <!-- 移除id="chat"，完全使用ref -->
      <div class="chat-box" ref="chatRef">
        <div v-for="msg in currentMessages" :key="msg.id">
          <div class="user">👤用户：{{ msg.user }}</div>
          <div class="assistant">🤖助手：{{ msg.assistant }}</div>
        </div>
      </div>
      <textarea
        v-model="inputText"
        rows="3"
        placeholder="输入你的问题...（Enter发送，Shift+Enter换行）"
        @keydown="handleKeyDown"
      ></textarea>

      <div class="btn-row">
        <button @click="send" :disabled="isLoading">发送</button>
        <button
          @click="rebuild"
          :disabled="isRebuilding"
          style="background: #10b981; margin-left: 8px"
        >
          重建知识库
        </button>
        <button
          @click="stopAnswer"
          :disabled="!isLoading"
          style="background: #dc2626; margin-left: 8px"
        >
          停止回答
        </button>
        <button
          v-if="userStore.role === 'super_admin'"
          @click="$router.push('/user-manage')"
          style="background: #7c3aed; margin-left: 8px"
        >
          用户管理
        </button>
        <button @click="logout" style="background: #dc2626; margin-left: 8px">退出登录</button>
      </div>
      <div class="loading-wrap" v-if="isLoading">
        <div class="spinner"></div>
        <span>处理中...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import request from '../api/request'

const router = useRouter()
const userStore = useUserStore()

const chatRef = ref(null)
const inputText = ref('')
const isLoading = ref(false)
const isRebuilding = ref(false)
let abortController = null

// 会话管理 localStorage
const sessionList = ref(JSON.parse(localStorage.getItem('rag_sessions') || '[]'))
const currentSessionId = ref(null)

const currentMessages = computed(() => {
  const ses = sessionList.value.find((i) => i.id === currentSessionId.value)
  return ses ? ses.messages : []
})

function saveSessions() {
  localStorage.setItem('rag_sessions', JSON.stringify(sessionList.value))
}

function newSession() {
  const sid = Date.now()
  sessionList.value.push({
    id: sid,
    title: `会话${sessionList.value.length + 1}`,
    messages: [],
  })
  currentSessionId.value = sid
  saveSessions()
}

function switchSession(id) {
  currentSessionId.value = id
}

function delSession(idx) {
  sessionList.value.splice(idx, 1)
  saveSessions()
  if (sessionList.value.length > 0) {
    currentSessionId.value = sessionList.value[0].id
  } else {
    currentSessionId.value = null
  }
}

// 初始化：没有会话自动新建
onMounted(() => {
  if (sessionList.value.length === 0) {
    newSession()
  } else {
    currentSessionId.value = sessionList.value[0].id
  }
})

// 滚动到底
async function scrollBottom() {
  await nextTick()
  if (chatRef.value) {
    chatRef.value.scrollTop = chatRef.value.scrollHeight
  }
}

// 键盘事件：Enter发送，Shift+Enter换行
async function handleKeyDown(e) {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      // shift+enter 允许换行
      return
    }
    // 普通回车 阻止换行，执行发送
    e.preventDefault()
    await send()
  }
}

// 发送消息 POST + ReadableStream SSE
async function send() {
  if (!inputText.value.trim() || isLoading.value) return
  if (!currentSessionId.value) newSession()

  const question = inputText.value.trim()
  inputText.value = ''
  isLoading.value = true
  abortController = new AbortController()

  // 把用户消息压入会话
  const sesItem = sessionList.value.find((s) => s.id === currentSessionId.value)
  sesItem.messages.push({
    id: Date.now(),
    user: question,
    assistant: '',
  })
  // 会话标题取第一条提问
  if (sesItem.messages.length === 1) sesItem.title = question.slice(0, 18)
  saveSessions()
  await scrollBottom()

  try {
    const res = await fetch('http://127.0.0.1:3000/api/rag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userStore.token}`,
      },
      body: JSON.stringify({ question }),
      signal: abortController.signal,
    })
    const reader = res.body.getReader()
    const decoder = new TextDecoder('utf8')
    let buffer = ''
    const lastMsg = sesItem.messages[sesItem.messages.length - 1]

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // SSE data: xxx\n\n 分割
      const parts = buffer.split('\n\n')
      buffer = parts.pop()
      for (const p of parts) {
        if (!p.startsWith('data: ')) continue
        const raw = p.replace('data: ', '')
        const obj = JSON.parse(raw)
        if (obj.error) {
          lastMsg.assistant += `\n错误：${obj.error}`
        } else if (obj.content) {
          lastMsg.assistant += obj.content
        }
        saveSessions()
        await scrollBottom()
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      const ses = sessionList.value.find((s) => s.id === currentSessionId.value)
      const last = ses.messages[ses.messages.length - 1]
      last.assistant += '\n请求中断：' + err.message
      saveSessions()
    }
  } finally {
    isLoading.value = false
    abortController = null
  }
}

function stopAnswer() {
  if (abortController) abortController.abort()
}

// 重建知识库
async function rebuild() {
  isRebuilding.value = true
  try {
    const res = await request.post('/api/rebuild')
    alert(res.data.msg || '完成')
  } catch (e) {
    alert('重建失败' + e.message)
  } finally {
    isRebuilding.value = false
  }
}

function logout() {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
/* 布局铺满屏幕，移除max-width限制，高度固定视口高度 */
.app-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 12px;
  height: 100vh;
  padding: 12px;
  box-sizing: border-box;
}

.sidebar {
  background: #fff;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar h3 {
  font-size: 16px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.sidebar > button {
  width: 100%;
  padding: 8px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.session-list {
  flex: 1;
  overflow-y: auto;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 9px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 4px;
  background: #f7f8fa;
}

.session-item.active {
  background: #dbeafe;
}

.session-item:hover {
  background: #eef1f7;
}

.session-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.session-del {
  border: none;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
  padding: 0 4px;
}

/* ✅ 关键修复：grid子元素必须增加 min‑height:0，允许内部flex收缩滚动，解决内容变长挤跑左侧 */
.main-area {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

h1 {
  font-size: 20px;
  margin-bottom: 10px;
  color: #222;
  flex-shrink: 0;
}

.chat-box {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  margin-bottom: 12px;
  white-space: pre-wrap;
}

.user {
  color: #2563eb;
  margin: 8px 0;
}

.assistant {
  color: #111;
  margin: 8px 0;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  font-size: 16px;
  flex-shrink: 0; /* 输入框不会被压缩 */
}

.btn-row {
  margin-top: 8px;
  flex-shrink: 0;
}

.btn-row button {
  padding: 10px 20px;
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 6px;
  cursor: pointer;
}

button:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.loading-wrap {
  display: flex;
  align-items: center;
  margin-top: 10px;
  color: #2563eb;
  flex-shrink: 0;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
