# Bot Theo Dõi Chứng Khoán

Bot Discord theo dõi danh mục đầu tư và danh sách cổ phiếu, gửi thông báo khi đạt mức giá.

## Cấu trúc dự án

Dự án được xây dựng theo phương pháp function-based thay vì OOP để cải thiện khả năng bảo trì và giảm code trùng lặp:

```
src/
├── api/              # Kết nối với API chứng khoán
├── discord/          # Kết nối với Discord API
├── follow-list/      # Quản lý danh sách theo dõi cổ phiếu
├── portfolio/        # Quản lý danh mục đầu tư 
├── storage/          # Lưu trữ dữ liệu qua Discord
├── types/            # Định nghĩa các types
└── utils/            # Các utility functions
    └── time/         # Xử lý thời gian và lịch
```

## Ưu điểm của cấu trúc mới

- **Pure functions**: Các hàm nhỏ, độc lập dễ test và bảo trì
- **Factory functions**: Tạo các "module" có state riêng
- **Event system**: Thông báo các thay đổi trạng thái
- **Dễ mở rộng**: Thêm tính năng mới không ảnh hưởng tới code hiện có
- **Giảm code trùng lặp**: Tái sử dụng code tốt hơn

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd bot
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Tạo file `.env` với nội dung:
```
DISCORD_TOKEN=<your-discord-token>
```

4. Chạy bot:
```bash
npm run start
```

## Sử dụng

Bot sẽ tự động theo dõi:
- Danh sách cổ phiếu để gửi thông báo khi đạt mức giá mục tiêu
- Danh mục đầu tư để gửi báo cáo lợi nhuận định kỳ

## Phát triển

### Các lệnh npm

- `npm run build`: Build dự án
- `npm run start`: Chạy bot
- `npm run dev`: Chạy bot trong chế độ phát triển (nodemon)
- `npm run lint`: Kiểm tra code style
- `npm run test`: Chạy tests

## Đóng góp

Mọi đóng góp đều được chào đón! Tạo pull request hoặc mở issue để đóng góp.

## Giấy phép

MIT License 