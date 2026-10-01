import { test } from 'node:test'
import assert from 'node:assert/strict'

test('proxy validates input, keeps authentication server-side, caches quotes, and sanitizes upstream errors', async () => {
  let config = {fugleApiBaseUrl:'https://api.fugle.tw/marketdata/v1.0/stock', fugleApiKey:''}
  let calls = 0
  let fail = false
  const headers: Record<string,string> = {}
  Object.assign(globalThis, {
    defineEventHandler: (fn: unknown) => fn,
    getQuery: (event: unknown) => event,
    setHeader: (_event: unknown, name: string, value: string) => { headers[name] = value },
    useRuntimeConfig: () => config,
    createError: (options: {statusCode:number;statusMessage:string}) => Object.assign(new Error(options.statusMessage), options),
    $fetch: async (path: string, options: {headers:Record<string,string>;baseURL:string}) => {
      calls++
      assert.equal(options.headers['X-API-KEY'], 'test-key-not-a-real-key')
      assert.equal(options.baseURL, config.fugleApiBaseUrl)
      if (fail) throw Object.assign(new Error('secret request headers'), {statusCode:429})
      return {symbol:path.split('/').pop(),name:'測試',date:'2026-10-01',exchange:'TWSE',type:'EQUITY',closePrice:100,previousClose:99}
    },
  })
  const {default: handler} = await import('../server/api/quotes.get.ts')
  await assert.rejects(handler({symbols:'2330'} as never), {statusCode:503})
  assert.equal(calls,0)
  config = {...config,fugleApiKey:'test-key-not-a-real-key'}
  await assert.rejects(handler({symbols:'../secret'} as never), {statusCode:400})
  await assert.rejects(handler({symbols:Array(21).fill(0).map((_,i)=>String(1000+i)).join(',')} as never), {statusCode:400})
  const [a,b] = await Promise.all([handler({symbols:'2330'} as never),handler({symbols:'2330'} as never)])
  assert.deepEqual(a,b); assert.equal(calls,1)
  await handler({symbols:'2330'} as never)
  assert.equal(calls,1); assert.equal(headers['Cache-Control'],'no-store')
  fail=true
  await assert.rejects(handler({symbols:'0050'} as never), (e: Error & {statusCode?:number}) => e.statusCode === 429 && !e.message.includes('secret'))
})
