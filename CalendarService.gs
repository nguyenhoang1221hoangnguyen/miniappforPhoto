/**
 * CalendarService.gs - Google Calendar integration
 */

/**
 * Tạo Calendar event cho job
 */
function createCalendarEvent(jobData) {
  try {
    if (!jobData.shootDate) {
      throw new Error('Ngày chụp là bắt buộc để tạo lịch hẹn');
    }
    
    const calendar = CalendarApp.getDefaultCalendar();
    
    const shootDate = new Date(jobData.shootDate);
    
    // Validate date
    if (isNaN(shootDate.getTime())) {
      throw new Error('Ngày chụp không hợp lệ');
    }
    
    const endDate = new Date(shootDate.getTime() + 2 * 60 * 60 * 1000); // +2 giờ
    
    const title = `📷 ${jobData.jobType || 'Chụp hình'} - ${jobData.customerName}`;
    const description = buildEventDescription(jobData);
    const location = jobData.location || '';
    
    const event = calendar.createEvent(title, shootDate, endDate, {
      description: description,
      location: location
    });
    
    // Thêm nhắc nhở
    event.addPopupReminder(60); // 1 giờ trước
    event.addPopupReminder(1440); // 1 ngày trước
    
    // Mời khách nếu có email
    if (jobData.customerEmail) {
      try {
        event.addGuest(jobData.customerEmail);
      } catch (e) {
        console.error('Error adding guest:', e);
      }
    }
    
    // Mời partner nếu có email
    if (jobData.partnerEmail) {
      try {
        event.addGuest(jobData.partnerEmail);
      } catch (e) {
        console.error('Error adding partner guest:', e);
      }
    }
    
    return event.getId();
  } catch (e) {
    console.error('createCalendarEvent error:', e);
    throw e; // Re-throw để caller xử lý
  }
}

/**
 * Cập nhật Calendar event
 */
function updateCalendarEvent(eventId, jobData) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const event = calendar.getEventById(eventId);
    
    if (!event) {
      // Event không tồn tại, tạo mới
      return createCalendarEvent(jobData);
    }
    
    const shootDate = new Date(jobData.shootDate);
    const endDate = new Date(shootDate.getTime() + 2 * 60 * 60 * 1000);
    
    const title = `📷 ${jobData.jobType || 'Chụp hình'} - ${jobData.customerName}`;
    const description = buildEventDescription(jobData);
    
    event.setTitle(title);
    event.setTime(shootDate, endDate);
    event.setDescription(description);
    event.setLocation(jobData.location || '');
    
    return eventId;
  } catch (e) {
    console.error('Error updating calendar event:', e);
    return createCalendarEvent(jobData);
  }
}

/**
 * Xóa Calendar event
 */
function deleteCalendarEvent(eventId) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    const event = calendar.getEventById(eventId);
    
    if (event) {
      event.deleteEvent();
    }
  } catch (e) {
    console.error('Error deleting calendar event:', e);
  }
}

/**
 * Build mô tả cho event
 */
function buildEventDescription(jobData) {
  let desc = [];
  
  desc.push('=== THÔNG TIN JOB ===');
  desc.push(`Loại chụp: ${jobData.jobType || 'N/A'}`);
  desc.push(`Địa điểm: ${jobData.location || 'N/A'}`);
  desc.push('');
  desc.push('=== KHÁCH HÀNG ===');
  desc.push(`Tên: ${jobData.customerName || 'N/A'}`);
  desc.push(`SĐT: ${jobData.customerPhone || 'N/A'}`);
  desc.push(`Email: ${jobData.customerEmail || 'N/A'}`);
  desc.push('');
  desc.push('=== THANH TOÁN ===');
  desc.push(`Tổng tiền: ${formatCurrency(jobData.totalAmount || 0)}`);
  desc.push(`Đã thanh toán: ${formatCurrency(jobData.paidAmount || 0)}`);
  desc.push(`Còn lại: ${formatCurrency((jobData.totalAmount || 0) - (jobData.paidAmount || 0))}`);
  
  if (jobData.partnerName) {
    desc.push('');
    desc.push('=== PARTNER ===');
    desc.push(`Tên: ${jobData.partnerName}`);
    desc.push(`Lương: ${formatCurrency(jobData.partnerFee || 0)}`);
  }
  
  if (jobData.notes) {
    desc.push('');
    desc.push('=== GHI CHÚ ===');
    desc.push(jobData.notes);
  }
  
  return desc.join('\n');
}

/**
 * Format tiền tệ
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

/**
 * Lấy các sự kiện sắp tới
 */
function getUpcomingEvents(days = 7) {
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  const events = calendar.getEvents(now, endDate);
  
  return events
    .filter(event => event.getTitle().includes('📷'))
    .map(event => ({
      id: event.getId(),
      title: event.getTitle(),
      start: Utilities.formatDate(event.getStartTime(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'),
      end: Utilities.formatDate(event.getEndTime(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm'),
      location: event.getLocation()
    }));
}
