/**
 * PaymentService.gs - Quản lý lịch sử thanh toán
 * Schema: Payment_ID, Job_ID, Loại đối tượng (customer/partner), Số tiền, 
 *         Loại thanh toán, Phương thức, Ngày thanh toán, Ghi chú, Ngày tạo, Đã xóa
 */

/**
 * Lấy tất cả payments của một job
 */
function getPaymentsByJobId(jobId, spreadsheetId) {
  const sheet = getSheet(SHEET_NAMES.PAYMENTS, spreadsheetId);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  
  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  
  return data
    .filter(row => row[1] === jobId && row[9] !== true && row[9] !== 'TRUE')
    .map(row => ({
      id: row[0],
      jobId: row[1],
      paymentFor: row[2], // 'customer' or 'partner'
      amount: row[3],
      paymentType: row[4],
      paymentMethod: row[5],
      paymentDate: safeFormatDate(row[6], 'yyyy-MM-dd'),
      notes: row[7],
      createdAt: safeFormatDate(row[8], 'yyyy-MM-dd HH:mm')
    }))
    .sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));
}

/**
 * Lấy payments của khách hàng cho một job
 */
function getCustomerPayments(jobId, spreadsheetId) {
  const payments = getPaymentsByJobId(jobId, spreadsheetId);
  return payments.filter(p => p.paymentFor === 'customer');
}

/**
 * Lấy payments cho partner của một job
 */
function getPartnerPayments(jobId, spreadsheetId) {
  const payments = getPaymentsByJobId(jobId, spreadsheetId);
  return payments.filter(p => p.paymentFor === 'partner');
}

/**
 * Thêm payment mới
 */
function addPayment(paymentData, spreadsheetId) {
  return safeExecute(function() {
    // Validation
    if (!paymentData.jobId) {
      return { success: false, message: 'Job ID là bắt buộc!' };
    }
    if (!paymentData.amount || paymentData.amount <= 0) {
      return { success: false, message: 'Số tiền phải lớn hơn 0!' };
    }
    if (!paymentData.paymentFor) {
      return { success: false, message: 'Vui lòng chọn loại đối tượng!' };
    }
    
    return withLock(function() {
      let sheet = getSheet(SHEET_NAMES.PAYMENTS, spreadsheetId);
      
      // Tự động tạo sheet PaymentHistory nếu chưa có
      if (!sheet) {
        const ss = getSpreadsheet(spreadsheetId);
        sheet = ss.insertSheet(SHEET_NAMES.PAYMENTS);
        const paymentHeaders = [
          'Payment_ID', 'Job_ID', 'Loại đối tượng', 'Số tiền', 'Loại thanh toán',
          'Phương thức', 'Ngày thanh toán', 'Ghi chú', 'Ngày tạo', 'Đã xóa'
        ];
        sheet.getRange(1, 1, 1, paymentHeaders.length).setValues([paymentHeaders]);
        sheet.getRange(1, 1, 1, paymentHeaders.length)
          .setBackground('#9c27b0')
          .setFontColor('#ffffff')
          .setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
      
      const paymentId = generateId('PAY', sheet);
      
      const now = new Date();
      const paymentDate = paymentData.paymentDate ? new Date(paymentData.paymentDate) : now;
      
      const rowData = [
        paymentId,
        paymentData.jobId,
        paymentData.paymentFor, // 'customer' or 'partner'
        paymentData.amount,
        paymentData.paymentType || 'Khác',
        paymentData.paymentMethod || 'Tiền mặt',
        paymentDate,
        paymentData.notes || '',
        now,
        false // Đã xóa
      ];
      
      sheet.appendRow(rowData);
      
      // Cập nhật tổng đã thanh toán trong Jobs
      updateJobPaymentStats(paymentData.jobId, spreadsheetId);
      
      // Invalidate cache
      invalidateServerCache(null, spreadsheetId);
      
      return { 
        success: true, 
        paymentId: paymentId, 
        message: 'Ghi nhận thanh toán thành công!' 
      };
    });
  }, 'Lỗi thêm thanh toán');
}

/**
 * Xóa payment (soft delete)
 */
function deletePayment(paymentId, spreadsheetId) {
  return safeExecute(function() {
    return withLock(function() {
      const sheet = getSheet(SHEET_NAMES.PAYMENTS, spreadsheetId);
      const data = sheet.getDataRange().getValues();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === paymentId) {
          const jobId = data[i][1];
          sheet.getRange(i + 1, 10).setValue(true);
          
          // Cập nhật lại tổng thanh toán của job
          updateJobPaymentStats(jobId, spreadsheetId);
          
          // Invalidate cache
          invalidateServerCache(null, spreadsheetId);
          
          return { success: true, message: 'Đã xóa thanh toán!' };
        }
      }
      
      return { success: false, message: 'Không tìm thấy thanh toán!' };
    });
  }, 'Lỗi xóa thanh toán');
}

/**
 * Cập nhật thống kê thanh toán của job dựa trên PaymentHistory
 */
function updateJobPaymentStats(jobId, spreadsheetId) {
  const payments = getPaymentsByJobId(jobId, spreadsheetId);
  
  // Tính tổng từ khách
  const customerPaid = payments
    .filter(p => p.paymentFor === 'customer')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Tính tổng đã trả cho partner
  const partnerPaid = payments
    .filter(p => p.paymentFor === 'partner')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Cập nhật vào Jobs sheet
  const jobsSheet = getSheet(SHEET_NAMES.JOBS, spreadsheetId);
  const data = jobsSheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === jobId) {
      const totalAmount = data[i][8] || 0;
      const remainingAmount = totalAmount - customerPaid;
      
      // Xác định trạng thái thanh toán
      let paymentStatus = 'Chưa thanh toán';
      if (customerPaid >= totalAmount && totalAmount > 0) {
        paymentStatus = 'Đã thanh toán hết';
      } else if (customerPaid > 0) {
        paymentStatus = 'Đã TT một phần';
      }
      
      // Cập nhật: Đã thanh toán (col 10), Còn nợ (col 11), Trạng thái TT (col 12)
      jobsSheet.getRange(i + 1, 10).setValue(customerPaid);
      jobsSheet.getRange(i + 1, 11).setValue(remainingAmount);
      jobsSheet.getRange(i + 1, 12).setValue(paymentStatus);
      
      break;
    }
  }
  
  return { customerPaid, partnerPaid };
}

/**
 * Lấy tổng hợp thanh toán của một job
 */
function getJobPaymentSummary(jobId, spreadsheetId) {
  const job = getJobById(jobId, spreadsheetId);
  if (!job) return null;
  
  const payments = getPaymentsByJobId(jobId, spreadsheetId);
  const customerPayments = payments.filter(p => p.paymentFor === 'customer');
  const partnerPayments = payments.filter(p => p.paymentFor === 'partner');
  
  const customerPaid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const partnerPaid = partnerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  return {
    job: job,
    // Thanh toán từ khách
    customer: {
      total: job.totalAmount || 0,
      paid: customerPaid,
      remaining: (job.totalAmount || 0) - customerPaid,
      payments: customerPayments
    },
    // Thanh toán cho partner
    partner: {
      total: job.partnerFee || 0,
      paid: partnerPaid,
      remaining: (job.partnerFee || 0) - partnerPaid,
      payments: partnerPayments
    }
  };
}

/**
 * Lấy payments only (không cần load lại job từ sheet)
 * Dùng khi frontend đã có job data
 */
function getPaymentSummaryOnly(jobId, spreadsheetId) {
  const payments = getPaymentsByJobId(jobId, spreadsheetId);
  const customerPayments = payments.filter(p => p.paymentFor === 'customer');
  const partnerPayments = payments.filter(p => p.paymentFor === 'partner');
  
  const customerPaid = customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const partnerPaid = partnerPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  return {
    customer: {
      paid: customerPaid,
      payments: customerPayments
    },
    partner: {
      paid: partnerPaid,
      payments: partnerPayments
    }
  };
}

/**
 * Lấy tất cả payments của một partner (qua các jobs)
 */
function getPaymentsByPartnerId(partnerId, spreadsheetId) {
  // Lấy tất cả jobs của partner
  const jobs = getAllJobs(spreadsheetId).filter(j => j.partnerId === partnerId);
  
  let allPayments = [];
  let totalFee = 0;
  let totalPaid = 0;
  
  jobs.forEach(job => {
    const payments = getPartnerPayments(job.id, spreadsheetId);
    const jobPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    allPayments.push({
      jobId: job.id,
      customerName: job.customerName,
      shootDate: job.shootDate,
      fee: job.partnerFee || 0,
      paid: jobPaid,
      remaining: (job.partnerFee || 0) - jobPaid,
      payments: payments
    });
    
    totalFee += job.partnerFee || 0;
    totalPaid += jobPaid;
  });
  
  return {
    partnerId: partnerId,
    totalFee: totalFee,
    totalPaid: totalPaid,
    totalRemaining: totalFee - totalPaid,
    jobs: allPayments
  };
}
