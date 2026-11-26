import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { reactive, ref, watch, nextTick } from "vue";

for (const scenario of ["late", "early", "reload"] as const) {
test(`Google source restoration: ${scenario}`, async () => {
  const component = readFileSync(new URL("../app/components/PortfolioSource.vue", import.meta.url), "utf8");
  const script = component.split('<script setup lang="ts">')[1]!.split('</script>')[0]!;
  const route = reactive({ path: "/portfolio", query: (scenario === "early" ? { google: "connected" } : {}) as Record<string, string> });
  const source = ref("manual");
  const account = ref<unknown>(null);
  let mount!: () => Promise<void>;
  let saved = scenario === "reload" ? "google" : "manual";
  const stops: (() => void)[] = [];
  let completed!: () => void;
  const verified = new Promise<void>(resolve => { completed = resolve; });
  runInNewContext(ts.transpileModule(script.replaceAll("import.meta.client", "true"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports: {},
    useGoogleSheets: () => ({
      source, account, error: ref(""),
      forgetAccount: () => { account.value = null; },
      announceChange: () => {},
      checkAccount: async () => { account.value = { email: "user@example.test" }; completed(); },
    }),
    useRoute: () => route,
    useRouter: () => ({ replace: async ({ path, query }: typeof route) => {
      route.path = path;
      route.query = query;
    } }),
    watch: (...args: Parameters<typeof watch>) => { const stop = watch(...args); stops.push(stop); return stop; },
    localStorage: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } },
    window: { addEventListener: () => {} }, document: { addEventListener: () => {} },
    onMounted: (callback: () => Promise<void>) => { mount = callback; },
    onBeforeUnmount: () => {}, clearTimeout, setTimeout,
  });
  try {
    if (scenario === "early") await verified;
    await mount();
    if (scenario === "late") route.query = { google: "connected" };
    await nextTick();
    await verified;
    await nextTick();
    assert.equal(source.value, "google");
    assert.equal(route.path, scenario === "reload" ? "/portfolio" : "/holdings");
    assert.equal(saved, "google");
    assert.equal(route.query.google, undefined);
    assert.deepEqual(account.value, { email: "user@example.test" });
  } finally {
    stops.forEach(stop => stop());
  }
});

}
