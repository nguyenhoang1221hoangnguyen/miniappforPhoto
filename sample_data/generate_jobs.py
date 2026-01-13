import csv
import random
from datetime import datetime, timedelta

# Job types and statuses
JOB_TYPES = ['Cưới', 'Sự kiện', 'Sản phẩm', 'Cá nhân', 'Khác']
PAYMENT_STATUS = ['Chưa thanh toán', 'Đã TT một phần', 'Đã thanh toán hết']
JOB_STATUS = ['Chờ chụp', 'Đang làm', 'Hoàn thành', 'Đã hủy']

# Locations in HCM
LOCATIONS = [
    'Dinh Độc Lập Q1', 'Nhà thờ Đức Bà Q1', 'Bưu điện Thành phố Q1',
    'Phố đi bộ Nguyễn Huệ Q1', 'Landmark 81 Bình Thạnh', 'Thảo Cầm Viên Q1',
    'Công viên Tao Đàn Q1', 'Chợ Bến Thành Q1', 'Bitexco Financial Tower Q1',
    'Lotte Cinema Q7', 'SC VivoCity Q7', 'Crescent Mall Q7',
    'Phú Mỹ Hưng Q7', 'Estella Heights Q2', 'Thảo Điền Q2',
    'Đảo Kim Cương Q2', 'GEM Center Q1', 'White Palace Phú Nhuận',
    'Riverside Palace Q4', 'The Adora Q10', 'Sheraton Hotel Q1',
    'Rex Hotel Q1', 'Majestic Hotel Q1', 'Park Hyatt Q1',
    'InterContinental Q1', 'Sofitel Plaza Q1', 'Renaissance Q10',
    'Caravelle Hotel Q1', 'Studio ABC Q3', 'Studio XYZ Phú Nhuận',
    'Studio Pro Gò Vấp', 'Outdoor Củ Chi', 'Outdoor Cần Giờ',
    'Đà Lạt', 'Nha Trang', 'Vũng Tàu', 'Phú Quốc', 'Hội An',
    'Sài Gòn Pearl Bình Thạnh', 'Sunrise City Q7', 'The Manor Q Bình Thạnh'
]

# Generate 1000 jobs
jobs = []
base_date = datetime(2024, 1, 1)

for i in range(1, 1001):
    job_id = f"JOB-{i:03d}"
    customer_id = f"KH-{random.randint(1, 100):03d}"
    customer_num = int(customer_id.split('-')[1])
    
    # Customer names matching the customer file
    customer_names = [
        "Nguyễn Văn An", "Trần Thị Bình", "Lê Hoàng Cường", "Phạm Thị Dung", "Hoàng Văn Em",
        "Vũ Thị Phương", "Đặng Quốc Gia", "Bùi Thị Hạnh", "Ngô Văn Inh", "Đỗ Thị Kim"
    ]
    customer_name = f"Khách hàng {customer_num:03d}"
    
    # Random phone and email
    customer_phone = f"09{random.randint(10000000, 99999999)}"
    customer_email = f"customer{customer_num}@email.com"
    
    # Random date within 2024-2025
    days_offset = random.randint(0, 730)
    shoot_date = base_date + timedelta(days=days_offset)
    shoot_date_str = shoot_date.strftime("%Y-%m-%d %H:%M")
    
    location = random.choice(LOCATIONS)
    job_type = random.choice(JOB_TYPES)
    
    # Pricing based on job type
    if job_type == 'Cưới':
        total_amount = random.randint(15, 50) * 1000000
    elif job_type == 'Sự kiện':
        total_amount = random.randint(5, 20) * 1000000
    elif job_type == 'Sản phẩm':
        total_amount = random.randint(2, 10) * 1000000
    elif job_type == 'Cá nhân':
        total_amount = random.randint(1, 5) * 1000000
    else:
        total_amount = random.randint(1, 8) * 1000000
    
    # Payment status
    payment_choice = random.random()
    if payment_choice < 0.3:
        paid_amount = 0
        payment_status = 'Chưa thanh toán'
    elif payment_choice < 0.6:
        paid_amount = int(total_amount * random.uniform(0.3, 0.7))
        payment_status = 'Đã TT một phần'
    else:
        paid_amount = total_amount
        payment_status = 'Đã thanh toán hết'
    
    remaining = total_amount - paid_amount
    
    # Job status based on date
    if shoot_date > datetime.now():
        job_status = 'Chờ chụp'
    else:
        status_choice = random.random()
        if status_choice < 0.7:
            job_status = 'Hoàn thành'
        elif status_choice < 0.9:
            job_status = 'Đang làm'
        else:
            job_status = 'Đã hủy'
    
    drive_link = f"https://drive.google.com/folder/{job_id}" if random.random() > 0.3 else ""
    
    # Partner
    if random.random() > 0.4:
        partner_num = random.randint(1, 100)
        partner_id = f"PT-{partner_num:03d}"
        partner_name = f"Partner {partner_num:03d}"
        partner_fee = int(total_amount * random.uniform(0.15, 0.35))
    else:
        partner_id = ""
        partner_name = ""
        partner_fee = 0
    
    notes = random.choice([
        "", "", "", 
        "Khách yêu cầu chụp sớm",
        "Cần thêm phụ kiện",
        "Khách VIP",
        "Lưu ý địa điểm xa",
        "Cần 2 photographer",
        "Khách muốn style Hàn Quốc",
        "Chụp outdoor"
    ])
    
    calendar_event_id = ""
    created_date = (base_date + timedelta(days=random.randint(0, days_offset))).strftime("%Y-%m-%d %H:%M")
    
    jobs.append([
        job_id, customer_id, customer_name, customer_phone, customer_email,
        shoot_date_str, location, job_type, total_amount, paid_amount,
        remaining, payment_status, job_status, drive_link,
        partner_id, partner_name, partner_fee, notes,
        calendar_event_id, created_date, "FALSE"
    ])

# Write to CSV
headers = [
    'ID', 'Customer_ID', 'Tên khách hàng', 'SĐT khách', 'Email khách',
    'Ngày chụp', 'Địa điểm', 'Loại chụp', 'Giá tiền', 'Đã thanh toán',
    'Còn nợ', 'Trạng thái TT', 'Trạng thái Job', 'Link Google Drive',
    'Partner_ID', 'Tên Partner', 'Lương Partner', 'Ghi chú',
    'Calendar Event ID', 'Ngày tạo', 'Đã xóa'
]

with open('/Users/nguyenhoang/Desktop/2026/ungDung/clasp/miniappforphoto/sample_data/Jobs.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(headers)
    writer.writerows(jobs)

print(f"Generated {len(jobs)} jobs")
