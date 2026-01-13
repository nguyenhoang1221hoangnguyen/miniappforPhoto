/**
 * CustomerService.gs - CRUD operations for Customers
 */

/**
 * Lấy tất cả customers (không bao gồm đã xóa) - có cache
 */
function getAllCustomers(spreadsheetId) {
  // Thử lấy từ cache trước (TTL: 5 phút)
  const cached = getServerCache('customers', spreadsheetId);
  if (cached) {
    return cached;
  }
  
  const customers = getAllCustomersFromSheet(spreadsheetId);
  
  // Lưu vào cache (5 phút)
  setServerCache('customers', customers, spreadsheetId, 5 * 60);
  
  return customers;
}

/**
 * Lấy customers trực tiếp từ sheet (không qua cache)
 */
function getAllCustomersFromSheet(spreadsheetId) {
  const sheet = getSheet(SHEET_NAMES.CUSTOMERS, spreadsheetId);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  
  return data
    .filter(row => row[9] !== true && row[9] !== 'TRUE' && row[9] !== 1)
    .map(row => ({
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      phone: String(row[2] || ''),
      email: String(row[3] || ''),
      address: String(row[4] || ''),
      totalJobs: row[5] || 0,
      totalSpent: row[6] || 0,
      notes: String(row[7] || ''),
      createdAt: safeFormatDate(row[8], 'yyyy-MM-dd')
    }));
}

/**
 * Tìm kiếm customers cho autocomplete
 */
function searchCustomers(query, spreadsheetId) {
  const customers = getAllCustomers(spreadsheetId);
  
  if (!query) return customers.slice(0, 20);
  
  const lowerQuery = String(query).toLowerCase();
  return customers
    .filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      c.phone.includes(String(query)) ||
      c.email.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10);
}

/**
 * Lấy customer theo ID
 */
function getCustomerById(customerId, spreadsheetId) {
  const customers = getAllCustomers(spreadsheetId);
  return customers.find(c => c.id === customerId) || null;
}

/**
 * Thêm customer mới
 */
function addCustomer(customerData, spreadsheetId) {
  return safeExecute(function() {
    // Validation
    if (!Validators.isRequired(customerData.name)) {
      return { success: false, message: 'Vui lòng nhập tên khách hàng!' };
    }
    if (!Validators.isValidEmail(customerData.email)) {
      return { success: false, message: 'Email không hợp lệ!' };
    }
    if (!Validators.isValidPhone(customerData.phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (9-10 số)!' };
    }
    
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.CUSTOMERS, spreadsheetId);
      const customerId = generateId('KH', sheet);
      
      const now = new Date();
      const rowData = [
        customerId,
        customerData.name || '',
        formatPhoneForSheet(customerData.phone),
        customerData.email || '',
        customerData.address || '',
        0, // totalJobs
        0, // totalSpent
        customerData.notes || '',
        now,
        false // Đã xóa
      ];
      
      sheet.appendRow(rowData);
      
      // Invalidate cache
      invalidateServerCache('customers', spreadsheetId);
      
      return { 
        success: true, 
        customerId: customerId, 
        customer: {
          id: customerId,
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address
        },
        message: 'Thêm khách hàng thành công!' 
      };
    });
  }, 'Lỗi thêm khách hàng');
}

/**
 * Cập nhật customer
 */
function updateCustomer(customerId, customerData, spreadsheetId) {
  return safeExecute(function() {
    // Validation
    if (!Validators.isRequired(customerData.name)) {
      return { success: false, message: 'Vui lòng nhập tên khách hàng!' };
    }
    if (!Validators.isValidEmail(customerData.email)) {
      return { success: false, message: 'Email không hợp lệ!' };
    }
    if (!Validators.isValidPhone(customerData.phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (9-10 số)!' };
    }
    
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.CUSTOMERS, spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === customerId) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) {
        return { success: false, message: 'Không tìm thấy khách hàng!' };
      }
      
      const rowData = [
        customerId,
        customerData.name || '',
        formatPhoneForSheet(customerData.phone),
        customerData.email || '',
        customerData.address || '',
        data[rowIndex - 1][5], // Giữ totalJobs
        data[rowIndex - 1][6], // Giữ totalSpent
        customerData.notes || '',
        data[rowIndex - 1][8], // Giữ ngày tạo
        data[rowIndex - 1][9]  // Giữ trạng thái xóa
      ];
      
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      
      // Invalidate cache
      invalidateServerCache('customers', spreadsheetId);
      
      return { success: true, message: 'Cập nhật khách hàng thành công!' };
    });
  }, 'Lỗi cập nhật khách hàng');
}

/**
 * Xóa customer (soft delete)
 */
function deleteCustomer(customerId, spreadsheetId) {
  return safeExecute(function() {
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.CUSTOMERS, spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === customerId) {
          sheet.getRange(i + 1, 10).setValue(true);
          
          // Invalidate cache
          invalidateServerCache('customers', spreadsheetId);
          
          return { success: true, message: 'Đã xóa khách hàng!' };
        }
      }
      
      return { success: false, message: 'Không tìm thấy khách hàng!' };
    });
  }, 'Lỗi xóa khách hàng');
}

/**
 * Cập nhật thống kê customer
 */
function updateCustomerStats(customerId, spreadsheetId) {
  try {
    const sheet = getSheet(SHEET_NAMES.CUSTOMERS, spreadsheetId);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === customerId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return;
    
    const jobs = getAllJobs(spreadsheetId).filter(job => job.customerId === customerId);
    const totalJobs = jobs.length;
    const totalSpent = jobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
    
    sheet.getRange(rowIndex, 6).setValue(totalJobs);
    sheet.getRange(rowIndex, 7).setValue(totalSpent);
  } catch (e) {
    console.error('Error updating customer stats:', e);
  }
}

/**
 * Lấy lịch sử job của customer
 */
function getCustomerJobs(customerId, spreadsheetId) {
  const jobs = getAllJobs(spreadsheetId);
  return jobs.filter(job => job.customerId === customerId);
}
