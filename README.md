# ZenWork 0.1.0

Bản giao diện đầu tiên của ZenWork, một không gian quản lý dự án và bàn giao công việc giữa các AI. Ngôn ngữ giao diện là tiếng Việt. Phiên bản sản phẩm dự kiến là v1.0.

## Chạy

Cài Node.js 24 và chạy trong thư mục mã nguồn.

```sh
npm ci
npm run dev
```

Bản dựng tĩnh được tạo bằng `npm run build`. Bản HTML đi kèm có thể mở trực tiếp bằng Chrome hoặc Edge. Dữ liệu phụ thuộc trình duyệt và đường dẫn hoặc địa chỉ mở ứng dụng.

## Sử dụng

1. Mở WorkChat và chọn dự án. Tạo hội thoại mới hoặc chọn một hội thoại đã lưu.
2. Chọn **Trò chuyện** để lưu ghi chú, hoặc **Giao việc** để tạo nhiệm vụ kèm tiêu chí nghiệm thu và trọng số.
3. Chọn **Bàn giao**, chọn nhà cung cấp rồi lưu bản bàn giao. Sao chép prompt và mở công cụ chính thức. Với Claude Code, mở terminal của dự án và dùng phiên đăng nhập Claude của mình.
4. Quay lại gói bàn giao và chọn **Nhập kết quả**. Lưu đường dẫn Pull Request vào kết quả nếu có.
5. Mở **Dự án** để đổi trạng thái nhiệm vụ. Chỉ chuyển sang **Đã nghiệm thu** sau khi kiểm tra tiêu chí. Dashboard dùng tổng điểm nghiệm thu để tính tiến độ.
6. Mở **Cài đặt** để đổi giao diện và xuất JSON. Tệp đính kèm được tải riêng từ cuộc trò chuyện. Phần xuất JSON hiện dùng để đọc và lưu giữ dữ liệu.

**Bản dữ liệu mẫu** xuất hiện lúc khởi tạo. Tạo một dự án mới để làm việc với phạm vi trống, hoặc bỏ mẫu trong Cài đặt khi chưa có hoạt động riêng.

## Kiểm thử

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
```

## Tài liệu

- [Hệ thống nhận diện](docs/DESIGN_SYSTEM.md) và [tài sản thương hiệu](brand)
- [Kiến trúc hiện tại](docs/ARCHITECTURE.md)
- [Tích hợp AI](docs/PROVIDER_INTEGRATION.md)
- [Báo cáo kiểm thử](docs/TEST_REPORT.md)
- [Phạm vi tiếp theo](docs/ROADMAP.md)
