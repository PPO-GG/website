<script setup lang="ts">
import { defaultServices } from "~/data/defaults";

const route = useRoute();
const isAdmin = computed(() => route.path.startsWith("/admin"));

const settings = await useSiteSettings();
const serviceBlocks = await useManagedPage("services", defaultServices);
const serviceNames = computed(() =>
  serviceBlocks.value
    .filter((b) => b.type === "services")
    .flatMap((b) => b.items.map((i) => i.title ?? ""))
    .filter(Boolean),
);
</script>

<template>
  <NuxtRouteAnnouncer />
  <SiteHeader v-if="!isAdmin" :banner="settings.banner" :nav="settings.nav" />
  <NuxtPage />
  <SiteFooter v-if="!isAdmin" :settings="settings" :services="serviceNames" />
</template>
