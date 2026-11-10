<template>
  <div style="padding: 20px; max-width: 1000px; margin: 0 auto">
    <h2>用户管理（超级管理员）</h2>
    <button @click="$router.push('/chat')" style="margin: 10px 0">←返回聊天</button>
    <table border="1" cellpadding="8" cellspacing="0" style="width: 100%; background: #fff">
      <thead>
        <tr>
          <th>ID</th>
          <th>phone</th>
          <th>wx_openid</th>
          <th>角色</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in userList" :key="u.id">
          <td>{{ u.id }}</td>
          <td>{{ u.phone || '-' }}</td>
          <td>{{ u.wx_openid || '-' }}</td>
          <td>{{ u.role }}</td>
          <td>{{ u.status === 1 ? '启用' : '禁用' }}</td>
          <td>
            <button @click="toggleStatus(u.id, u.status === 1 ? 0 : 1)">启用/禁用</button>
            <button
              v-if="u.role !== 'super_admin'"
              @click="setAdmin(u.id)"
              style="margin-left: 6px"
            >
              设为管理员
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import request from '../api/request'

const userList = ref([])

async function loadUserList() {
  const res = await request.get('/api/admin/userList')
  if (res.data.code === 1) {
    userList.value = res.data.data
  }
}

async function toggleStatus(userId, status) {
  await request.post('/api/admin/updateUserStatus', { userId, status })
  loadUserList()
}

async function setAdmin(userId) {
  await request.post('/api/admin/updateUserRole', { userId, role: 'super_admin' })
  loadUserList()
}

onMounted(() => loadUserList())
</script>
