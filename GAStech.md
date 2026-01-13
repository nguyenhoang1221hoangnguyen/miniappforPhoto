# 📘 Hướng Dẫn Kỹ Thuật: Xây Dựng Ứng Dụng Server-Client trên Google Apps Script

> Tài liệu này hướng dẫn chi tiết cách xây dựng ứng dụng Web App trên Google Apps Script với kiến trúc Server-Client, sử dụng Google Sheets làm database và tích hợp các Google Services.

---

## 📋 Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Cấu Trúc Project](#2-cấu-trúc-project)
3. [Server-Side (Backend)](#3-server-side-backend)
4. [Client-Side (Frontend)](#4-client-side-frontend)
5. [Giao Tiếp Server-Client](#5-giao-tiếp-server-client)
6. [HTML Templating](#6-html-templating)
7. [Google Sheets như Database](#7-google-sheets-như-database)
8. [Tích Hợp Google Services](#8-tích-hợp-google-services)
9. [Deploy và Phân Phối](#9-deploy-và-phân-phối)
10. [Best Practices](#10-best-practices)
11. [Xử Lý Lỗi và Debug](#11-xử-lý-lỗi-và-debug)
12. [Bảo Mật](#12-bảo-mật)
13. [Kiến Trúc Multi-Tenant BYOD](#13-kiến-trúc-multi-tenant-byod)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Mô Hình Server-Client trong GAS

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    HTML/CSS/JS                       │    │
│  │  • index.html (Main template)                        │    │
│  │  • styles.html (CSS)                                 │    │
│  │  • app.js.html (JavaScript logic)                    │    │
│  │  • components.html (UI components)                   │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
│                   google.script.run                          │
│                          │                                   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Google Apps Script)               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Code.gs          - Entry point, routing             │    │
│  │  JobService.gs    - CRUD operations for Jobs         │    │
│  │  CustomerService.gs - CRUD for Customers             │    │
│  │  PartnerService.gs  - CRUD for Partners              │    │
│  │  CalendarService.gs - Google Calendar integration    │    │
│  │  ReportService.gs   - Reporting & Analytics          │    │
│  └───────────────────────┬─────────────────────────────┘    │
│                          │                                   │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    GOOGLE SERVICES                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────────┐        │
│  │   Sheets   │  │  Calendar  │  │  Drive/Gmail   │        │
│  │ (Database) │  │  (Events)  │  │   (Storage)    │        │
│  └────────────┘  └────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Luồng Dữ Liệu

1. **User** mở Web App URL → Server trả về HTML
2. **Client** gọi `google.script.run.serverFunction()` 
3. **Server** xử lý, tương tác với Google Services
4. **Server** trả kết quả về Client qua callback
5. **Client** cập nhật UI

---

## 2. Cấu Trúc Project

### 2.1 Cấu Trúc File Chuẩn

```
project/
├── appsscript.json          # Cấu hình project (scopes, timezone)
├── .clasp.json              # Cấu hình clasp (deploy tool)
│
├── # SERVER-SIDE (.gs files)
├── Code.gs                  # Entry point: doGet(), onOpen(), include()
├── [Entity]Service.gs       # CRUD operations cho từng entity
├── CalendarService.gs       # Tích hợp Google Calendar
├── ReportService.gs         # Logic báo cáo
│
├── # CLIENT-SIDE (.html files)
├── index.html               # Main HTML template
├── styles.html              # CSS (wrapped in <style>)
├── app.js.html              # JavaScript (wrapped in <script>)
├── components.html          # UI templates
└── [feature].html           # Feature-specific components
```

### 2.2 appsscript.json - Cấu Hình OAuth Scopes

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

**Các Scopes Phổ Biến:**

| Scope | Mục đích |
|-------|----------|
| `auth/spreadsheets` | Đọc/ghi Google Sheets |
| `auth/calendar` | Đọc/ghi Google Calendar |
| `auth/drive` | Truy cập Google Drive |
| `auth/gmail.send` | Gửi email |
| `auth/script.container.ui` | Hiển thị UI trong container |

---

## 3. Server-Side (Backend)

### 3.1 Entry Point - Code.gs

```javascript
/**
 * Web App entry point - xử lý GET request
 */
function doGet(e) {
  const html = HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('App Title')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return html;
}

/**
 * Include file HTML vào template
 * Cho phép tách nhỏ code thành nhiều file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Tạo menu khi mở Spreadsheet (cho Add-on/Sidebar)
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📷 App Name')
    .addItem('Mở App', 'openSidebar')
    .addItem('Cài đặt', 'showSettings')
    .addToUi();
}
```

### 3.2 Service Pattern - CRUD Operations

```javascript
/**
 * Service pattern cho mỗi entity
 * File: EntityService.gs
 */

// Constants
const SHEET_NAME = 'EntityName';

/**
 * Lấy tất cả records (với soft delete filter)
 */
function getAllEntities(spreadsheetId) {
  const sheet = getSheet(SHEET_NAME, spreadsheetId);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return []; // Chỉ có header
  
  const data = sheet.getRange(2, 1, lastRow - 1, COLUMN_COUNT).getValues();
  
  return data
    .filter(row => row[DELETED_COLUMN] !== true) // Soft delete
    .map(row => mapRowToObject(row));
}

/**
 * Thêm record mới
 */
function addEntity(entityData, spreadsheetId) {
  // 1. Validation
  if (!entityData.requiredField) {
    return { success: false, message: 'Thiếu thông tin bắt buộc!' };
  }
  
  // 2. Generate ID
  const sheet = getSheet(SHEET_NAME, spreadsheetId);
  const entityId = generateId('PREFIX', sheet);
  
  // 3. Prepare row data
  const rowData = [
    entityId,
    entityData.field1,
    entityData.field2,
    // ... other fields
    new Date(), // createdAt
    false       // isDeleted (soft delete)
  ];
  
  // 4. Append to sheet
  sheet.appendRow(rowData);
  
  return { success: true, id: entityId, message: 'Thêm thành công!' };
}

/**
 * Cập nhật record
 */
function updateEntity(entityId, entityData, spreadsheetId) {
  const sheet = getSheet(SHEET_NAME, spreadsheetId);
  const data = sheet.getDataRange().getValues();
  
  // Tìm row theo ID
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === entityId) {
      rowIndex = i + 1; // +1 vì sheet index từ 1
      break;
    }
  }
  
  if (rowIndex === -1) {
    return { success: false, message: 'Không tìm thấy!' };
  }
  
  // Update row
  const rowData = buildRowData(entityId, entityData, data[rowIndex - 1]);
  sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  
  return { success: true, message: 'Cập nhật thành công!' };
}

/**
 * Xóa mềm (Soft Delete)
 */
function deleteEntity(entityId, spreadsheetId) {
  const sheet = getSheet(SHEET_NAME, spreadsheetId);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === entityId) {
      sheet.getRange(i + 1, DELETED_COLUMN + 1).setValue(true);
      return { success: true, message: 'Đã xóa!' };
    }
  }
  
  return { success: false, message: 'Không tìm thấy!' };
}
```

### 3.3 Helper Functions

```javascript
/**
 * Lấy sheet, hỗ trợ cả Web App và Sidebar mode
 */
function getSheet(sheetName, spreadsheetId) {
  let ss;
  if (spreadsheetId) {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } else {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  return ss.getSheetByName(sheetName);
}

/**
 * Generate ID có format: PREFIX-001, PREFIX-002, ...
 */
function generateId(prefix, sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return `${prefix}-001`;
  }
  const lastId = sheet.getRange(lastRow, 1).getValue();
  const num = parseInt(lastId.split('-')[1]) + 1;
  return `${prefix}-${num.toString().padStart(3, '0')}`;
}

/**
 * Validate Spreadsheet ID
 */
function validateSpreadsheetId(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    return {
      success: true,
      name: ss.getName(),
      sheets: ss.getSheets().map(s => s.getName())
    };
  } catch (e) {
    return {
      success: false,
      error: 'Không thể truy cập Spreadsheet'
    };
  }
}
```

---

## 4. Client-Side (Frontend)

### 4.1 Cấu Trúc HTML Chính (index.html)

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <base target="_top">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#6366f1">
  
  <!-- PWA support -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  
  <title>App Title</title>
  
  <!-- Include CSS -->
  <?!= include('styles'); ?>
</head>
<body>
  
  <!-- App Container -->
  <div id="app" class="app-container">
    <!-- Header -->
    <header class="app-header">...</header>
    
    <!-- Main Content -->
    <main class="main-content">
      <div id="contentArea"></div>
    </main>
    
    <!-- Navigation -->
    <nav class="nav-tabs">...</nav>
  </div>
  
  <!-- Modal -->
  <div id="modalOverlay" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2 id="modalTitle"></h2>
        <button onclick="closeModal()">✕</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>
  
  <!-- Toast Notification -->
  <div id="toast" class="toast"></div>
  
  <!-- Include Components & JS -->
  <?!= include('components'); ?>
  <?!= include('app.js'); ?>
  
</body>
</html>
```

### 4.2 JavaScript Client (app.js.html)

```html
<script>
// ========================================
// GLOBAL STATE
// ========================================
let allData = [];
let spreadsheetId = null;
const STORAGE_KEY = 'app_spreadsheetId';

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  // Kiểm tra đã setup chưa
  spreadsheetId = localStorage.getItem(STORAGE_KEY);
  
  if (spreadsheetId) {
    validateAndLoad();
  } else {
    showSetupScreen();
  }
});

function validateAndLoad() {
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        showMainApp();
        loadAllData();
      } else {
        showSetupScreen();
      }
    })
    .withFailureHandler(handleError)
    .validateSpreadsheetId(spreadsheetId);
}

// ========================================
// SERVER COMMUNICATION PATTERN
// ========================================

/**
 * Pattern chuẩn gọi server function
 */
function callServer(functionName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [functionName](...args);
  });
}

/**
 * Load data từ server
 */
function loadAllData() {
  showLoading(true);
  
  google.script.run
    .withSuccessHandler(function(data) {
      allData = data;
      renderDataList(data);
      showLoading(false);
    })
    .withFailureHandler(function(error) {
      showError('Lỗi tải dữ liệu: ' + error.message);
      showLoading(false);
    })
    .getAllEntities(spreadsheetId);
}

/**
 * Submit form
 */
function submitForm(event) {
  event.preventDefault();
  
  const formData = getFormData();
  showLoading(true);
  
  google.script.run
    .withSuccessHandler(function(result) {
      showLoading(false);
      if (result.success) {
        showToast(result.message, 'success');
        closeModal();
        loadAllData(); // Refresh
      } else {
        showToast(result.message, 'error');
      }
    })
    .withFailureHandler(function(error) {
      showLoading(false);
      showToast('Lỗi: ' + error.message, 'error');
    })
    .addEntity(formData, spreadsheetId);
}

// ========================================
// UI UTILITIES
// ========================================

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function showLoading(show) {
  document.getElementById('loadingIndicator').style.display = 
    show ? 'flex' : 'none';
}

// ========================================
// SEARCH & FILTER
// ========================================
let searchTimeout;

function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(performSearch, 300);
}

function performSearch() {
  const keyword = document.getElementById('searchInput').value;
  const filtered = allData.filter(item => 
    item.name.toLowerCase().includes(keyword.toLowerCase())
  );
  renderDataList(filtered);
}

// ========================================
// FORMAT UTILITIES
// ========================================

function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount || 0);
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>
```

### 4.3 CSS Responsive (styles.html)

```html
<style>
/* CSS Variables */
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  
  --header-height: 60px;
  --nav-height: 64px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

/* Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Mobile-first Layout */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  padding: 16px;
  padding-bottom: calc(var(--nav-height) + var(--safe-bottom) + 20px);
  overflow-y: auto;
}

/* Bottom Navigation */
.nav-tabs {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
  padding-bottom: var(--safe-bottom);
}

/* Desktop Layout */
@media (min-width: 1024px) {
  .app-container {
    flex-direction: row;
  }
  
  .nav-tabs {
    position: static;
    flex-direction: column;
    width: 240px;
    border-right: 1px solid var(--border-color);
    border-top: none;
  }
  
  .main-content {
    padding-bottom: 16px;
  }
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay.active {
  display: flex;
}

.modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  padding: 12px 24px;
  border-radius: 8px;
  background: var(--text-primary);
  color: white;
  opacity: 0;
  transition: all 0.3s;
}

.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.toast.success { background: var(--success); }
.toast.error { background: var(--danger); }
</style>
```

---

## 5. Giao Tiếp Server-Client

### 5.1 API của google.script.run

```javascript
// Cú pháp cơ bản
google.script.run
  .withSuccessHandler(onSuccess)    // Callback khi thành công
  .withFailureHandler(onError)      // Callback khi lỗi
  .withUserObject(context)          // Truyền context tùy chỉnh
  .serverFunctionName(arg1, arg2);  // Gọi function server

// Ví dụ thực tế
google.script.run
  .withSuccessHandler(function(result) {
    console.log('Success:', result);
  })
  .withFailureHandler(function(error) {
    console.error('Error:', error.message);
  })
  .withUserObject({ itemId: '123' })
  .updateItem(itemData, spreadsheetId);
```

### 5.2 Quy Tắc Truyền Dữ Liệu

**Hỗ trợ:**
- Primitives: string, number, boolean, null
- Objects: JSON-serializable objects
- Arrays: arrays of supported types
- Date objects (tự động convert)

**KHÔNG hỗ trợ:**
- Functions
- DOM elements
- Class instances
- Circular references

```javascript
// ✅ Đúng
const data = {
  name: "John",
  age: 30,
  items: ["a", "b"],
  date: new Date()
};

// ❌ Sai
const data = {
  element: document.getElementById('form'),  // DOM element
  callback: function() {},                    // Function
};
```

### 5.3 Pattern Async/Promise

```javascript
// Wrapper để dùng async/await
function callServerAsync(functionName, ...args) {
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject)
      [functionName](...args);
  });
}

// Sử dụng
async function loadData() {
  try {
    showLoading(true);
    const data = await callServerAsync('getAllItems', spreadsheetId);
    renderList(data);
  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

// Parallel calls
async function loadAllData() {
  const [jobs, customers, partners] = await Promise.all([
    callServerAsync('getAllJobs', spreadsheetId),
    callServerAsync('getAllCustomers', spreadsheetId),
    callServerAsync('getAllPartners', spreadsheetId)
  ]);
  // Use data...
}
```

---

## 6. HTML Templating

### 6.1 Scriptlets trong Template

```html
<!-- Printing scriptlet: In giá trị -->
<p>Hello, <?= username ?>!</p>

<!-- Force-printing scriptlet: In HTML không escape -->
<div><?!= include('component'); ?></div>

<!-- Standard scriptlet: Logic code -->
<? for (let i = 0; i < items.length; i++) { ?>
  <div><?= items[i].name ?></div>
<? } ?>
```

### 6.2 Include Pattern

```javascript
// Server-side
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <?!= include('styles'); ?>
</head>
<body>
  <?!= include('header'); ?>
  
  <main>
    <?!= include('content'); ?>
  </main>
  
  <?!= include('footer'); ?>
  <?!= include('app.js'); ?>
</body>
</html>
```

### 6.3 Template Components

```html
<!-- components.html -->
<script type="text/html" id="itemTemplate">
  <div class="item-card" data-id="{id}">
    <h3>{name}</h3>
    <p>{description}</p>
    <button onclick="editItem('{id}')">Sửa</button>
  </div>
</script>

<script>
// Hàm render template
function renderTemplate(templateId, data) {
  let template = document.getElementById(templateId).innerHTML;
  
  for (const [key, value] of Object.entries(data)) {
    template = template.replace(new RegExp(`{${key}}`, 'g'), value || '');
  }
  
  return template;
}

// Sử dụng
function renderList(items) {
  const container = document.getElementById('listContainer');
  container.innerHTML = items.map(item => 
    renderTemplate('itemTemplate', item)
  ).join('');
}
</script>
```

---

## 7. Google Sheets như Database

### 7.1 Cấu Trúc Sheet

```
┌────────┬──────────┬─────────┬───────────┬──────────┐
│   ID   │   Name   │  Phone  │ CreatedAt │ IsDeleted│
├────────┼──────────┼─────────┼───────────┼──────────┤
│ KH-001 │ Nguyễn A │ 0901... │ 2026-01-01│  FALSE   │
│ KH-002 │ Trần B   │ 0902... │ 2026-01-02│  FALSE   │
│ KH-003 │ Lê C     │ 0903... │ 2026-01-03│  TRUE    │ <- Soft deleted
└────────┴──────────┴─────────┴───────────┴──────────┘
```

### 7.2 Khởi Tạo Sheets

```javascript
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Tạo sheet nếu chưa có
  let sheet = ss.getSheetByName('Customers');
  if (!sheet) {
    sheet = ss.insertSheet('Customers');
    
    // Header row
    const headers = ['ID', 'Name', 'Phone', 'Email', 'CreatedAt', 'IsDeleted'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Format header
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#4a86e8')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    
    // Freeze header row
    sheet.setFrozenRows(1);
  }
}
```

### 7.3 CRUD Operations tối ưu

```javascript
// READ - Batch read
function getAllData(spreadsheetId) {
  const sheet = getSheet('DataSheet', spreadsheetId);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  // Đọc tất cả data một lần (tối ưu performance)
  const data = sheet.getRange(2, 1, lastRow - 1, COLUMN_COUNT).getValues();
  
  return data
    .filter(row => !row[DELETED_INDEX])
    .map(mapRowToObject);
}

// CREATE - Append row
function addData(data, spreadsheetId) {
  const sheet = getSheet('DataSheet', spreadsheetId);
  const id = generateId('DATA', sheet);
  
  const row = [id, data.field1, data.field2, new Date(), false];
  sheet.appendRow(row);
  
  return { success: true, id };
}

// UPDATE - Set values
function updateData(id, data, spreadsheetId) {
  const sheet = getSheet('DataSheet', spreadsheetId);
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === id) {
      const row = buildRow(id, data, allData[i]);
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true };
    }
  }
  return { success: false };
}

// DELETE - Soft delete
function deleteData(id, spreadsheetId) {
  const sheet = getSheet('DataSheet', spreadsheetId);
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === id) {
      sheet.getRange(i + 1, DELETED_COLUMN).setValue(true);
      return { success: true };
    }
  }
  return { success: false };
}
```

### 7.4 Search & Filter

```javascript
function searchData(filters, spreadsheetId) {
  let data = getAllData(spreadsheetId);
  
  // Keyword search
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    data = data.filter(item => 
      item.name.toLowerCase().includes(kw) ||
      item.description.toLowerCase().includes(kw)
    );
  }
  
  // Status filter
  if (filters.status) {
    data = data.filter(item => item.status === filters.status);
  }
  
  // Date range filter
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    data = data.filter(item => new Date(item.date) >= from);
  }
  
  return data;
}
```

---

## 8. Tích Hợp Google Services

### 8.1 Google Calendar

```javascript
/**
 * Tạo event trên Calendar
 */
function createCalendarEvent(eventData) {
  const calendar = CalendarApp.getDefaultCalendar();
  
  const startTime = new Date(eventData.startTime);
  const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // +2 giờ
  
  const event = calendar.createEvent(
    eventData.title,
    startTime,
    endTime,
    {
      description: eventData.description,
      location: eventData.location
    }
  );
  
  // Thêm reminder
  event.addPopupReminder(60);    // 1 giờ trước
  event.addPopupReminder(1440);  // 1 ngày trước
  
  // Mời guests
  if (eventData.guestEmail) {
    event.addGuest(eventData.guestEmail);
  }
  
  return event.getId();
}

/**
 * Cập nhật event
 */
function updateCalendarEvent(eventId, eventData) {
  const calendar = CalendarApp.getDefaultCalendar();
  const event = calendar.getEventById(eventId);
  
  if (!event) {
    return createCalendarEvent(eventData);
  }
  
  event.setTitle(eventData.title);
  event.setTime(new Date(eventData.startTime), new Date(eventData.endTime));
  event.setDescription(eventData.description);
  event.setLocation(eventData.location);
  
  return eventId;
}

/**
 * Xóa event
 */
function deleteCalendarEvent(eventId) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const event = calendar.getEventById(eventId);
    if (event) event.deleteEvent();
  } catch (e) {
    console.error('Delete event error:', e);
  }
}
```

### 8.2 Google Drive

```javascript
/**
 * Tạo folder trên Drive
 */
function createFolder(folderName, parentFolderId) {
  let parent;
  if (parentFolderId) {
    parent = DriveApp.getFolderById(parentFolderId);
  } else {
    parent = DriveApp.getRootFolder();
  }
  
  const folder = parent.createFolder(folderName);
  return {
    id: folder.getId(),
    url: folder.getUrl()
  };
}

/**
 * Upload file
 */
function uploadFile(base64Data, fileName, folderId) {
  const folder = DriveApp.getFolderById(folderId);
  const blob = Utilities.newBlob(
    Utilities.base64Decode(base64Data), 
    'application/octet-stream', 
    fileName
  );
  const file = folder.createFile(blob);
  return file.getUrl();
}
```

### 8.3 Gmail

```javascript
/**
 * Gửi email thông báo
 */
function sendNotificationEmail(to, subject, body) {
  GmailApp.sendEmail(to, subject, body, {
    htmlBody: body,
    name: 'App Notification'
  });
}

/**
 * Gửi email với template
 */
function sendTemplateEmail(to, templateData) {
  const template = HtmlService.createTemplateFromFile('email-template');
  template.data = templateData;
  
  const htmlBody = template.evaluate().getContent();
  
  GmailApp.sendEmail(to, templateData.subject, '', {
    htmlBody: htmlBody
  });
}
```

---

## 9. Deploy và Phân Phối

### 9.1 Deploy Web App

**Qua Google Apps Script Editor:**
1. Menu **Deploy** → **New deployment**
2. Chọn **Type**: Web app
3. Cấu hình:
   - **Execute as**: User accessing the web app (mỗi user dùng quyền riêng)
   - **Who has access**: Anyone (hoặc Anyone with Google Account)
4. Click **Deploy** → Copy **Web app URL**

**Qua clasp CLI:**
```bash
# Cài đặt clasp
npm install -g @google/clasp

# Login
clasp login

# Clone project
clasp clone <script-id>

# Push changes
clasp push

# Deploy
clasp deploy --description "Version 1.0"
```

### 9.2 Cấu Hình .clasp.json

```json
{
  "scriptId": "1qHdFCU1ekn4fCuZfZcuFHUIQW_dXhjcTBHlOfCAwx_8iQg4JFXuH-9ux",
  "rootDir": "."
}
```

### 9.3 Lưu và Hiển Thị Deployment URL

```javascript
const DEPLOYMENT_ID_KEY = 'WEBAPP_DEPLOYMENT_ID';

/**
 * Lưu Deployment ID
 */
function saveDeploymentId(deploymentId) {
  PropertiesService.getScriptProperties()
    .setProperty(DEPLOYMENT_ID_KEY, deploymentId);
}

/**
 * Lấy Web App URL
 */
function getWebAppUrl() {
  const deploymentId = PropertiesService.getScriptProperties()
    .getProperty(DEPLOYMENT_ID_KEY);
  
  if (!deploymentId) return null;
  
  return `https://script.google.com/macros/s/${deploymentId}/exec`;
}
```

---

## 10. Best Practices

### 10.1 Performance

```javascript
// ❌ Chậm - Nhiều lần gọi API
for (let i = 0; i < 100; i++) {
  sheet.getRange(i + 1, 1).setValue(data[i]);
}

// ✅ Nhanh - Batch operation
sheet.getRange(1, 1, 100, 1).setValues(data.map(d => [d]));
```

### 10.2 Error Handling

```javascript
// Server-side
function safeOperation(operation) {
  try {
    return { success: true, data: operation() };
  } catch (e) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

// Client-side
function handleServerCall(serverFunction, ...args) {
  google.script.run
    .withSuccessHandler(result => {
      if (result.success) {
        onSuccess(result.data);
      } else {
        showError(result.error);
      }
    })
    .withFailureHandler(error => {
      showError('Lỗi kết nối: ' + error.message);
    })
    [serverFunction](...args);
}
```

### 10.3 Code Organization

```
# Theo chức năng
Code.gs           → Entry point, config
[Entity]Service.gs → Business logic cho entity
Utils.gs          → Helper functions

# Theo layer
controllers/      → Route handlers
services/         → Business logic  
repositories/     → Data access
utils/            → Helpers
```

### 10.4 Naming Conventions

```javascript
// Functions
function getAllCustomers() {}     // get + Entity + s
function getCustomerById() {}     // get + Entity + ById
function addCustomer() {}         // add + Entity
function updateCustomer() {}      // update + Entity
function deleteCustomer() {}      // delete + Entity
function searchCustomers() {}     // search + Entity + s

// Constants
const SHEET_NAMES = { ... };
const JOB_STATUS = ['...'];

// IDs
'KH-001', 'JOB-042', 'PT-003'     // PREFIX-NUMBER
```

---

## 11. Xử Lý Lỗi và Debug

### 11.1 Logging

```javascript
// Server-side logging
console.log('Info:', data);
console.error('Error:', error);
console.time('Operation');
// ... operation
console.timeEnd('Operation');

// View logs: Extensions → Apps Script → Executions
```

### 11.2 Debug Strategies

```javascript
// 1. Return debug info
function debugFunction() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    sheetNames: SpreadsheetApp.getActiveSpreadsheet()
      .getSheets().map(s => s.getName()),
    lastRow: sheet.getLastRow()
  };
  return debugInfo;
}

// 2. Try-catch với chi tiết
try {
  // operation
} catch (e) {
  return {
    success: false,
    error: e.message,
    stack: e.stack,
    line: e.lineNumber
  };
}
```

### 11.3 Common Errors

| Error | Nguyên nhân | Giải pháp |
|-------|-------------|-----------|
| `Cannot read property of undefined` | Truy cập sheet/range không tồn tại | Kiểm tra sheet name, range |
| `You do not have permission` | Thiếu OAuth scope | Thêm scope vào appsscript.json |
| `Exceeded maximum execution time` | Script chạy > 6 phút | Tối ưu code, chia nhỏ task |
| `Service invoked too many times` | Rate limit | Batch operations, cache |

---

## 12. Bảo Mật

### 12.1 Validate Input

```javascript
function addData(data, spreadsheetId) {
  // Validate spreadsheetId
  if (!spreadsheetId || typeof spreadsheetId !== 'string') {
    return { success: false, error: 'Invalid spreadsheet ID' };
  }
  
  // Validate required fields
  if (!data.name || data.name.trim() === '') {
    return { success: false, error: 'Name is required' };
  }
  
  // Sanitize input
  data.name = data.name.trim().substring(0, 100);
  data.email = data.email?.toLowerCase().trim();
  
  // Validate email format
  if (data.email && !isValidEmail(data.email)) {
    return { success: false, error: 'Invalid email format' };
  }
  
  // Process...
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### 12.2 Access Control

```javascript
/**
 * Kiểm tra user có quyền truy cập spreadsheet không
 */
function checkAccess(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const editors = ss.getEditors().map(e => e.getEmail());
    const currentUser = Session.getActiveUser().getEmail();
    
    return editors.includes(currentUser);
  } catch (e) {
    return false;
  }
}
```

### 12.3 Sensitive Data

```javascript
// ❌ Không lưu secrets trong code
const API_KEY = 'abc123';

// ✅ Dùng Properties Service
function getApiKey() {
  return PropertiesService.getScriptProperties().getProperty('API_KEY');
}

// ❌ Không log sensitive data
console.log('Password:', password);

// ✅ Mask sensitive data
console.log('Password:', '***hidden***');
```

---

## 13. Kiến Trúc Multi-Tenant BYOD

Ứng dụng Photo Job Manager sử dụng mô hình **"Multi-Tenant với Tenant-Owned Database"** (hay còn gọi là **BYOD - Bring Your Own Data**). Đây là một kiến trúc đặc biệt phù hợp với Google Apps Script.

### 13.1 Các Tên Gọi Khác

Mô hình này còn được gọi là:

| Tên gọi | Mô tả |
|---------|-------|
| **BYOD** | Bring Your Own Data(base) |
| **Tenant-Owned Storage** | Lưu trữ do tenant sở hữu |
| **Decentralized Multi-Tenant** | Multi-tenant phi tập trung |
| **User-Provisioned Database** | Database do user tự cung cấp |
| **External Database Pattern** | Mô hình database ngoài |
| **Federated Storage Architecture** | Kiến trúc lưu trữ liên kết |

### 13.2 So Sánh Các Mô Hình Multi-Tenant

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CÁC MÔ HÌNH MULTI-TENANT                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. SHARED DATABASE (Truyền thống)                                         │
│  ┌──────────────────────────────────────┐                                  │
│  │           Single Database            │                                  │
│  │  ┌─────┬─────┬─────┬─────┬─────┐    │                                  │
│  │  │Admin│User1│User2│User3│User4│    │  ← Tất cả chung 1 DB             │
│  │  └─────┴─────┴─────┴─────┴─────┘    │                                  │
│  └──────────────────────────────────────┘                                  │
│                                                                             │
│  2. DATABASE PER TENANT (Ứng dụng này ✅)                                   │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                           │
│  │ User1  │  │ User2  │  │ User3  │  │ Admin  │                           │
│  │ Sheet  │  │ Sheet  │  │ Sheet  │  │ Sheet  │  ← Mỗi người Sheet riêng  │
│  └────────┘  └────────┘  └────────┘  └────────┘                           │
│       │           │           │           │                                │
│       └───────────┴───────────┴───────────┘                                │
│                       │                                                     │
│              ┌────────────────┐                                            │
│              │  Single App    │  ← Chung 1 Web App                         │
│              │  (GAS Script)  │                                            │
│              └────────────────┘                                            │
│                                                                             │
│  3. SEPARATE INSTANCE (Truyền thống)                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                           │
│  │ App + DB 1 │  │ App + DB 2 │  │ App + DB 3 │  ← Mỗi tenant có app riêng│
│  └────────────┘  └────────────┘  └────────────┘                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.3 Cách Hoạt Động

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         BYOD WORKFLOW                                     │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  STEP 1: User tạo Google Sheet riêng                                     │
│  ┌─────────────┐                                                         │
│  │ User's Own  │  ← User sở hữu hoàn toàn                                │
│  │   Sheet     │                                                         │
│  └─────────────┘                                                         │
│         │                                                                │
│         ▼                                                                │
│  STEP 2: User paste link Sheet vào App                                   │
│  ┌─────────────────────────────────────────┐                            │
│  │  📎 Paste: docs.google.com/spreadsheets/d/xxx  │                     │
│  └─────────────────────────────────────────┘                            │
│         │                                                                │
│         ▼                                                                │
│  STEP 3: App validate & lưu spreadsheetId vào localStorage              │
│  ┌─────────────┐     ┌─────────────┐                                    │
│  │ validateId()│ ──► │ localStorage│                                    │
│  └─────────────┘     └─────────────┘                                    │
│         │                                                                │
│         ▼                                                                │
│  STEP 4: Mọi thao tác đều truyền spreadsheetId                          │
│  ┌─────────────────────────────────────────┐                            │
│  │ getAllJobs(spreadsheetId)               │                            │
│  │ addCustomer(data, spreadsheetId)        │                            │
│  │ updateJob(id, data, spreadsheetId)      │                            │
│  └─────────────────────────────────────────┘                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 13.4 Code Implementation Pattern

```javascript
// CLIENT-SIDE: Lưu spreadsheetId
const STORAGE_KEY = 'app_spreadsheetId';
let spreadsheetId = localStorage.getItem(STORAGE_KEY);

// Kết nối spreadsheet
function connectSpreadsheet() {
  const url = document.getElementById('spreadsheetUrlInput').value;
  const id = extractSpreadsheetId(url);
  
  google.script.run
    .withSuccessHandler(function(result) {
      if (result.success) {
        localStorage.setItem(STORAGE_KEY, id);
        spreadsheetId = id;
        showMainApp();
      }
    })
    .validateSpreadsheetId(id);
}

// Mọi API call đều truyền spreadsheetId
function loadJobs() {
  google.script.run
    .withSuccessHandler(renderJobs)
    .getAllJobs(spreadsheetId);  // ← Truyền spreadsheetId
}

// SERVER-SIDE: Nhận spreadsheetId từ client
function getAllJobs(spreadsheetId) {
  const sheet = SpreadsheetApp.openById(spreadsheetId)
    .getSheetByName('Jobs');
  // ... xử lý data
}

function addJob(jobData, spreadsheetId) {
  const sheet = SpreadsheetApp.openById(spreadsheetId)
    .getSheetByName('Jobs');
  // ... thêm job
}
```

### 13.5 Ưu Điểm Chi Tiết

#### A. Bảo Mật & Quyền Riêng Tư

| Ưu điểm | Giải thích | Ví dụ thực tế |
|---------|------------|---------------|
| **Data isolation hoàn toàn** | Mỗi user sở hữu data của mình | User A không thể access Sheet của User B |
| **Không lo data leak** | Admin app không thể xem data user | Developer không cần access data production |
| **User control permissions** | User tự quyết định ai được truy cập Sheet | Có thể share Sheet cho accountant xem báo cáo |
| **GDPR/Privacy friendly** | User muốn xóa data? Chỉ cần xóa Sheet của họ | Right to be forgotten dễ implement |
| **Audit trail tự động** | Google Sheets có version history | Xem ai edit gì lúc nào |

#### B. Chi Phí & Scalability

| Ưu điểm | Giải thích | So sánh |
|---------|------------|---------|
| **Zero database cost** | Google Sheets miễn phí | vs Firebase: $25/month+ |
| **Zero infrastructure** | Không cần server, không cần DevOps | vs AWS: $50/month+ |
| **Tự động scale** | Google lo việc scale Sheet | Không cần replica, sharding |
| **Unlimited tenants** | Thêm user không tăng chi phí cố định | Pay-per-user model tự nhiên |
| **No maintenance** | Google maintain Sheet infrastructure | Không cần DBA |

#### C. Phát Triển & Bảo Trì

| Ưu điểm | Giải thích |
|---------|------------|
| **Single codebase** | Chỉ maintain 1 bộ code cho tất cả users |
| **Easy deployment** | Deploy 1 lần, tất cả user dùng version mới |
| **No migration headache** | Schema thay đổi? User mới tự động có schema mới |
| **Rapid prototyping** | Xây dựng MVP trong vài ngày |
| **Hot reload** | Sửa code, refresh là thấy thay đổi |

#### D. User Experience

| Ưu điểm | Giải thích |
|---------|------------|
| **Familiar interface** | User có thể xem data trực tiếp trong Sheets |
| **Data portability** | Export data? Đã có sẵn trong Sheet rồi |
| **Backup tự động** | Google Sheets có version history |
| **Offline access to data** | Có thể xem Sheet offline qua Google Sheets app |
| **Custom formulas** | User có thể thêm formulas riêng vào Sheet |

### 13.6 Nhược Điểm Chi Tiết

#### A. Performance

| Nhược điểm | Mức độ | Giải thích | Workaround |
|------------|--------|------------|------------|
| **API latency cao** | 🔴 Cao | Mỗi request 500ms-2s | Cache ở client |
| **Không có caching tốt** | 🔴 Cao | Khó cache vì data ở Sheet của user | Implement TTL cache |
| **Quota limits** | 🟡 Trung bình | 6 phút/execution, 90 phút/ngày | Chia nhỏ operations |
| **Sheet limits** | 🟡 Trung bình | Max 10 triệu cells/spreadsheet | Archive old data |

```javascript
// Quota limits của Google Apps Script
const QUOTAS = {
  executionTime: '6 phút/lần',
  dailyTriggers: '90 phút/ngày',
  emailPerDay: '100 emails',
  urlFetchPerDay: '20,000 calls',
  spreadsheetCells: '10 triệu cells'
};
```

#### B. Bảo Mật

| Nhược điểm | Mức độ | Giải thích | Workaround |
|------------|--------|------------|------------|
| **Phụ thuộc user permissions** | 🟡 Trung bình | User set sai permission = rủi ro | Hướng dẫn chi tiết |
| **Không kiểm soát được data** | 🟡 Trung bình | User có thể edit trực tiếp Sheet | Validation mạnh ở app |
| **OAuth scope rộng** | 🟡 Trung bình | App cần quyền access Sheets | Giải thích rõ cho user |

#### C. Features & Flexibility

| Nhược điểm | Mức độ | Giải thích | Workaround |
|------------|--------|------------|------------|
| **Không có cross-tenant queries** | 🔴 Cao | Không thể aggregate data giữa các users | Không có (by design) |
| **Không có admin dashboard tổng** | 🔴 Cao | Admin không xem được tổng quan | Không có (by design) |
| **Limited data types** | 🟡 Trung bình | Chỉ có text/number/date | JSON.stringify cho complex data |
| **No relations/joins** | 🟡 Trung bình | Phải tự xử lý references | Denormalize data |
| **Không có transactions** | 🔴 Cao | Race conditions khó xử lý | Sử dụng LockService |

```javascript
// Workaround cho race condition
function atomicUpdate(spreadsheetId, operation) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Wait 30 seconds
    const result = operation();
    return result;
  } finally {
    lock.releaseLock();
  }
}
```

#### D. User Experience

| Nhược điểm | Mức độ | Giải thích | Workaround |
|------------|--------|------------|------------|
| **Setup phức tạp** | 🟡 Trung bình | User phải tạo Sheet, paste URL | Video tutorial, step-by-step |
| **Breaking changes** | 🟡 Trung bình | User đổi tên Sheet → App hỏng | Validation & clear errors |
| **OAuth consent scary** | 🟡 Trung bình | "App wants to access all your Sheets" | Giải thích tại sao cần |

#### E. Business Model

| Nhược điểm | Mức độ | Giải thích | Workaround |
|------------|--------|------------|------------|
| **Khó monetize** | 🔴 Cao | Không control data → khó lock-in | Premium features không dựa trên data |
| **Không có usage analytics** | 🟡 Trung bình | Không biết user dùng app như thế nào | Add tracking (với consent) |
| **Khó upsell** | 🟡 Trung bình | Không có premium features dựa trên data | Feature-based pricing |

### 13.7 So Sánh Tổng Quan

| Tiêu chí | BYOD (App này) | Shared DB | Separate Instance |
|----------|---------------|-----------|-------------------|
| **Chi phí DB** | $0 | $$ | $$$ |
| **Chi phí server** | $0 | $$ | $$$ |
| **Setup complexity** | User tự setup | Admin setup | Admin setup per tenant |
| **Data isolation** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Performance** | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cross-tenant analytics** | ❌ | ✅ | ❌ |
| **Admin control** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Scalability** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Development speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Maintenance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Data portability** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Privacy compliance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

### 13.8 Khi Nào Nên Dùng?

#### ✅ Phù Hợp Khi:

| Tình huống | Lý do |
|------------|-------|
| MVP / Prototype cần ra mắt nhanh | Development speed cực nhanh |
| Budget = $0 | Không có chi phí infrastructure |
| User cần **own their data** | Data isolation hoàn toàn |
| Số lượng data mỗi user nhỏ (<10,000 records) | Sheet xử lý tốt |
| Không cần admin dashboard tổng hợp | By design |
| Target audience đã quen Google Workspace | UX familiar |
| Internal tools cho SMB | Simple, effective |
| Solo developer / Small team | Easy to maintain |

#### ❌ Không Phù Hợp Khi:

| Tình huống | Lý do |
|------------|-------|
| Cần performance cao (real-time apps) | Latency 500ms-2s |
| Cần cross-tenant analytics/reporting | Không thể aggregate |
| Admin cần kiểm soát data của tất cả users | Không có admin access |
| Data volume lớn (>100K records/user) | Sheet performance degrades |
| Cần monetize bằng subscription dựa trên data | Không control data |
| Enterprise customers yêu cầu SLA | Google không đảm bảo SLA cho free |
| Cần complex queries / joins | Sheet không support |
| Cần real-time collaboration | Không có WebSocket |

### 13.9 Alternatives Khi Scale

Khi ứng dụng cần scale beyond BYOD:

```
┌─────────────────────────────────────────────────────────────────┐
│                    EVOLUTION PATH                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Stage 1: BYOD (Current)                                        │
│  ┌─────────────────┐                                            │
│  │ GAS + Sheets    │  ← $0/month, <10K records/user             │
│  └─────────────────┘                                            │
│           │                                                      │
│           ▼ When: Need more performance, features                │
│                                                                  │
│  Stage 2: BYOD + Shared Backend                                 │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ Sheets (user)   │  │ Firebase/Supabase│                      │
│  │ (user data)     │  │ (shared features)│                      │
│  └─────────────────┘  └─────────────────┘                       │
│           │                                                      │
│           ▼ When: Need admin dashboard, analytics                │
│                                                                  │
│  Stage 3: Hybrid                                                │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │ Sheets (export) │  │ Central Database │                      │
│  │ (backup only)   │  │ (primary data)   │                      │
│  └─────────────────┘  └─────────────────┘                       │
│           │                                                      │
│           ▼ When: Full enterprise needs                          │
│                                                                  │
│  Stage 4: Full SaaS                                             │
│  ┌─────────────────────────────────────────┐                    │
│  │ Full-stack: React/Vue + Node + Postgres │                    │
│  │ Multi-tenant with proper isolation       │                    │
│  └─────────────────────────────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 13.10 Checklist Triển Khai BYOD

```markdown
## Pre-Development
- [ ] Xác định target audience đã quen Google Workspace
- [ ] Estimate data volume per user (<10K records recommended)
- [ ] Xác định không cần cross-tenant features
- [ ] Budget = $0 là acceptable

## Development
- [ ] Design Sheet schema (column headers)
- [ ] Implement spreadsheetId parameter cho tất cả functions
- [ ] Implement validateSpreadsheetId()
- [ ] Implement initializeSheets() cho new users
- [ ] Store spreadsheetId trong localStorage
- [ ] Handle Sheet không tồn tại / bị rename

## Security
- [ ] Validate spreadsheetId format trước khi dùng
- [ ] Không log spreadsheetId
- [ ] Giải thích OAuth permissions cho user
- [ ] Implement proper error messages

## UX
- [ ] Clear setup instructions
- [ ] Video tutorial cho setup flow
- [ ] Handle reconnection khi Sheet không accessible
- [ ] "Disconnect" option trong settings

## Documentation
- [ ] Giải thích data ownership
- [ ] Hướng dẫn backup data
- [ ] Hướng dẫn share Sheet nếu cần
- [ ] FAQ về privacy & security
```

---

## 📚 Tài Liệu Tham Khảo

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [HtmlService Reference](https://developers.google.com/apps-script/reference/html)
- [SpreadsheetApp Reference](https://developers.google.com/apps-script/reference/spreadsheet)
- [CalendarApp Reference](https://developers.google.com/apps-script/reference/calendar)
- [clasp - Command Line Apps Script Projects](https://github.com/google/clasp)
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)
- [BYOD Security Best Practices](https://cloud.google.com/architecture/identity/best-practices-for-byod)

---

*Tài liệu được tạo dựa trên phân tích ứng dụng Photo Job Manager - một ví dụ thực tế về Web App trên Google Apps Script với kiến trúc Multi-Tenant BYOD.*
