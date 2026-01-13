# 📷 Photo Job Manager

Ứng dụng quản lý job chụp hình chạy trên Google Apps Script, triển khai như Web App. Hỗ trợ multi-user - mỗi người dùng có dữ liệu riêng trên Google Sheet của họ.

---

## ✨ Tính năng

- **Quản lý Jobs**: Thêm/sửa/xóa job chụp hình với đầy đủ thông tin
- **Quản lý Khách hàng**: Lưu trữ thông tin khách hàng, tự động gợi ý khi nhập
- **Quản lý Partners**: Quản lý cộng sự, tính lương theo job
- **Google Calendar**: Tự động tạo lịch khi thêm job (trên lịch của người dùng)
- **Báo cáo đa chiều**:
  - Doanh thu theo tuần/tháng/toàn thời gian
  - Thanh toán: đã TT/chưa TT
  - Theo khách hàng (Top 10)
  - Theo Partner
- **Smart Input**: Autocomplete cho khách hàng, partner, địa điểm
- **Multi-user**: Mỗi người dùng có dữ liệu riêng, admin không truy cập được

---

## 📁 Cấu trúc file

```
├── appsscript.json      # Cấu hình project
├── Code.gs              # Main entry, menu, deploy functions
├── JobService.gs        # CRUD Jobs + Calendar integration
├── CustomerService.gs   # CRUD Customers
├── PartnerService.gs    # CRUD Partners
├── CalendarService.gs   # Google Calendar integration
├── ReportService.gs     # Báo cáo đa chiều
├── index.html           # Giao diện chính
├── styles.html          # CSS
├── components.html      # Form templates
├── reports.html         # Giao diện báo cáo
├── app.js.html          # JavaScript chính
└── autocomplete.js.html # Logic autocomplete
```

---

# 👨‍💻 HƯỚNG DẪN CHO ADMIN (Developer)

## 🚀 Cài đặt ban đầu

### Bước 1: Cài đặt clasp

```bash
npm install -g @google/clasp
clasp login
```

### Bước 2: Clone hoặc tạo project

```bash
# Clone từ script có sẵn
clasp clone <SCRIPT_ID>

# Hoặc tạo mới
clasp create --type standalone --title "Photo Job Manager"
```

### Bước 3: Push code lên Google

```bash
cd miniappforphoto
clasp push --force
```

---

## 🌐 Deploy Web App

### Cách 1: Qua Google Sheet (Khuyến nghị)

1. **Mở Google Sheet** đã liên kết với script
2. Vào menu **📷 Photo Jobs** → **🚀 Deploy Web App**
3. Click **"Mở Manage Deployments"**
4. Trong trang Deployments:
   - Click **"New deployment"** (hoặc Edit deployment có sẵn)
   - Chọn type: **Web app**
   - **Execute as**: `User accessing the web app` ⚠️ BẮT BUỘC
   - **Who has access**: `Anyone`
   - Click **Deploy**
5. Copy **Deployment ID** (bắt đầu bằng `AKfycb...`)
6. Quay lại dialog trong Sheet, dán ID vào ô và click **"Lưu Deployment ID"**

### Cách 2: Qua command line

```bash
clasp deploy --description "v1.0"
```

> ⚠️ Với cách này vẫn cần vào Apps Script Editor để cấu hình "Execute as User"

---

## 📤 Lấy Link Web App để share

1. Mở Google Sheet
2. Vào menu **📷 Photo Jobs** → **🌐 Lấy Link Web App**
3. Copy link và gửi cho người dùng

---

## 🔄 Cập nhật code

Khi có thay đổi code:

```bash
# Push code mới
clasp push --force

# Tạo deployment mới (nếu cần)
clasp deploy --description "v2.0 - Mô tả thay đổi"
```

> 💡 Nếu chỉ sửa code nhỏ, có thể giữ nguyên deployment ID. Người dùng sẽ tự động nhận code mới.

---

## 🔐 Bảo mật

| Khía cạnh | Chi tiết |
|-----------|----------|
| **Code server (.gs)** | ✅ Ẩn hoàn toàn, người dùng không thể xem |
| **Code frontend (.html)** | ⚠️ Có thể xem qua DevTools (nhưng chỉ là UI) |
| **Dữ liệu người dùng** | ✅ Admin không truy cập được (Execute as User) |
| **Calendar** | ✅ Tạo trên lịch của từng người dùng |

---

# 👤 HƯỚNG DẪN CHO USER (Người dùng cuối)

## 📋 Yêu cầu

- Tài khoản Google
- Trình duyệt web (Chrome, Firefox, Safari, Edge)

---

## 🚀 Bắt đầu sử dụng

### Bước 1: Tạo Google Sheet

1. Truy cập [sheets.google.com](https://sheets.google.com)
2. Click **"+ Blank"** để tạo Sheet mới
3. Đặt tên cho Sheet (ví dụ: "Photo Jobs Data")

### Bước 2: Kết nối với App

1. Mở link Web App (được admin cung cấp)
2. **Copy link Google Sheet** từ thanh địa chỉ trình duyệt
   ```
   https://docs.google.com/spreadsheets/d/abc123.../edit
   ```
3. **Dán link** vào ô nhập trong app
4. Click **"🔗 Kết nối"**

### Bước 3: Cấp quyền (chỉ lần đầu)

Khi được yêu cầu, cho phép app truy cập:
- ✅ **Google Sheets**: Để lưu dữ liệu jobs, khách hàng, partner
- ✅ **Google Calendar**: Để tự động tạo lịch chụp

> 💡 Dữ liệu được lưu 100% trên Sheet của bạn. Admin không có quyền truy cập.

---

## 📱 Sử dụng App

### Trang Tổng quan (Dashboard)

- Xem tổng doanh thu, công nợ
- Xem số lượng jobs theo trạng thái
- Xem lịch chụp sắp tới (7 ngày)

### Quản lý Jobs

1. Vào tab **Jobs**
2. Click **➕** để thêm job mới
3. Điền thông tin:
   - **Tên khách hàng** (bắt buộc)
   - **Ngày chụp** (bắt buộc)
   - Địa điểm, loại chụp, giá tiền...
4. Click **"Lưu Job"**
5. ✅ Tự động tạo event trên Google Calendar của bạn

**Các chức năng khác:**
- Click vào job để xem chi tiết
- Sửa thông tin job
- Xóa job (soft delete)
- Tìm kiếm và lọc theo trạng thái

### Quản lý Khách hàng

1. Vào tab **Khách**
2. Click **➕** để thêm khách mới
3. Hoặc thêm trực tiếp khi tạo job (tự động lưu)

**Thông tin khách hàng:**
- Tên, SĐT, Email, Địa chỉ
- Tổng số job đã đặt
- Tổng chi tiêu

### Quản lý Partners

1. Vào tab **Partner**
2. Click **➕** để thêm partner mới
3. Gán partner vào job khi tạo/sửa job

**Thông tin partner:**
- Tên, SĐT, Email, Chuyên môn
- Tổng số job đã làm
- Tổng lương đã nhận

### Báo cáo

1. Vào tab **Báo cáo**
2. Chọn loại báo cáo:
   - **Doanh thu**: Theo tuần/tháng/toàn thời gian
   - **Thanh toán**: Đã TT/Chưa TT/TT một phần
   - **Khách hàng**: Top khách hàng chi tiêu nhiều nhất
   - **Partner**: Thống kê theo partner

---

## 🔗 Chia sẻ App

Bạn có thể chia sẻ app cho người khác:

1. Click nút **🔗** trên header
2. Copy link
3. Gửi cho bạn bè

> ⚠️ Mỗi người cần có Google Sheet riêng để lưu dữ liệu của họ.

---

## ⚙️ Cài đặt

Click nút **⚙️** trên header để:
- Xem Spreadsheet ID đang kết nối
- Ngắt kết nối (đổi sang Sheet khác)

---

## ❓ Câu hỏi thường gặp

### Q: Dữ liệu của tôi lưu ở đâu?
**A:** 100% trên Google Sheet của bạn. Admin hoặc người khác không thể xem.

### Q: Tôi có thể xem dữ liệu trực tiếp trên Sheet không?
**A:** Có. Mở Google Sheet để xem các tab: Jobs, Customers, Partners.

### Q: Calendar event tạo ở đâu?
**A:** Trên Google Calendar mặc định của bạn.

### Q: Tôi quên link Google Sheet?
**A:** Vào Cài đặt (⚙️) trong app để xem Spreadsheet ID. Hoặc vào [sheets.google.com](https://sheets.google.com) để tìm Sheet.

### Q: Làm sao để đổi sang Sheet khác?
**A:** Vào Cài đặt → Ngắt kết nối → Nhập link Sheet mới.

### Q: App có hoạt động offline không?
**A:** Không. Cần kết nối internet để sử dụng.

---

## 🔧 Tùy chỉnh (Dành cho Admin)

### Thêm loại chụp mới

Sửa trong `Code.gs`:
```javascript
const JOB_TYPES = ['Cưới', 'Sự kiện', 'Sản phẩm', 'Cá nhân', 'Portrait', 'Khác'];
```

### Thay đổi thời lượng Calendar event

Sửa trong `CalendarService.gs`:
```javascript
const endDate = new Date(shootDate.getTime() + 3 * 60 * 60 * 1000); // +3 giờ
```

### Thay đổi màu sắc giao diện

Sửa trong `styles.html`, tìm các biến CSS:
```css
--primary: #6366f1;
--success: #10b981;
--danger: #ef4444;
```

---

## 📜 License

MIT License - Tự do sử dụng và chỉnh sửa.

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, liên hệ admin để được hỗ trợ.
