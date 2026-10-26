<script setup lang="ts">

const admin = useAdmin()
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await admin.login(email.value.trim(), password.value)
  } catch (e) {
    error.value = e instanceof Error && e.message.startsWith('This account') ? e.message : 'The email or the password is not correct.'
    console.error('[admin] login failed', e)
  } finally {
    busy.value = false
    password.value = ''
  }
}
</script>

<template>
  <form class="login" @submit.prevent="submit">
    <h1>Log in</h1>
    <div class="field"><label for="l-email">Email</label><input id="l-email" v-model="email" type="email" autocomplete="username" required></div>
    <div class="field"><label for="l-pass">Password</label><input id="l-pass" v-model="password" type="password" autocomplete="current-password" required></div>
    <p v-if="error" class="notice err">{{ error }}</p>
    <button class="btn" type="submit" :disabled="busy">{{ busy ? 'Checking' : 'Log in' }}</button>
  </form>
</template>
