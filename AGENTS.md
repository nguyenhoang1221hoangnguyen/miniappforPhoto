# AGENTS.md - Photo Job Manager

> Context file cho AI Agents (Amp, Claude, etc.) khi làm việc với project này.

---

## 📁 Project Overview

| Key | Value |
|-----|-------|
| **Tên project** | Photo Job Manager |
| **Loại** | Google Apps Script (Web App) |
| **Ngôn ngữ** | JavaScript (GAS), HTML, CSS |
| **Storage** | Google Sheets (mỗi user có sheet riêng) |
| **Deploy tool** | clasp |
| **Script ID** | `1qHdFCU1ekn4fCuZfZcuFHUIQW_dXhjcTBHlOfCAwx_8iQg4JFXuH-9ux` |

---

## 🛠️ Commands

```bash
# Push code lên Google Apps Script
clasp push --force

# Deploy version mới (UPDATE deployment hiện có - giữ nguyên URL)
clasp deploy -i AKfycbyGqIckqHxoDVWHmJxAOemXGkUcFuo9KU4ywN_chl5rExfAZGtrmYnWttyaK8VuWa6rug --description "v3.x - mô tả"

# Xem deployments
clasp deployments

# Mở Apps Script Editor
clasp open
```

> **⚠️ QUAN TRỌNG**: Luôn dùng `-i <deployment_id>` để update deployment hiện có, KHÔNG tạo deployment mới!

---

## 📂 File Structure

```
├── Code.gs              # Entry point, menu, constants, utilities
├── JobService.gs        # CRUD Jobs
├── CustomerService.gs   # CRUD Customers
├── PartnerService.gs    # CRUD Partners
├── CalendarService.gs   # Google Calendar integration
├── ReportService.gs     # Reports (revenue, payment, customer, partner)
├── index.html           # Main HTML template
├── styles.html          # CSS styles
├── components.html      # Form templates (job, customer, partner, detail)
├── reports.html         # Report UI templates
├── app.js.html          # Main JavaScript
├── autocomplete.js.html # Autocomplete logic with preload
└── sample_data/         # Sample CSV data (1000 jobs, 100 customers, 100 partners)
```

---

## 🔧 Key Functions

### Backend (*.gs)

| File | Function | Mô tả |
|------|----------|-------|
| Code.gs | `doGet()` | Web App entry point |
| Code.gs | `getSheet(name, spreadsheetId)` | Lấy sheet theo tên |
| Code.gs | `safeFormatDate(value, format)` | Format date an toàn |
| Code.gs | `safeExecute(fn, errorMsg)` | Wrapper xử lý lỗi |
| Code.gs | `withLock(fn, timeout)` | Lock để tránh race condition |
| JobService.gs | `getAllJobs(spreadsheetId)` | Lấy tất cả jobs |
| JobService.gs | `addJob(data, spreadsheetId)` | Thêm job mới |
| JobService.gs | `updateJob(id, data, spreadsheetId)` | Cập nhật job |
| JobService.gs | `searchJobs(filters, spreadsheetId)` | Tìm kiếm jobs |
| CustomerService.gs | `searchCustomers(query, spreadsheetId)` | Tìm customers |
| PartnerService.gs | `searchPartners(query, spreadsheetId)` | Tìm partners |

### Frontend (*.html)

| File | Function | Mô tả |
|------|----------|-------|
| app.js.html | `showMainApp()` | Khởi tạo app |
| app.js.html | `loadJobs()`, `loadCustomers()`, `loadPartners()` | Load data |
| app.js.html | `formatCurrencyInput(input)` | Format tiền với dấu phân cách |
| app.js.html | `parseFormattedNumber(str)` | Parse số từ string có dấu phân cách |
| autocomplete.js.html | `preloadAutocompleteData()` | Preload customers & partners |
| autocomplete.js.html | `handleCustomerInput(el)` | Xử lý autocomplete customer |

---

## 📊 Data Schema

### Jobs Sheet (21 columns)
```
ID, Customer_ID, Tên khách hàng, SĐT khách, Email khách,
Ngày chụp, Địa điểm, Loại chụp, Giá tiền, Đã thanh toán,
Còn nợ, Trạng thái TT, Trạng thái Job, Link Google Drive,
Partner_ID, Tên Partner, Lương Partner, Ghi chú,
Calendar Event ID, Ngày tạo, Đã xóa
```

### Customers Sheet (10 columns)
```
Customer_ID, Tên, SĐT, Email, Địa chỉ,
Tổng job, Tổng chi tiêu, Ghi chú, Ngày tạo, Đã xóa
```

### Partners Sheet (10 columns)
```
Partner_ID, Tên, SĐT, Email, Chuyên môn,
Tổng job, Tổng lương, Ghi chú, Ngày tạo, Đã xóa
```

---

## ⚠️ Lưu ý quan trọng

### 1. Data type từ Google Sheets
- **Phone** có thể là **number** (không phải string) → luôn dùng `String(value)` trước khi gọi `.includes()`
- **Date** có thể invalid → dùng `safeFormatDate()` thay vì `Utilities.formatDate()` trực tiếp

### 2. Error handling
- Mọi `google.script.run` phải có **cả** `.withSuccessHandler()` và `.withFailureHandler()`
- Backend dùng `safeExecute()` để wrap operations

### 3. Currency formatting
- Input fields dùng `type="text"` với `inputmode="numeric"`
- Dùng `formatCurrencyInput()` khi input
- Dùng `parseFormattedNumber()` khi đọc giá trị

### 4. Autocomplete
- Data được **preload** khi app load (trong `preloadAutocompleteData()`)
- Search chạy **local** trong `preloadedCustomers` / `preloadedPartners`
- Không cần gọi API mỗi lần gõ

---

## 🐛 Các lỗi đã fix

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `phone.includes is not a function` | phone là number từ Sheet | Convert tất cả fields thành String trong `getAllCustomers/getAllPartners` |
| Date formatting crash | Invalid date | Thêm `safeFormatDate()` với try-catch |
| API call fail không có thông báo | Thiếu `withFailureHandler` | Thêm cho tất cả `google.script.run` calls |
| Search chậm | Gọi API mỗi lần gõ | Preload data và search local |

---

## 📝 Coding Conventions

1. **Naming**: camelCase cho functions, UPPER_CASE cho constants
2. **Error handling**: Luôn return `{ success: true/false, message: '...' }`
3. **Soft delete**: Dùng cột "Đã xóa" (TRUE/FALSE), không xóa thật
4. **ID format**: `JOB-001`, `KH-001`, `PT-001`

---

## 🔗 Related Links

- **Google Sheet mẫu**: https://docs.google.com/spreadsheets/d/1QN0ZZYPCgKR5-C6T78MElh2qMHYzdpRs81EzGngL9TE/edit
- **Apps Script Editor**: https://script.google.com/d/1qHdFCU1ekn4fCuZfZcuFHUIQW_dXhjcTBHlOfCAwx_8iQg4JFXuH-9ux/edit

---

## 📅 Changelog

### 2026-01-12
- ✅ Fixed error handling (withFailureHandler cho tất cả API calls)
- ✅ Fixed null check trong searchJobs, searchCustomers, searchPartners
- ✅ Added `safeFormatDate()` để xử lý date an toàn
- ✅ Added preload cho autocomplete (tìm kiếm instant)
- ✅ Fixed `phone.includes` error (convert tất cả field thành String)
- ✅ Added currency formatting với dấu phân cách (6,000,000)
- ✅ Generated sample data: 1000 Jobs, 100 Customers, 100 Partners
