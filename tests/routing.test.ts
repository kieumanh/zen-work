import {expect,it} from 'vitest'
import {advance,packet} from '../src/routing'
import type {Run} from '../src/routing'
const start:Run={id:'1',goal:'Tìm kiếm',baseline:'v1',kind:'existing',branch:'feature/search',step:0,history:[]}
it('preserves review findings and requires another review after repair',()=>{
  const plan=advance(start,'Phạm vi tìm kiếm',false)
  const review=advance(plan,'sha1',false)
  const repair=advance(review,'Lỗi khi chuỗi rỗng',true)
  expect(repair.step).toBe(1)
  expect(packet(repair,'Zen','')).toContain('Lỗi khi chuỗi rỗng')
  expect(advance(repair,'sha2',false).step).toBe(2)
})
it('requires evidence and stops after acceptance',()=>{
  expect(()=>advance(start,' ',false)).toThrow()
  expect(()=>advance({...start,step:5},'x',false)).toThrow()
})
