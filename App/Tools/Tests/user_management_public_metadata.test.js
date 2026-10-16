'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{redact}=require('../../Core/Clients/UserManagement/public_metadata');
test('public Fundamental provider metadata removes endpoint and nested credentials while keeping public feed configuration',()=>{
 const input={source:{homepage_url:'https://user:pass@news.example/feed?api_key=FICTIONAL_SECRET&lang=en'},feeds:[{id:1,endpoint:'https://news.example/rss?access_token=FICTIONAL_SECRET&id=42',provider_config:JSON.stringify({language:'fr',query:'from:SECGov',headers:{Authorization:'Bearer FICTIONAL_SECRET'}}),last_error:'Provider error with FICTIONAL_SECRET'}]},before=JSON.stringify(input),output=redact(input),encoded=JSON.stringify(output);
 assert(!encoded.includes('FICTIONAL_SECRET'));assert(!encoded.includes('user:pass'));assert(output.feeds[0].endpoint.includes('id=42'));assert.equal(JSON.parse(output.feeds[0].provider_config).language,'fr');assert.equal(JSON.parse(output.feeds[0].provider_config).query,'from:SECGov');assert.equal(JSON.stringify(input),before);
});
