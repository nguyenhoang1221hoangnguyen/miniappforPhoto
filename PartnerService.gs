/**
 * PartnerService.gs - CRUD operations for Partners
 */

/**
 * Lấy tất cả partners (không bao gồm đã xóa) - có cache
 */
function getAllPartners(spreadsheetId) {
  // Thử lấy từ cache trước (TTL: 5 phút)
  const cached = getServerCache('partners', spreadsheetId);
  if (cached) {
    return cached;
  }
  
  const partners = getAllPartnersFromSheet(spreadsheetId);
  
  // Lưu vào cache (5 phút)
  setServerCache('partners', partners, spreadsheetId, 5 * 60);
  
  return partners;
}

/**
 * Lấy partners trực tiếp từ sheet (không qua cache)
 */
function getAllPartnersFromSheet(spreadsheetId) {
  const sheet = getSheet(SHEET_NAMES.PARTNERS, spreadsheetId);
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
      specialty: String(row[4] || ''),
      totalJobs: row[5] || 0,
      totalEarnings: row[6] || 0,
      notes: String(row[7] || ''),
      createdAt: safeFormatDate(row[8], 'yyyy-MM-dd')
    }));
}

/**
 * Tìm kiếm partners cho autocomplete
 */
function searchPartners(query, spreadsheetId) {
  const partners = getAllPartners(spreadsheetId);
  
  if (!query) return partners.slice(0, 20);
  
  const lowerQuery = String(query).toLowerCase();
  return partners
    .filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      p.phone.includes(String(query)) ||
      p.specialty.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 10);
}

/**
 * Lấy partner theo ID
 */
function getPartnerById(partnerId, spreadsheetId) {
  const partners = getAllPartners(spreadsheetId);
  return partners.find(p => p.id === partnerId) || null;
}

/**
 * Thêm partner mới
 */
function addPartner(partnerData, spreadsheetId) {
  return safeExecute(function() {
    // Validation
    if (!Validators.isRequired(partnerData.name)) {
      return { success: false, message: 'Vui lòng nhập tên partner!' };
    }
    if (!Validators.isValidEmail(partnerData.email)) {
      return { success: false, message: 'Email không hợp lệ!' };
    }
    if (!Validators.isValidPhone(partnerData.phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (9-10 số)!' };
    }
    
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.PARTNERS, spreadsheetId);
      const partnerId = generateId('PT', sheet);
      
      const now = new Date();
      const rowData = [
        partnerId,
        partnerData.name || '',
        formatPhoneForSheet(partnerData.phone),
        partnerData.email || '',
        partnerData.specialty || '',
        0, // totalJobs
        0, // totalEarnings
        partnerData.notes || '',
        now,
        false // Đã xóa
      ];
      
      sheet.appendRow(rowData);
      
      // Invalidate cache
      invalidateServerCache('partners', spreadsheetId);
      
      return { 
        success: true, 
        partnerId: partnerId, 
        partner: {
          id: partnerId,
          name: partnerData.name,
          phone: partnerData.phone,
          email: partnerData.email,
          specialty: partnerData.specialty
        },
        message: 'Thêm partner thành công!' 
      };
    });
  }, 'Lỗi thêm partner');
}

/**
 * Cập nhật partner
 */
function updatePartner(partnerId, partnerData, spreadsheetId) {
  return safeExecute(function() {
    // Validation
    if (!Validators.isRequired(partnerData.name)) {
      return { success: false, message: 'Vui lòng nhập tên partner!' };
    }
    if (!Validators.isValidEmail(partnerData.email)) {
      return { success: false, message: 'Email không hợp lệ!' };
    }
    if (!Validators.isValidPhone(partnerData.phone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (9-10 số)!' };
    }
    
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.PARTNERS, spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === partnerId) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) {
        return { success: false, message: 'Không tìm thấy partner!' };
      }
      
      const rowData = [
        partnerId,
        partnerData.name || '',
        formatPhoneForSheet(partnerData.phone),
        partnerData.email || '',
        partnerData.specialty || '',
        data[rowIndex - 1][5], // Giữ totalJobs
        data[rowIndex - 1][6], // Giữ totalEarnings
        partnerData.notes || '',
        data[rowIndex - 1][8], // Giữ ngày tạo
        data[rowIndex - 1][9]  // Giữ trạng thái xóa
      ];
      
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      
      // Invalidate cache
      invalidateServerCache('partners', spreadsheetId);
      
      return { success: true, message: 'Cập nhật partner thành công!' };
    });
  }, 'Lỗi cập nhật partner');
}

/**
 * Xóa partner (soft delete)
 */
function deletePartner(partnerId, spreadsheetId) {
  return safeExecute(function() {
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.PARTNERS, spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === partnerId) {
          sheet.getRange(i + 1, 10).setValue(true);
          
          // Invalidate cache
          invalidateServerCache('partners', spreadsheetId);
          
          return { success: true, message: 'Đã xóa partner!' };
        }
      }
      
      return { success: false, message: 'Không tìm thấy partner!' };
    });
  }, 'Lỗi xóa partner');
}

/**
 * Cập nhật thống kê partner
 */
function updatePartnerStats(partnerId, spreadsheetId) {
  try {
    const sheet = getSheet(SHEET_NAMES.PARTNERS, spreadsheetId);
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === partnerId) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) return;
    
    const jobs = getAllJobs(spreadsheetId).filter(job => job.partnerId === partnerId);
    const totalJobs = jobs.length;
    const totalEarnings = jobs.reduce((sum, job) => sum + (job.partnerFee || 0), 0);
    
    sheet.getRange(rowIndex, 6).setValue(totalJobs);
    sheet.getRange(rowIndex, 7).setValue(totalEarnings);
  } catch (e) {
    console.error('Error updating partner stats:', e);
  }
}

/**
 * Lấy lịch sử job của partner
 */
function getPartnerJobs(partnerId, spreadsheetId) {
  const jobs = getAllJobs(spreadsheetId);
  return jobs.filter(job => job.partnerId === partnerId);
}
