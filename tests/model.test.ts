import { expect, test } from 'vitest'
import { handoffText, initial, progress } from '../src/model'
import type { Entry } from '../src/model'

test('chỉ cộng điểm nhiệm vụ đã nghiệm thu',()=>{
  const {tasks} = initial()
  expect(progress(tasks)).toEqual({total:10,accepted:4,value:40})
  expect(progress([]).value).toBeNull()
  expect(progress([{...tasks[0],status:'review'}]).value).toBe(0)
})
test('bàn giao giữ đúng ngữ cảnh phía trước và mô hình',()=>{
  const {projects, conversations, providers} = initial()
  const note: Entry = {id:'a',text:'Bối cảnh trước',time:'',provider:'chatgpt',type:'note'}
  const entry: Entry = {...note,id:'b',text:'Yêu cầu',type:'handoff',model:'Mô hình đã chọn'}
  const later = {...note,id:'c',text:'Dữ liệu sau'}
  const result = handoffText(projects[0],{...conversations[0],entries:[note,entry,later]},entry,'sequential',providers[0])
  expect(result).toContain('Bối cảnh trước')
  expect(result).toContain('Mô hình đã chọn')
  expect(result).not.toContain('Dữ liệu sau')
})
test('dự án trống khởi tạo được mà không có dữ liệu minh họa',()=>{
  expect(initial(false)).toMatchObject({example:false,conversations:[],events:[],tasks:[],usage:[]})
})
