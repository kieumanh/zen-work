# Kiến trúc ZenWork 0.1.0

Frontend React, TypeScript, Vite và Tailwind dùng sáu màn hình. WorkChat là màn hình mặc định. `src/model.ts` giữ kiểu dữ liệu, cách tính tiến độ và trình tạo prompt. `src/main.tsx` điều phối thao tác giao diện.

Dữ liệu có schema cục bộ 1. Dự án, hội thoại, nhiệm vụ, nhà cung cấp, sự kiện, cài đặt và số liệu token nằm trong LocalStorage. IndexedDB giữ nội dung tệp đính kèm, tối đa 10 MB mỗi tệp. Nhật ký ghi các thao tác giao diện thực tế trong dự án. Dữ liệu của hai thiết bị là độc lập.

Gói bàn giao chốt tên, công cụ, chế độ điều phối và nội dung prompt tại lúc tạo. Kết quả nhập thủ công tham chiếu gói bàn giao. Chế độ điều phối cung cấp ngữ cảnh và hướng dẫn cho người dùng.

Phiên bản hiện tại lưu URL GitHub và cung cấp liên kết thao tác. Kết nối GitHub App, API máy chủ, account, D1/R2 và audit log có xác thực thuộc giai đoạn tiếp theo.
