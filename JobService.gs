/**
 * JobService.gs - CRUD operations for Jobs
 */

/**
 * Lấy tất cả jobs (không bao gồm đã xóa) - có cache
 */
function getAllJobs(spreadsheetId) {
  // Thử lấy từ cache trước (TTL: 5 phút cho jobs)
  const cached = getServerCache('jobs', spreadsheetId);
  if (cached) {
    return cached;
  }
  
  const jobs = getAllJobsFromSheet(spreadsheetId);
  
  // Lưu vào cache (5 phút)
  setServerCache('jobs', jobs, spreadsheetId, 5 * 60);
  
  return jobs;
}

/**
 * Lấy jobs trực tiếp từ sheet (không qua cache)
 */
function getAllJobsFromSheet(spreadsheetId) {
  const sheet = getSheet(SHEET_NAMES.JOBS, spreadsheetId);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 21).getValues();
  
  return data
    .filter(row => row[20] !== true && row[20] !== 'TRUE' && row[20] !== 1)
    .map(row => ({
      id: row[0],
      customerId: row[1],
      customerName: row[2],
      customerPhone: row[3],
      customerEmail: row[4],
      shootDate: safeFormatDate(row[5], 'yyyy-MM-dd HH:mm'),
      location: row[6],
      jobType: row[7],
      totalAmount: row[8],
      paidAmount: row[9],
      remainingAmount: row[10],
      paymentStatus: row[11],
      jobStatus: row[12],
      driveLink: row[13],
      partnerId: row[14],
      partnerName: row[15],
      partnerFee: row[16],
      notes: row[17],
      calendarEventId: row[18],
      createdAt: safeFormatDate(row[19], 'yyyy-MM-dd HH:mm')
    }))
    .sort((a, b) => {
      // Sắp xếp theo ID giảm dần (job mới nhất trước)
      const idA = parseInt(String(a.id).replace(/\D/g, '')) || 0;
      const idB = parseInt(String(b.id).replace(/\D/g, '')) || 0;
      return idB - idA;
    });
}

/**
 * Lấy job theo ID
 */
function getJobById(jobId, spreadsheetId) {
  const jobs = getAllJobs(spreadsheetId);
  return jobs.find(job => job.id === jobId) || null;
}

/**
 * Thêm job mới
 */
function addJob(jobData, spreadsheetId) {
  return safeExecute(function() {
    // Validation
    if (!Validators.isRequired(jobData.customerName)) {
      return { success: false, message: 'Vui lòng nhập tên khách hàng!' };
    }
    if (!jobData.shootDate) {
      return { success: false, message: 'Vui lòng chọn ngày chụp!' };
    }
    if (!Validators.isValidEmail(jobData.customerEmail)) {
      return { success: false, message: 'Email không hợp lệ!' };
    }
    if (!Validators.isValidPhone(jobData.customerPhone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (9-10 số)!' };
    }
    
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.JOBS, spreadsheetId);
      const jobId = generateId('JOB', sheet);
      
      const remainingAmount = (jobData.totalAmount || 0) - (jobData.paidAmount || 0);
      let paymentStatus = 'Chưa thanh toán';
      if (jobData.paidAmount >= jobData.totalAmount && jobData.totalAmount > 0) {
        paymentStatus = 'Đã thanh toán hết';
      } else if (jobData.paidAmount > 0) {
        paymentStatus = 'Đã TT một phần';
      }
      
      // Tạo Calendar event
      let calendarEventId = '';
      let calendarError = null;
      try {
        calendarEventId = createCalendarEvent(jobData);
      } catch (e) {
        console.error('Lỗi tạo calendar:', e);
        calendarError = e.message;
      }
      
      const now = new Date();
      const rowData = [
        jobId,
        jobData.customerId || '',
        jobData.customerName || '',
        formatPhoneForSheet(jobData.customerPhone),
        jobData.customerEmail || '',
        jobData.shootDate ? new Date(jobData.shootDate) : '',
        jobData.location || '',
        jobData.jobType || '',
        jobData.totalAmount || 0,
        jobData.paidAmount || 0,
        remainingAmount,
        paymentStatus,
        jobData.jobStatus || 'Chờ chụp',
        jobData.driveLink || '',
        jobData.partnerId || '',
        jobData.partnerName || '',
        jobData.partnerFee || 0,
        jobData.notes || '',
        calendarEventId,
        now,
        false // Đã xóa
      ];
      
      sheet.appendRow(rowData);
      
      // Cập nhật thống kê customer và partner
      if (jobData.customerId) {
        updateCustomerStats(jobData.customerId, spreadsheetId);
      }
      if (jobData.partnerId) {
        updatePartnerStats(jobData.partnerId, spreadsheetId);
      }
      
      // Invalidate cache
      invalidateServerCache(null, spreadsheetId);
      
      const message = calendarError 
        ? `Đã thêm job! ⚠️ Lưu ý: ${calendarError}`
        : 'Thêm job thành công! 📅 Đã tạo lịch.';
      
      return { success: true, jobId: jobId, message: message };
    });
  }, 'Lỗi thêm job');
}

/**
 * Cập nhật job
 */
function updateJob(jobId, jobData, spreadsheetId) {
  return safeExecute(function() {
    // Validation
    if (!Validators.isRequired(jobData.customerName)) {
      return { success: false, message: 'Vui lòng nhập tên khách hàng!' };
    }
    if (!jobData.shootDate) {
      return { success: false, message: 'Vui lòng chọn ngày chụp!' };
    }
    if (!Validators.isValidEmail(jobData.customerEmail)) {
      return { success: false, message: 'Email không hợp lệ!' };
    }
    if (!Validators.isValidPhone(jobData.customerPhone)) {
      return { success: false, message: 'Số điện thoại không hợp lệ (9-10 số)!' };
    }
    
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.JOBS, spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === jobId) {
          rowIndex = i + 1;
          break;
        }
      }
      
      if (rowIndex === -1) {
        return { success: false, message: 'Không tìm thấy job!' };
      }
      
      const remainingAmount = (jobData.totalAmount || 0) - (jobData.paidAmount || 0);
      let paymentStatus = 'Chưa thanh toán';
      if (jobData.paidAmount >= jobData.totalAmount && jobData.totalAmount > 0) {
        paymentStatus = 'Đã thanh toán hết';
      } else if (jobData.paidAmount > 0) {
        paymentStatus = 'Đã TT một phần';
      }
      
      // Cập nhật Calendar event
      let calendarEventId = data[rowIndex - 1][18];
      let calendarError = null;
      try {
        if (calendarEventId) {
          calendarEventId = updateCalendarEvent(calendarEventId, jobData);
        } else {
          calendarEventId = createCalendarEvent(jobData);
        }
      } catch (e) {
        console.error('Lỗi cập nhật calendar:', e);
        calendarError = e.message;
      }
      
      const rowData = [
        jobId,
        jobData.customerId || '',
        jobData.customerName || '',
        formatPhoneForSheet(jobData.customerPhone),
        jobData.customerEmail || '',
        jobData.shootDate ? new Date(jobData.shootDate) : '',
        jobData.location || '',
        jobData.jobType || '',
        jobData.totalAmount || 0,
        jobData.paidAmount || 0,
        remainingAmount,
        paymentStatus,
        jobData.jobStatus || 'Chờ chụp',
        jobData.driveLink || '',
        jobData.partnerId || '',
        jobData.partnerName || '',
        jobData.partnerFee || 0,
        jobData.notes || '',
        calendarEventId,
        data[rowIndex - 1][19], // Giữ ngày tạo
        data[rowIndex - 1][20]  // Giữ trạng thái xóa
      ];
      
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
      
      // Cập nhật thống kê
      if (jobData.customerId) {
        updateCustomerStats(jobData.customerId, spreadsheetId);
      }
      if (jobData.partnerId) {
        updatePartnerStats(jobData.partnerId, spreadsheetId);
      }
      
      // Invalidate cache
      invalidateServerCache(null, spreadsheetId);
      
      const message = calendarError 
        ? `Đã cập nhật job! ⚠️ Lưu ý: ${calendarError}`
        : 'Cập nhật job thành công!';
      
      return { success: true, message: message };
    });
  }, 'Lỗi cập nhật job');
}

/**
 * Xóa job (soft delete)
 */
function deleteJob(jobId, spreadsheetId) {
  return safeExecute(function() {
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.JOBS, spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === jobId) {
          sheet.getRange(i + 1, 21).setValue(true);
          
          // Xóa Calendar event
          const calendarEventId = data[i][18];
          if (calendarEventId) {
            try {
              deleteCalendarEvent(calendarEventId);
            } catch (e) {
              console.error('Lỗi xóa calendar:', e);
            }
          }
          
          const customerId = data[i][1];
          const partnerId = data[i][14];
          
          if (customerId) {
            updateCustomerStats(customerId, spreadsheetId);
          }
          if (partnerId) {
            updatePartnerStats(partnerId, spreadsheetId);
          }
          
          // Invalidate cache
          invalidateServerCache(null, spreadsheetId);
          
          return { success: true, message: 'Đã xóa job!' };
        }
      }
      
      return { success: false, message: 'Không tìm thấy job!' };
    });
  }, 'Lỗi xóa job');
}

/**
 * Tìm kiếm jobs
 */
function searchJobs(filters, spreadsheetId) {
  let jobs = getAllJobs(spreadsheetId);
  
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    jobs = jobs.filter(job => 
      (job.customerName || '').toLowerCase().includes(keyword) ||
      (job.location || '').toLowerCase().includes(keyword) ||
      (job.notes || '').toLowerCase().includes(keyword)
    );
  }
  
  if (filters.jobStatus) {
    jobs = jobs.filter(job => job.jobStatus === filters.jobStatus);
  }
  
  if (filters.paymentStatus) {
    jobs = jobs.filter(job => job.paymentStatus === filters.paymentStatus);
  }
  
  if (filters.jobType) {
    jobs = jobs.filter(job => job.jobType === filters.jobType);
  }
  
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    jobs = jobs.filter(job => job.shootDate && new Date(job.shootDate) >= from);
  }
  
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    jobs = jobs.filter(job => job.shootDate && new Date(job.shootDate) <= to);
  }
  
  return jobs;
}

/**
 * Lấy gợi ý địa điểm
 */
function getLocationSuggestions(query, spreadsheetId) {
  const sheet = getSheet(SHEET_NAMES.JOBS, spreadsheetId);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const locations = sheet.getRange(2, 7, lastRow - 1, 1).getValues()
    .flat()
    .filter(loc => loc && loc.toString().toLowerCase().includes(query.toLowerCase()));
  
  return [...new Set(locations)].slice(0, 10);
}
