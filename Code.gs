/**
 * Photo Job Management App
 * Main entry point - Menu và khởi tạo
 */

// Constants
const SHEET_NAMES = {
  JOBS: 'Jobs',
  CUSTOMERS: 'Customers',
  PARTNERS: 'Partners',
  PAYMENTS: 'PaymentHistory'
};

const JOB_TYPES = ['Cưới', 'Sự kiện', 'Sản phẩm', 'Cá nhân', 'Khác'];
const PAYMENT_STATUS = ['Chưa thanh toán', 'Đã TT một phần', 'Đã thanh toán hết'];
const JOB_STATUS = ['Chờ chụp', 'Đang làm', 'Hoàn thành', 'Đã hủy'];

// Payment types
const PAYMENT_TYPES = ['Cọc', 'Đợt 1', 'Đợt 2', 'Đợt 3', 'Hoàn tất', 'Khác'];
const PAYMENT_METHODS = ['Chuyển khoản', 'Tiền mặt', 'Ví điện tử', 'Khác'];
const PAYMENT_FOR = ['customer', 'partner']; // Thanh toán từ khách hoặc cho partner



/**
 * Web App entry point - GET request
 */
function doGet(e) {
  const html = HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('📷 Photo Job Manager')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
  return html;
}

// Script ID - để tạo link deploy
const SCRIPT_ID = '1qHdFCU1ekn4fCuZfZcuFHUIQW_dXhjcTBHlOfCAwx_8iQg4JFXuH-9ux';

// Property key để lưu Deployment ID
const DEPLOYMENT_ID_KEY = 'WEBAPP_DEPLOYMENT_ID';

/**
 * Tạo menu khi mở spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📷 Photo Jobs')
    .addItem('⚙️ Khởi tạo Sheets', 'initializeSheets')
    .addSeparator()
    .addItem('🚀 Deploy Web App', 'showDeployDialog')
    .addItem('🌐 Lấy Link Web App', 'showWebAppUrl')
    .addToUi();
}

/**
 * Hiển thị dialog hướng dẫn Deploy
 */
function showDeployDialog() {
  const deployUrl = `https://script.google.com/d/${SCRIPT_ID}/edit`;
  const manageDeploymentsUrl = `https://script.google.com/home/projects/${SCRIPT_ID}/deployments`;
  
  const savedDeploymentId = PropertiesService.getScriptProperties().getProperty(DEPLOYMENT_ID_KEY) || '';
  
  const html = HtmlService.createHtmlOutput(`
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 20px; 
            margin: 0;
            color: #1e293b;
          }
          h3 { color: #6366f1; margin-top: 0; }
          .step { 
            background: #f8fafc; 
            border-radius: 8px; 
            padding: 12px; 
            margin-bottom: 12px;
          }
          .step-num { 
            background: #6366f1; 
            color: white; 
            border-radius: 50%; 
            width: 24px; 
            height: 24px; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            margin-right: 8px;
          }
          .btn { 
            display: block;
            width: 100%;
            padding: 12px; 
            background: #6366f1; 
            color: white; 
            text-decoration: none; 
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            text-align: center;
            margin-bottom: 10px;
          }
          .btn:hover { background: #4f46e5; }
          .btn-secondary { background: #64748b; }
          .btn-secondary:hover { background: #475569; }
          .form-group { margin: 16px 0; }
          .form-group label { display: block; margin-bottom: 6px; font-weight: 500; }
          .form-group input { 
            width: 100%; 
            padding: 10px; 
            border: 2px solid #e2e8f0; 
            border-radius: 6px;
            font-size: 13px;
          }
          .form-group input:focus { outline: none; border-color: #6366f1; }
          .help { font-size: 12px; color: #64748b; margin-top: 4px; }
          .success { color: #10b981; display: none; margin-top: 8px; font-weight: 500; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 10px; font-size: 12px; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h3>🚀 Deploy Web App</h3>
        
        <div class="warning">
          ⚠️ <strong>Quan trọng:</strong> Khi deploy, chọn:<br>
          • Execute as: <strong>User accessing the web app</strong><br>
          • Who has access: <strong>Anyone</strong>
        </div>
        
        <div class="step">
          <span class="step-num">1</span>
          Click nút bên dưới để mở trang Deploy
        </div>
        
        <a href="${manageDeploymentsUrl}" target="_blank" class="btn">📦 Mở Manage Deployments</a>
        
        <div class="step">
          <span class="step-num">2</span>
          Tạo New Deployment hoặc Edit deployment hiện tại
        </div>
        
        <div class="step">
          <span class="step-num">3</span>
          Copy Deployment ID và dán vào ô bên dưới
        </div>
        
        <div class="form-group">
          <label>Deployment ID</label>
          <input type="text" id="deploymentId" value="${savedDeploymentId}" placeholder="AKfycbx...">
          <p class="help">ID bắt đầu bằng "AKfycb..." từ trang deployment</p>
        </div>
        
        <button class="btn" onclick="saveDeploymentId()">💾 Lưu Deployment ID</button>
        
        <p class="success" id="successMsg">✅ Đã lưu thành công!</p>
        
        <script>
          function saveDeploymentId() {
            const id = document.getElementById('deploymentId').value.trim();
            if (!id) {
              alert('Vui lòng nhập Deployment ID');
              return;
            }
            google.script.run
              .withSuccessHandler(function() {
                document.getElementById('successMsg').style.display = 'block';
                setTimeout(function() {
                  google.script.host.close();
                }, 1500);
              })
              .saveDeploymentId(id);
          }
        </script>
      </body>
    </html>
  `)
  .setWidth(420)
  .setHeight(520);
  
  SpreadsheetApp.getUi().showModalDialog(html, '🚀 Deploy Web App');
}

/**
 * Lưu Deployment ID
 */
function saveDeploymentId(deploymentId) {
  PropertiesService.getScriptProperties().setProperty(DEPLOYMENT_ID_KEY, deploymentId);
}

/**
 * Lấy Deployment ID đã lưu
 */
function getDeploymentId() {
  return PropertiesService.getScriptProperties().getProperty(DEPLOYMENT_ID_KEY) || '';
}

/**
 * Hiển thị URL Web App
 */
function showWebAppUrl() {
  const deploymentId = getDeploymentId();
  
  if (!deploymentId) {
    SpreadsheetApp.getUi().alert('⚠️ Chưa có Deployment ID!\n\nVui lòng vào menu "🚀 Deploy Web App" để deploy và lưu ID trước.');
    return;
  }
  
  const webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;
  
  const html = HtmlService.createHtmlOutput(`
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            padding: 24px; 
            margin: 0;
            color: #1e293b;
            text-align: center;
          }
          h2 { color: #6366f1; margin-bottom: 16px; font-size: 20px; }
          .url-box {
            background: #f1f5f9;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px;
            margin: 20px 0;
            word-break: break-all;
            font-family: monospace;
            font-size: 11px;
            text-align: left;
            color: #334155;
          }
          .btn { 
            display: block;
            width: 100%;
            padding: 14px 24px; 
            background: #10b981; 
            color: white; 
            text-decoration: none; 
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            margin-bottom: 12px;
          }
          .btn:hover { background: #059669; }
          .btn-primary { background: #6366f1; }
          .btn-primary:hover { background: #4f46e5; }
          .success { color: #10b981; font-weight: 500; margin-top: 12px; display: none; }
          .help { font-size: 12px; color: #64748b; margin-top: 16px; }
        </style>
      </head>
      <body>
        <h2>🌐 Link Web App</h2>
        
        <div class="url-box" id="urlBox">${webAppUrl}</div>
        
        <button class="btn" onclick="copyUrl()">📋 Copy Link</button>
        <a href="${webAppUrl}" target="_blank" class="btn btn-primary">🚀 Mở Web App</a>
        
        <p class="success" id="successMsg">✅ Đã copy!</p>
        
        <p class="help">Gửi link này cho người dùng để họ sử dụng app</p>
        
        <script>
          function copyUrl() {
            const url = document.getElementById('urlBox').innerText;
            navigator.clipboard.writeText(url).then(function() {
              document.getElementById('successMsg').style.display = 'block';
              setTimeout(function() {
                document.getElementById('successMsg').style.display = 'none';
              }, 2000);
            });
          }
        </script>
      </body>
    </html>
  `)
  .setWidth(400)
  .setHeight(340);
  
  SpreadsheetApp.getUi().showModalDialog(html, '🌐 Link Web App');
}

/**
 * Lấy Web App URL (cho frontend gọi)
 */
function getWebAppUrlForClient() {
  const deploymentId = getDeploymentId();
  if (!deploymentId) {
    return null;
  }
  return `https://script.google.com/macros/s/${deploymentId}/exec`;
}



/**
 * Include file HTML (for templates)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Khởi tạo các sheets nếu chưa có
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Khởi tạo sheet Jobs
  let jobsSheet = ss.getSheetByName(SHEET_NAMES.JOBS);
  if (!jobsSheet) {
    jobsSheet = ss.insertSheet(SHEET_NAMES.JOBS);
    const jobHeaders = [
      'ID', 'Customer_ID', 'Tên khách hàng', 'SĐT khách', 'Email khách',
      'Ngày chụp', 'Địa điểm', 'Loại chụp', 'Giá tiền', 'Đã thanh toán',
      'Còn nợ', 'Trạng thái TT', 'Trạng thái Job', 'Link Google Drive',
      'Partner_ID', 'Tên Partner', 'Lương Partner', 'Ghi chú',
      'Calendar Event ID', 'Ngày tạo', 'Đã xóa'
    ];
    jobsSheet.getRange(1, 1, 1, jobHeaders.length).setValues([jobHeaders]);
    jobsSheet.getRange(1, 1, 1, jobHeaders.length)
      .setBackground('#4a86e8')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    jobsSheet.setFrozenRows(1);
  }
  
  // Khởi tạo sheet Customers
  let customersSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
  if (!customersSheet) {
    customersSheet = ss.insertSheet(SHEET_NAMES.CUSTOMERS);
    const customerHeaders = [
      'Customer_ID', 'Tên', 'SĐT', 'Email', 'Địa chỉ',
      'Tổng job', 'Tổng chi tiêu', 'Ghi chú', 'Ngày tạo', 'Đã xóa'
    ];
    customersSheet.getRange(1, 1, 1, customerHeaders.length).setValues([customerHeaders]);
    customersSheet.getRange(1, 1, 1, customerHeaders.length)
      .setBackground('#6aa84f')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    customersSheet.setFrozenRows(1);
  }
  
  // Khởi tạo sheet Partners
  let partnersSheet = ss.getSheetByName(SHEET_NAMES.PARTNERS);
  if (!partnersSheet) {
    partnersSheet = ss.insertSheet(SHEET_NAMES.PARTNERS);
    const partnerHeaders = [
      'Partner_ID', 'Tên', 'SĐT', 'Email', 'Chuyên môn',
      'Tổng job', 'Tổng lương', 'Ghi chú', 'Ngày tạo', 'Đã xóa'
    ];
    partnersSheet.getRange(1, 1, 1, partnerHeaders.length).setValues([partnerHeaders]);
    partnersSheet.getRange(1, 1, 1, partnerHeaders.length)
      .setBackground('#e69138')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    partnersSheet.setFrozenRows(1);
  }
  
  // Khởi tạo sheet PaymentHistory
  let paymentsSheet = ss.getSheetByName(SHEET_NAMES.PAYMENTS);
  if (!paymentsSheet) {
    paymentsSheet = ss.insertSheet(SHEET_NAMES.PAYMENTS);
    const paymentHeaders = [
      'Payment_ID', 'Job_ID', 'Loại đối tượng', 'Số tiền', 'Loại thanh toán',
      'Phương thức', 'Ngày thanh toán', 'Ghi chú', 'Ngày tạo', 'Đã xóa'
    ];
    paymentsSheet.getRange(1, 1, 1, paymentHeaders.length).setValues([paymentHeaders]);
    paymentsSheet.getRange(1, 1, 1, paymentHeaders.length)
      .setBackground('#9900ff')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    paymentsSheet.setFrozenRows(1);
  }
  
  SpreadsheetApp.getUi().alert('Đã khởi tạo xong các sheets!');
}

/**
 * Lấy spreadsheet theo ID (cho Web App)
 */
function getSpreadsheetById(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error('Chưa cấu hình Spreadsheet ID');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

/**
 * Lấy spreadsheet - hỗ trợ cả Web App và Sidebar
 */
function getSpreadsheet(spreadsheetId) {
  if (spreadsheetId) {
    return getSpreadsheetById(spreadsheetId);
  }
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {
    // Web App mode
  }
  throw new Error('Không tìm thấy Spreadsheet');
}

/**
 * Lấy sheet theo tên
 */
function getSheet(sheetName, spreadsheetId) {
  return getSpreadsheet(spreadsheetId).getSheetByName(sheetName);
}

/**
 * Validate Spreadsheet ID - kiểm tra có thể truy cập không
 */
function validateSpreadsheetId(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheets = ss.getSheets().map(s => s.getName());
    
    // Kiểm tra có đủ các sheet cần thiết không
    const requiredSheets = [SHEET_NAMES.JOBS, SHEET_NAMES.CUSTOMERS, SHEET_NAMES.PARTNERS];
    const hasAllSheets = requiredSheets.every(name => sheets.includes(name));
    
    return {
      success: true,
      name: ss.getName(),
      hasAllSheets: hasAllSheets,
      sheets: sheets
    };
  } catch (e) {
    return {
      success: false,
      error: 'Không thể truy cập Spreadsheet. Hãy kiểm tra ID và quyền truy cập.'
    };
  }
}

/**
 * Khởi tạo sheets cho người dùng mới (gọi từ Web App)
 */
function initializeSheetsForUser(spreadsheetId) {
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    
    // Khởi tạo sheet Jobs
    let jobsSheet = ss.getSheetByName(SHEET_NAMES.JOBS);
    if (!jobsSheet) {
      jobsSheet = ss.insertSheet(SHEET_NAMES.JOBS);
      const jobHeaders = [
        'ID', 'Customer_ID', 'Tên khách hàng', 'SĐT khách', 'Email khách',
        'Ngày chụp', 'Địa điểm', 'Loại chụp', 'Giá tiền', 'Đã thanh toán',
        'Còn nợ', 'Trạng thái TT', 'Trạng thái Job', 'Link Google Drive',
        'Partner_ID', 'Tên Partner', 'Lương Partner', 'Ghi chú',
        'Calendar Event ID', 'Ngày tạo', 'Đã xóa'
      ];
      jobsSheet.getRange(1, 1, 1, jobHeaders.length).setValues([jobHeaders]);
      jobsSheet.getRange(1, 1, 1, jobHeaders.length)
        .setBackground('#4a86e8')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      jobsSheet.setFrozenRows(1);
    }
    
    // Khởi tạo sheet Customers
    let customersSheet = ss.getSheetByName(SHEET_NAMES.CUSTOMERS);
    if (!customersSheet) {
      customersSheet = ss.insertSheet(SHEET_NAMES.CUSTOMERS);
      const customerHeaders = [
        'Customer_ID', 'Tên', 'SĐT', 'Email', 'Địa chỉ',
        'Tổng job', 'Tổng chi tiêu', 'Ghi chú', 'Ngày tạo', 'Đã xóa'
      ];
      customersSheet.getRange(1, 1, 1, customerHeaders.length).setValues([customerHeaders]);
      customersSheet.getRange(1, 1, 1, customerHeaders.length)
        .setBackground('#6aa84f')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      customersSheet.setFrozenRows(1);
    }
    
    // Khởi tạo sheet Partners
    let partnersSheet = ss.getSheetByName(SHEET_NAMES.PARTNERS);
    if (!partnersSheet) {
      partnersSheet = ss.insertSheet(SHEET_NAMES.PARTNERS);
      const partnerHeaders = [
        'Partner_ID', 'Tên', 'SĐT', 'Email', 'Chuyên môn',
        'Tổng job', 'Tổng lương', 'Ghi chú', 'Ngày tạo', 'Đã xóa'
      ];
      partnersSheet.getRange(1, 1, 1, partnerHeaders.length).setValues([partnerHeaders]);
      partnersSheet.getRange(1, 1, 1, partnerHeaders.length)
        .setBackground('#e69138')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      partnersSheet.setFrozenRows(1);
    }
    
    // Khởi tạo sheet PaymentHistory
    let paymentsSheet = ss.getSheetByName(SHEET_NAMES.PAYMENTS);
    if (!paymentsSheet) {
      paymentsSheet = ss.insertSheet(SHEET_NAMES.PAYMENTS);
      const paymentHeaders = [
        'Payment_ID', 'Job_ID', 'Loại đối tượng', 'Số tiền', 'Loại thanh toán',
        'Phương thức', 'Ngày thanh toán', 'Ghi chú', 'Ngày tạo', 'Đã xóa'
      ];
      paymentsSheet.getRange(1, 1, 1, paymentHeaders.length).setValues([paymentHeaders]);
      paymentsSheet.getRange(1, 1, 1, paymentHeaders.length)
        .setBackground('#9c27b0')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      paymentsSheet.setFrozenRows(1);
    }
    
    return { success: true, message: 'Đã khởi tạo thành công!' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * LockService wrapper cho atomic operations
 */
function withLock(operation, timeoutMs) {
  const lock = LockService.getScriptLock();
  const waitMs = timeoutMs || 30000;
  
  try {
    if (!lock.tryLock(waitMs)) {
      throw new Error('Hệ thống đang bận, vui lòng thử lại sau.');
    }
    return operation();
  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

/**
 * Safe execution wrapper với error handling
 */
function safeExecute(operation, errorMessage) {
  try {
    return operation();
  } catch (e) {
    console.error(e);
    return { success: false, error: errorMessage || e.message };
  }
}

/**
 * Validation helpers
 */
const Validators = {
  isValidEmail: function(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  isValidPhone: function(phone) {
    if (!phone) return true;
    return /^[0-9]{9,10}$/.test(phone.replace(/[\s\-\.]/g, ''));
  },
  isRequired: function(value) {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }
};

/**
 * Format phone number để giữ số 0 đầu khi lưu vào Sheets
 * Thêm dấu ' phía trước để Sheets lưu dạng text
 */
function formatPhoneForSheet(phone) {
  if (!phone) return '';
  const phoneStr = String(phone).trim();
  if (!phoneStr) return '';
  // Thêm dấu ' để Google Sheets hiểu đây là text
  return "'" + phoneStr;
}

/**
 * Safe date formatting - tránh crash khi date không hợp lệ
 */
function safeFormatDate(dateValue, format) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', format || 'yyyy-MM-dd HH:mm');
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
}

/**
 * Tạo ID mới (KHÔNG có lock - caller phải wrap trong withLock)
 */
function generateId(prefix, sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return `${prefix}-001`;
  }
  const lastId = sheet.getRange(lastRow, 1).getValue();
  const num = parseInt(String(lastId).split('-')[1], 10) + 1;
  return `${prefix}-${num.toString().padStart(3, '0')}`;
}

/**
 * Lấy các constants cho frontend
 */
function getConstants() {
  return {
    jobTypes: JOB_TYPES,
    paymentStatus: PAYMENT_STATUS,
    jobStatus: JOB_STATUS,
    paymentTypes: PAYMENT_TYPES,
    paymentMethods: PAYMENT_METHODS
  };
}

// ========================================
// SERVER-SIDE CACHE - CacheService (6h TTL)
// ========================================
const CACHE_TTL_SECONDS = 6 * 60 * 60; // 6 giờ

/**
 * Lấy data từ cache
 */
function getServerCache(key, spreadsheetId) {
  try {
    const cache = CacheService.getUserCache();
    const cacheKey = `${spreadsheetId}_${key}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Cache get error:', e);
  }
  return null;
}

/**
 * Lưu data vào cache
 */
function setServerCache(key, data, spreadsheetId, ttl) {
  try {
    const cache = CacheService.getUserCache();
    const cacheKey = `${spreadsheetId}_${key}`;
    cache.put(cacheKey, JSON.stringify(data), ttl || CACHE_TTL_SECONDS);
  } catch (e) {
    console.error('Cache set error:', e);
  }
}

/**
 * Xóa cache
 */
function invalidateServerCache(key, spreadsheetId) {
  try {
    const cache = CacheService.getUserCache();
    if (key) {
      cache.remove(`${spreadsheetId}_${key}`);
    } else {
      // Xóa các cache keys phổ biến
      ['dashboard', 'jobs', 'customers', 'partners'].forEach(k => {
        cache.remove(`${spreadsheetId}_${k}`);
      });
    }
  } catch (e) {
    console.error('Cache invalidate error:', e);
  }
}

// ========================================
// BATCH API - Giảm số lần gọi server
// ========================================

/**
 * Batch API: Lấy tất cả data cho Dashboard trong 1 lần gọi
 * Bao gồm: stats + upcoming jobs
 */
function getDashboardData(spreadsheetId) {
  // Thử lấy từ cache trước (TTL ngắn hơn cho dashboard: 5 phút)
  const cached = getServerCache('dashboard', spreadsheetId);
  if (cached) {
    return cached;
  }
  
  // Nếu không có cache, tính toán mới
  const jobs = getAllJobs(spreadsheetId);
  const now = new Date();
  
  // Tính stats
  const totalJobs = jobs.length;
  const totalRevenue = jobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
  const totalPaid = jobs.reduce((sum, job) => sum + (job.paidAmount || 0), 0);
  const totalDebt = totalRevenue - totalPaid;
  
  const jobsByStatus = {
    pending: jobs.filter(j => j.jobStatus === 'Chờ chụp').length,
    inProgress: jobs.filter(j => j.jobStatus === 'Đang làm').length,
    completed: jobs.filter(j => j.jobStatus === 'Hoàn thành').length,
    cancelled: jobs.filter(j => j.jobStatus === 'Đã hủy').length
  };
  
  // Lấy upcoming jobs (trong 7 ngày tới, status "Chờ chụp")
  const upcomingJobs = jobs.filter(job => {
    if (!job.shootDate || job.jobStatus !== 'Chờ chụp') return false;
    const shootDate = new Date(job.shootDate);
    const diffDays = (shootDate - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }).sort((a, b) => new Date(a.shootDate) - new Date(b.shootDate))
    .slice(0, 5);
  
  const result = {
    stats: {
      totalJobs,
      totalRevenue,
      totalPaid,
      totalDebt,
      jobsByStatus,
      upcomingJobsCount: upcomingJobs.length
    },
    upcomingJobs: upcomingJobs
  };
  
  // Cache với TTL 5 phút cho dashboard
  setServerCache('dashboard', result, spreadsheetId, 5 * 60);
  
  return result;
}

/**
 * Batch API: Lấy tất cả jobs với cache
 */
function getAllJobsCached(spreadsheetId) {
  const cached = getServerCache('jobs', spreadsheetId);
  if (cached) {
    return cached;
  }
  
  const jobs = getAllJobs(spreadsheetId);
  setServerCache('jobs', jobs, spreadsheetId, 10 * 60); // 10 phút
  return jobs;
}

/**
 * Batch API: Lấy tất cả customers với cache
 */
function getAllCustomersCached(spreadsheetId) {
  const cached = getServerCache('customers', spreadsheetId);
  if (cached) {
    return cached;
  }
  
  const customers = getAllCustomers(spreadsheetId);
  setServerCache('customers', customers, spreadsheetId, CACHE_TTL_SECONDS);
  return customers;
}

/**
 * Batch API: Lấy tất cả partners với cache
 */
function getAllPartnersCached(spreadsheetId) {
  const cached = getServerCache('partners', spreadsheetId);
  if (cached) {
    return cached;
  }
  
  const partners = getAllPartners(spreadsheetId);
  setServerCache('partners', partners, spreadsheetId, CACHE_TTL_SECONDS);
  return partners;
}
