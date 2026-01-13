/**
 * ReportService.gs - Báo cáo đa chiều
 */

/**
 * Lấy báo cáo tổng quan
 */
function getDashboardStats(spreadsheetId) {
  const jobs = getAllJobs(spreadsheetId);
  const now = new Date();
  
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
  
  const upcomingJobs = jobs.filter(job => {
    if (!job.shootDate) return false;
    const shootDate = new Date(job.shootDate);
    const diffDays = (shootDate - now) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });
  
  return {
    totalJobs,
    totalRevenue,
    totalPaid,
    totalDebt,
    jobsByStatus,
    upcomingJobs: upcomingJobs.length,
    totalCustomers: getAllCustomers(spreadsheetId).length,
    totalPartners: getAllPartners(spreadsheetId).length
  };
}

/**
 * Báo cáo doanh thu theo thời gian
 */
function getRevenueReport(period, spreadsheetId) {
  const jobs = getAllJobs(spreadsheetId);
  const now = new Date();
  
  let filteredJobs = [];
  let periodLabel = '';
  
  switch (period) {
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      filteredJobs = jobs.filter(job => {
        const jobDate = new Date(job.shootDate);
        return jobDate >= weekStart;
      });
      periodLabel = 'Tuần này';
      break;
      
    case 'month':
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      filteredJobs = jobs.filter(job => {
        const jobDate = new Date(job.shootDate);
        return jobDate >= monthStart;
      });
      periodLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
      break;
      
    case 'all':
      filteredJobs = jobs;
      periodLabel = 'Toàn thời gian';
      break;
      
    default:
      filteredJobs = jobs;
      periodLabel = 'Toàn thời gian';
  }
  
  const totalRevenue = filteredJobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0);
  const totalPaid = filteredJobs.reduce((sum, job) => sum + (job.paidAmount || 0), 0);
  const totalDebt = totalRevenue - totalPaid;
  const totalPartnerFee = filteredJobs.reduce((sum, job) => sum + (job.partnerFee || 0), 0);
  const netProfit = totalPaid - totalPartnerFee;
  
  const byJobType = {};
  JOB_TYPES.forEach(type => {
    const typeJobs = filteredJobs.filter(j => j.jobType === type);
    byJobType[type] = {
      count: typeJobs.length,
      revenue: typeJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0)
    };
  });
  
  return {
    period: periodLabel,
    totalJobs: filteredJobs.length,
    totalRevenue,
    totalPaid,
    totalDebt,
    totalPartnerFee,
    netProfit,
    byJobType,
    jobs: filteredJobs
  };
}

/**
 * Báo cáo thanh toán
 */
function getPaymentReport(status, period, spreadsheetId) {
  const jobs = getAllJobs(spreadsheetId);
  const now = new Date();
  
  let filteredJobs = jobs;
  
  if (period === 'week') {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    filteredJobs = filteredJobs.filter(job => new Date(job.shootDate) >= weekStart);
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    filteredJobs = filteredJobs.filter(job => new Date(job.shootDate) >= monthStart);
  }
  
  if (status === 'paid') {
    filteredJobs = filteredJobs.filter(job => job.paymentStatus === 'Đã thanh toán hết');
  } else if (status === 'unpaid') {
    filteredJobs = filteredJobs.filter(job => 
      job.paymentStatus === 'Chưa thanh toán' || job.paymentStatus === 'Đã TT một phần'
    );
  } else if (status === 'partial') {
    filteredJobs = filteredJobs.filter(job => job.paymentStatus === 'Đã TT một phần');
  }
  
  const summary = {
    totalJobs: filteredJobs.length,
    totalAmount: filteredJobs.reduce((sum, job) => sum + (job.totalAmount || 0), 0),
    totalPaid: filteredJobs.reduce((sum, job) => sum + (job.paidAmount || 0), 0),
    totalDebt: filteredJobs.reduce((sum, job) => sum + (job.remainingAmount || 0), 0)
  };
  
  return {
    status,
    period,
    summary,
    jobs: filteredJobs
  };
}

/**
 * Báo cáo theo khách hàng
 */
function getCustomerReport(customerId, spreadsheetId) {
  const customers = getAllCustomers(spreadsheetId);
  const jobs = getAllJobs(spreadsheetId);
  
  if (customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return null;
    
    const customerJobs = jobs.filter(j => j.customerId === customerId);
    
    return {
      customer,
      totalJobs: customerJobs.length,
      totalSpent: customerJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0),
      totalPaid: customerJobs.reduce((sum, j) => sum + (j.paidAmount || 0), 0),
      totalDebt: customerJobs.reduce((sum, j) => sum + (j.remainingAmount || 0), 0),
      jobs: customerJobs
    };
  }
  
  const customerStats = customers.map(customer => {
    const customerJobs = jobs.filter(j => j.customerId === customer.id);
    return {
      ...customer,
      jobCount: customerJobs.length,
      totalSpent: customerJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0),
      totalDebt: customerJobs.reduce((sum, j) => sum + (j.remainingAmount || 0), 0)
    };
  });
  
  customerStats.sort((a, b) => b.totalSpent - a.totalSpent);
  
  return {
    topCustomers: customerStats.slice(0, 10),
    allCustomers: customerStats
  };
}

/**
 * Báo cáo theo partner
 */
function getPartnerReport(partnerId, spreadsheetId) {
  const partners = getAllPartners(spreadsheetId);
  const jobs = getAllJobs(spreadsheetId);
  
  if (partnerId) {
    const partner = partners.find(p => p.id === partnerId);
    if (!partner) return null;
    
    const partnerJobs = jobs.filter(j => j.partnerId === partnerId);
    
    return {
      partner,
      totalJobs: partnerJobs.length,
      totalEarnings: partnerJobs.reduce((sum, j) => sum + (j.partnerFee || 0), 0),
      jobs: partnerJobs
    };
  }
  
  const partnerStats = partners.map(partner => {
    const partnerJobs = jobs.filter(j => j.partnerId === partner.id);
    return {
      ...partner,
      jobCount: partnerJobs.length,
      totalEarnings: partnerJobs.reduce((sum, j) => sum + (j.partnerFee || 0), 0)
    };
  });
  
  partnerStats.sort((a, b) => b.totalEarnings - a.totalEarnings);
  
  return {
    allPartners: partnerStats
  };
}

/**
 * Báo cáo chi tiết theo tháng
 */
function getMonthlyReport(year, spreadsheetId) {
  const jobs = getAllJobs(spreadsheetId);
  const currentYear = year || new Date().getFullYear();
  
  const monthlyData = [];
  
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(currentYear, month, 1);
    const monthEnd = new Date(currentYear, month + 1, 0);
    
    const monthJobs = jobs.filter(job => {
      const jobDate = new Date(job.shootDate);
      return jobDate >= monthStart && jobDate <= monthEnd;
    });
    
    monthlyData.push({
      month: month + 1,
      monthName: `T${month + 1}`,
      jobCount: monthJobs.length,
      revenue: monthJobs.reduce((sum, j) => sum + (j.totalAmount || 0), 0),
      paid: monthJobs.reduce((sum, j) => sum + (j.paidAmount || 0), 0),
      partnerFee: monthJobs.reduce((sum, j) => sum + (j.partnerFee || 0), 0)
    });
  }
  
  return {
    year: currentYear,
    data: monthlyData,
    total: {
      jobs: monthlyData.reduce((sum, m) => sum + m.jobCount, 0),
      revenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0),
      paid: monthlyData.reduce((sum, m) => sum + m.paid, 0),
      partnerFee: monthlyData.reduce((sum, m) => sum + m.partnerFee, 0)
    }
  };
}
