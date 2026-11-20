export const stages = [
  ['chatgpt','Lập kế hoạch','Chia mục tiêu thành lát cắt nhỏ, nêu phụ thuộc, phạm vi file và tiêu chí nghiệm thu. Chỉ phân tích.'],
  ['claude','Xây dựng','Chỉ sửa phạm vi đã duyệt trên nhánh riêng. Kiểm tra git status và commit gốc trước khi sửa. Nếu lệch hoặc có thay đổi ngoài dự kiến, dừng để đối chiếu. Trả diff, SHA và kết quả test.'],
  ['chatgpt','Phản biện','Đọc diff tại đúng SHA và tiêu chí nghiệm thu. Phân loại lỗi, nêu ca kiểm thử còn thiếu. Không sửa file.'],
  ['ci','Kiểm thử','Chạy lint, typecheck, unit, integration, E2E và build theo cấu hình dự án. Ghi URL kết quả CI cùng SHA đã kiểm tra.'],
  ['owner','Nghiệm thu','Đối chiếu SHA hiện tại với bản đã review và CI xanh. Nếu thay đổi, trả về xây dựng và kiểm tra lại. Chủ dự án quyết định merge qua PR.']
] as const
export type Run = { id:string; kind:'existing'|'new'; goal:string; baseline:string; branch:string; step:number; history:string[] }
export function advance(run:Run, evidence:string, revise:boolean):Run {
  const stage=stages[run.step]
  if (!stage || !evidence.trim() || (revise && run.step<2)) throw Error('Bàn giao chưa hợp lệ')
  return {...run,step:revise?1:run.step+1,history:[...run.history,stage[1]+(revise?' · cần sửa':' · xác nhận')+'\n'+evidence.trim()]}
}
export function packet(run:Run,name:string,repo:string) {
  const [role,title,instruction]=stages[run.step]
  return [name+' · '+title, 'Phụ trách: '+role, run.kind==='existing'?'Source hiện có: khảo sát cấu trúc, phụ thuộc và chạy test nền trước khi thay đổi.':'Dự án mới: thống nhất kiến trúc tối thiểu, tạo commit nền và bộ test đầu tiên.',
    'Mục tiêu và nghiệm thu: '+run.goal,'Kho mã: '+(repo||'chưa liên kết'),'Điểm xuất phát: '+run.baseline,'Nhánh dành riêng: '+run.branch,instruction,...run.history].join('\n\n')
}
