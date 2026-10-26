<script setup lang="ts">
import { SERVICES, SITE } from '~/data/site'

useSeoMeta({
  title: 'Services | PPO',
  description: 'Custom web applications, platform engineering, design, modernization, automation and technical advisory from PPO.',
})
</script>

<template>
  <main class="inner">
    <section class="blk blk-hero">
      <div class="wrap">
        <p class="eyebrow">Services</p>
        <h1>Engineering and design, end to end</h1>
        <p class="lead">From the first sketch to a system running in production, one team owns the result.</p>
      </div>
    </section>

    <section class="blk">
      <div class="wrap">
        <article v-for="(s, i) in SERVICES" :id="s.id" :key="s.id" class="service">
          <div>
            <span class="num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h2>{{ s.title }}</h2>
            <p>{{ s.summary }}</p>
          </div>
          <ul class="ticks">
            <li v-for="p in s.points" :key="p">{{ p }}</li>
          </ul>
        </article>
      </div>
    </section>

    <section class="blk">
      <div class="wrap">
        <div class="cta">
          <div>
            <h2>Not sure where to start?</h2>
            <p>Describe the problem. We will tell you honestly whether and how we can help.</p>
          </div>
          <a class="btn primary" :href="`mailto:${SITE.email}`">Get in touch</a>
        </div>
      </div>
    </section>
  </main>
</template>
