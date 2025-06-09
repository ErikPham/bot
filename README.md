# Bot Theo Dõi Chứng Khoán

Bot Discord theo dõi danh mục đầu tư và danh sách cổ phiếu, gửi thông báo khi đạt mức giá.

## Cấu trúc dự án

Dự án được xây dựng theo phương pháp function-based để tối ưu khả năng bảo trì và tái sử dụng code:

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

## Ưu điểm của kiến trúc

- **Pure functions**: Các hàm nhỏ, độc lập dễ test và bảo trì
- **Factory functions**: Tạo các "module" có state riêng
- **Event system**: Thông báo các thay đổi trạng thái
- **Dễ mở rộng**: Thêm tính năng mới không ảnh hưởng tới code hiện có
- **Giảm code trùng lặp**: Tái sử dụng code tốt hơn

## Yêu cầu hệ thống

- Node.js >= 18.x
- pnpm >= 9.x
- Discord Bot Token
- Kết nối internet ổn định

## Cài đặt

1. Clone repository:
```bash
git clone <repository-url>
cd bot
```

2. Cài đặt dependencies:
```bash
pnpm install
```

3. Tạo file `.env` với các biến môi trường:
```env
DISCORD_TOKEN=<your-discord-token>
```

4. Build và chạy bot:
```bash
pnpm run build
pnpm run start
```

## Phát triển

### Các lệnh pnpm

- `pnpm run build`: Build dự án
- `pnpm run start`: Chạy bot
- `pnpm run dev`: Chạy bot trong chế độ phát triển (nodemon)
- `pnpm run lint`: Kiểm tra code style
- `pnpm run test`: Chạy tests
- `pnpm run format`: Format code với Prettier

## Giấy phép

MIT License
