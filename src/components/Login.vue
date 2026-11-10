<template>
  <div class="login-page">
    <div class="login-box">
      <h2>RAG知识库系统登录</h2>
      <div class="tab-wrap">
        <div class="tab-item" :class="{ active: activeTab === 'pwd' }" @click="activeTab = 'pwd'">
          账号密码
        </div>
        <div class="tab-item" :class="{ active: activeTab === 'sms' }" @click="activeTab = 'sms'">
          手机验证码
        </div>
        <div class="tab-item" :class="{ active: activeTab === 'wx' }" @click="activeTab = 'wx'">
          模拟微信
        </div>
      </div>
      <div class="err-tip">{{ errMsg }}</div>

      <div v-if="activeTab === 'pwd'" class="panel">
        <div class="tip">超级管理员：账号admin，密码admin123</div>
        <input v-model="pwdForm.phone" placeholder="输入账号(admin为管理员)" />
        <input v-model="pwdForm.password" type="password" placeholder="输入密码" />
        <button @click="handlePwdLogin" :disabled="loading">
          {{ loading ? '登录中' : '登录' }}
        </button>
      </div>

      <div v-if="activeTab === 'sms'" class="panel">
        <div class="tip">本地测试固定验证码：123456；手机号不存在自动注册普通用户</div>
        <input v-model="smsForm.phone" placeholder="手机号" />
        <input v-model="smsForm.code" placeholder="验证码" />
        <button @click="handleSmsLogin" :disabled="loading">
          {{ loading ? '登录中' : '验证码登录' }}
        </button>
      </div>

      <div v-if="activeTab === 'wx'" class="panel">
        <div class="tip">模拟微信openid，随便填写字符串，不存在自动注册普通用户</div>
        <input v-model="wxForm.openid" placeholder="wxOpenId" />
        <button @click="handleWxLogin" :disabled="loading">
          {{ loading ? '登录中' : '模拟微信登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/userStore'
import request from '../api/request'

const router = useRouter()
const userStore = useUserStore()

const activeTab = ref('pwd')
const errMsg = ref('')
const loading = ref(false)

const pwdForm = ref({ phone: '', password: '' })
const smsForm = ref({ phone: '', code: '' })
const wxForm = ref({ openid: '' })

async function handlePwdLogin() {
  errMsg.value = ''
  if (!pwdForm.value.phone || !pwdForm.value.password) {
    errMsg.value = '请填写账号密码'
    return
  }
  loading.value = true
  try {
    const res = await request.post('/api/login/pwd', {
      phone: pwdForm.value.phone,
      password: pwdForm.value.password,
    })
    if (res.data.code !== 1) {
      errMsg.value = res.data.msg
      return
    }
    userStore.setUser(res.data.data)
    router.push('/chat')
  } catch (e) {
    errMsg.value = '网络异常'
  } finally {
    loading.value = false
  }
}

async function handleSmsLogin() {
  errMsg.value = ''
  if (!smsForm.value.phone || !smsForm.value.code) {
    errMsg.value = '请填写手机号和验证码'
    return
  }
  loading.value = true
  try {
    const res = await request.post('/api/login/sms', {
      phone: smsForm.value.phone,
      code: smsForm.value.code,
    })
    if (res.data.code !== 1) {
      errMsg.value = res.data.msg
      return
    }
    userStore.setUser(res.data.data)
    router.push('/chat')
  } catch (e) {
    errMsg.value = '网络异常'
  } finally {
    loading.value = false
  }
}

async function handleWxLogin() {
  errMsg.value = ''
  if (!wxForm.value.openid) {
    errMsg.value = '请填写wxOpenId'
    return
  }
  loading.value = true
  try {
    const res = await request.post('/api/login/wx', {
      wxOpenId: wxForm.value.openid,
    })
    if (res.data.code !== 1) {
      errMsg.value = res.data.msg
      return
    }
    userStore.setUser(res.data.data)
    router.push('/chat')
  } catch (e) {
    errMsg.value = '网络异常'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-box {
  width: 420px;
  background: #fff;
  padding: 28px;
  border-radius: 10px;
  box-shadow: 0 2px 12px #00000015;
}
h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #222;
}
.tab-wrap {
  display: flex;
  margin-bottom: 16px;
  border-bottom: 1px solid #eee;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  color: #666;
}
.tab-item.active {
  color: #2563eb;
  border-bottom: 2px solid #2563eb;
}
.tip {
  color: #666;
  font-size: 13px;
  margin-bottom: 12px;
}
.err-tip {
  color: #dc2626;
  margin-bottom: 10px;
  min-height: 18px;
}
input {
  width: 100%;
  padding: 12px;
  margin-bottom: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
}
button {
  width: 100%;
  padding: 12px;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
}
button:disabled {
  background: #94a3b8;
}
</style>
