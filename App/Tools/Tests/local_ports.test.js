'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{allocator}=require('./local_ports');
test('multi-service fixtures reject duplicate ephemeral ports before starting Engines',async()=>{const candidates=[12001,12001,12002,12002,12003],next=allocator(async()=>candidates.shift());assert.deepEqual([await next(),await next(),await next()],[12001,12002,12003]);});
