/**
 * Các hàm utility liên quan đến thời gian thị trường
 */

// Constants
const MARKET_OPEN_HOUR = 9;
const MARKET_CLOSE_HOUR = 15;

/**
 * Kiểm tra xem thị trường đang mở cửa hay không
 */
export function isMarketOpen(): boolean {
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const now = new Date(timeString);
  const hour = now.getHours();
  const day = now.getDay();

  // Check weekend (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) {
    return false;
  }

  // Check market hours
  return hour >= MARKET_OPEN_HOUR && hour < MARKET_CLOSE_HOUR;
}

/**
 * Kiểm tra xem có đang trong thời gian nghỉ hay không (nghỉ trưa, cuối tuần, ngoài giờ giao dịch)
 */
export function isBreakTime(): boolean {
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const now = new Date(timeString);
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hour + minutes / 60;
  const day = now.getDay();

  // Check weekend (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) {
    return true;
  }

  // Check market hours (9:00 - 15:00)
  if (hour < MARKET_OPEN_HOUR || hour >= MARKET_CLOSE_HOUR) {
    return true;
  }

  // Check lunch break (11:30 - 13:00)
  if (currentTime >= 11.5 && currentTime < 13) {
    return true;
  }

  return false;
}

/**
 * Lấy timestamp của thời điểm thị trường gần nhất (dùng để lấy giá đóng cửa)
 */
export function getLatestMarketTime(): number {
  const timeString = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Ho_Chi_Minh"
  });
  const now = new Date(timeString);
  const day = now.getDay();
  const hour = now.getHours();

  // Nếu là cuối tuần hoặc ngoài giờ giao dịch, lấy giá đóng cửa của phiên gần nhất
  let timestamp = now.getTime();

  // Nếu là Chủ nhật
  if (day === 0) {
    timestamp -= 2 * 24 * 60 * 60 * 1000; // Trừ 2 ngày để lấy thứ 6
  }
  // Nếu là thứ 7
  else if (day === 6) {
    timestamp -= 1 * 24 * 60 * 60 * 1000; // Trừ 1 ngày để lấy thứ 6
  }
  // Nếu là ngày trong tuần nhưng trước giờ mở cửa
  else if (hour < MARKET_OPEN_HOUR) {
    // Nếu là thứ 2
    if (day === 1) {
      timestamp -= 3 * 24 * 60 * 60 * 1000; // Trừ 3 ngày để lấy thứ 6 tuần trước
    } else {
      timestamp -= 1 * 24 * 60 * 60 * 1000; // Trừ 1 ngày
    }
  }

  return timestamp;
} 