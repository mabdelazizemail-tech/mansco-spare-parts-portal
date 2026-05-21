"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

export type Locale = "en" | "ar";
export type Direction = "ltr" | "rtl";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: Direction;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  dir: "ltr",
});

const translations: Record<string, Record<Locale, string>> = {
  // ── Chrome ──
  "chrome.appName": { en: "OriginalParts Hub", ar: "مركز القطع الأصلية" },
  "chrome.poweredBy": { en: "Powered by MANSCO Egypt", ar: "بدعم من مانسكو مصر" },
  "chrome.searchPlaceholder": { en: "Search parts, orders...", ar: "بحث قطع، طلبات..." },
  "chrome.notifications": { en: "Notifications", ar: "الإشعارات" },
  "chrome.profile": { en: "Profile", ar: "الملف الشخصي" },
  "chrome.language": { en: "العربية", ar: "English" },
  "chrome.logout": { en: "Log Out", ar: "تسجيل الخروج" },

  // ── Nav Groups ──
  "nav.group.main": { en: "Main", ar: "الرئيسية" },
  "nav.group.orders": { en: "Orders & Parts", ar: "الطلبات والقطع" },
  "nav.group.finance": { en: "Finance", ar: "المالية" },
  "nav.group.admin": { en: "Administration", ar: "الإدارة" },

  // ── Nav ──
  "nav.dashboard": { en: "Dashboard", ar: "لوحة التحكم" },
  "nav.parts_catalog": { en: "Parts Catalog", ar: "كتالوج القطع" },
  "nav.orders": { en: "Orders", ar: "الطلبات" },
  "nav.invoices": { en: "Invoices", ar: "الفواتير" },
  "nav.back_orders": { en: "Back Orders", ar: "طلبات مؤجلة" },
  "nav.reports": { en: "Reports", ar: "التقارير" },
  "nav.campaigns": { en: "Campaigns", ar: "الحملات" },
  "nav.notifications": { en: "Notifications", ar: "الإشعارات" },
  "nav.profile": { en: "Profile", ar: "الملف الشخصي" },
  "nav.settings": { en: "Settings", ar: "الإعدادات" },
  "nav.logout": { en: "Log Out", ar: "تسجيل الخروج" },
  "nav.menu": { en: "Menu", ar: "القائمة" },

  // ── Admin ──
  "admin.title": { en: "Administration", ar: "الإدارة" },
  "admin.order_approvals": { en: "Order Approvals", ar: "موافقات الطلبات" },
  "admin.dealer_management": {
    en: "Dealer Management",
    ar: "إدارة الوكلاء",
  },
  "admin.reports": { en: "Reports", ar: "التقارير" },
  "admin.settings": { en: "Settings", ar: "الإعدادات" },
  "admin.dashboard": { en: "Admin Dashboard", ar: "لوحة تحكم المدير" },
  "admin.totalDealers": { en: "Total Dealers", ar: "إجمالي الوكلاء" },
  "admin.pendingApprovals": { en: "Pending Approvals", ar: "الموافقات المعلقة" },
  "admin.todaysOrders": { en: "Today's Orders", ar: "طلبات اليوم" },
  "admin.activeCampaigns": { en: "Active Campaigns", ar: "الحملات النشطة" },
  "admin.avgTarget": { en: "Avg. Target Achievement", ar: "متوسط تحقيق الهدف" },
  "admin.ordersByStatus": { en: "Orders by Status", ar: "الطلبات حسب الحالة" },
  "admin.ordersTrend": { en: "Orders Trend (30 Days)", ar: "اتجاه الطلبات (30 يوم)" },
  "admin.revenueByType": { en: "Revenue by Order Type", ar: "الإيرادات حسب نوع الطلب" },
  "admin.alerts": { en: "Alerts & Notifications", ar: "التنبيهات والإشعارات" },
  "admin.needsApproval": { en: "Orders Needing Approval", ar: "طلبات تحتاج موافقة" },
  "admin.overdueDealers": { en: "Overdue Dealers", ar: "وكلاء متأخرون" },
  "admin.lowStock": { en: "Low Stock Warnings", ar: "تحذيرات المخزون" },
  "admin.orderApproval": { en: "Order Approval Queue", ar: "قائمة موافقة الطلبات" },
  "admin.approve": { en: "Approve", ar: "موافقة" },
  "admin.reject": { en: "Reject", ar: "رفض" },
  "admin.partialApprove": { en: "Partial Approve", ar: "موافقة جزئية" },
  "admin.approveSelected": { en: "Approve Selected", ar: "موافقة المحدد" },
  "admin.rejectSelected": { en: "Reject Selected", ar: "رفض المحدد" },
  "admin.rejectionReason": { en: "Rejection Reason", ar: "سبب الرفض" },
  "admin.confirmApproval": { en: "Confirm Approval", ar: "تأكيد الموافقة" },
  "admin.orderSummary": { en: "Order Summary", ar: "ملخص الطلب" },
  "admin.selectItems": { en: "Select Items to Approve", ar: "اختر العناصر للموافقة" },
  "admin.backorderRest": { en: "Remaining items will be backordered", ar: "العناصر المتبقية ستوضع في الطلبات المتأخرة" },
  "admin.dealerManagement": { en: "Dealer Management", ar: "إدارة الوكلاء" },
  "admin.editDealer": { en: "Edit Dealer", ar: "تعديل الوكيل" },
  "admin.creditLimit": { en: "Credit Limit", ar: "حد الائتمان" },
  "admin.overdue": { en: "Overdue", ar: "متأخر" },
  "admin.target": { en: "Target %", ar: "% الهدف" },
  "admin.stockVisibility": { en: "Stock Visibility", ar: "عرض المخزون" },
  "admin.discountEligible": { en: "Discount Eligible", ar: "مؤهل للخصم" },
  "admin.inquiryReport": { en: "Inquiry Report", ar: "تقرير الاستفسارات" },
  "admin.lostSalesReport": { en: "Lost Sales Report", ar: "تقرير المبيعات المفقودة" },
  "admin.operationalDashboard": { en: "Operational Dashboard", ar: "لوحة العمليات" },
  "admin.totalLostSales": { en: "Total Lost Sales", ar: "إجمالي المبيعات المفقودة" },
  "admin.totalLostRevenue": { en: "Total Lost Revenue", ar: "إجمالي الإيرادات المفقودة" },

  // Invoices extra
  "invoices.invoiceNumber": { en: "Invoice #", ar: "رقم الفاتورة" },
  "invoices.orderId": { en: "Order ID", ar: "رقم الطلب" },
  "invoices.dueDate": { en: "Due Date", ar: "تاريخ الاستحقاق" },
  "invoices.downloadPdf": { en: "Download PDF", ar: "تحميل PDF" },
  "invoices.totalPaid": { en: "Total Paid", ar: "إجمالي المدفوع" },
  "invoices.totalPending": { en: "Total Pending", ar: "إجمالي المعلق" },
  "invoices.totalOverdue": { en: "Total Overdue", ar: "إجمالي المتأخر" },
  "invoices.paid": { en: "Paid", ar: "مدفوع" },
  "invoices.pending": { en: "Pending", ar: "معلق" },
  "invoices.overdue": { en: "Overdue", ar: "متأخر" },

  // Backorders
  "backorders.title": { en: "Back Orders", ar: "الطلبات المتأخرة" },
  "backorders.originalEta": { en: "Original ETA", ar: "الموعد الأصلي" },
  "backorders.updatedEta": { en: "Updated ETA", ar: "الموعد المحدث" },
  "backorders.awaiting": { en: "Awaiting", ar: "في الانتظار" },
  "backorders.inTransit": { en: "In Transit", ar: "في الطريق" },
  "backorders.fulfilled": { en: "Fulfilled", ar: "تم التنفيذ" },
  "backorders.groupByOrder": { en: "Group by Order", ar: "تجميع حسب الطلب" },
  "backorders.flatList": { en: "Flat List", ar: "قائمة مسطحة" },

  // ── Dashboard Stats ──
  "dashboard.title": { en: "Dashboard", ar: "لوحة التحكم" },
  "dashboard.welcome": { en: "Welcome back", ar: "مرحباً بعودتك" },
  "dashboard.total_orders": { en: "Total Orders", ar: "إجمالي الطلبات" },
  "dashboard.pending_orders": { en: "Pending Orders", ar: "الطلبات المعلقة" },
  "dashboard.revenue": { en: "Revenue", ar: "الإيرادات" },
  "dashboard.monthly_revenue": {
    en: "Monthly Revenue",
    ar: "الإيرادات الشهرية",
  },
  "dashboard.backorders": { en: "Backorders", ar: "الطلبات المؤجلة" },
  "dashboard.target_achievement": {
    en: "Target Achievement",
    ar: "تحقيق الهدف",
  },
  "dashboard.credit_utilization": {
    en: "Credit Utilization",
    ar: "استخدام الائتمان",
  },
  "dashboard.recent_orders": { en: "Recent Orders", ar: "الطلبات الأخيرة" },
  "dashboard.quick_actions": { en: "Quick Actions", ar: "إجراءات سريعة" },
  "dashboard.active_campaigns": {
    en: "Active Campaigns",
    ar: "الحملات النشطة",
  },
  "dashboard.vs_last_month": {
    en: "vs last month",
    ar: "مقارنة بالشهر الماضي",
  },
  "dashboard.financial_summary": {
    en: "Financial Summary",
    ar: "الملخص المالي",
  },
  "dashboard.credit_limit": { en: "Credit Limit", ar: "حد الائتمان" },
  "dashboard.credit_used": { en: "Credit Used", ar: "الائتمان المستخدم" },
  "dashboard.available_credit": {
    en: "Available Credit",
    ar: "الائتمان المتاح",
  },
  "dashboard.overdue_balance": { en: "Overdue Balance", ar: "الرصيد المتأخر" },
  "dashboard.financial_status": {
    en: "Financial Status",
    ar: "الحالة المالية",
  },
  "dashboard.view_details": { en: "View Details", ar: "عرض التفاصيل" },
  "dashboard.target_progress": { en: "Target Progress", ar: "تقدم الهدف" },
  "dashboard.current_month": { en: "Current Month", ar: "الشهر الحالي" },
  "dashboard.ytd_achievement": { en: "YTD Achievement", ar: "إنجاز السنة" },
  "dashboard.by_order_type": { en: "By Order Type", ar: "حسب نوع الطلب" },
  "dashboard.daily": { en: "Daily", ar: "يومي" },
  "dashboard.air_dhl": { en: "Air-DHL", ar: "شحن جوي" },
  "dashboard.stock": { en: "Stock", ar: "مخزون" },
  "dashboard.order_id": { en: "Order ID", ar: "رقم الطلب" },
  "dashboard.date": { en: "Date", ar: "التاريخ" },
  "dashboard.type": { en: "Type", ar: "النوع" },
  "dashboard.items": { en: "Items", ar: "العناصر" },
  "dashboard.amount": { en: "Amount", ar: "المبلغ" },
  "dashboard.status": { en: "Status", ar: "الحالة" },
  "dashboard.view_all_orders": {
    en: "View All Orders",
    ar: "عرض كل الطلبات",
  },
  "dashboard.search_parts": { en: "Search Parts", ar: "بحث القطع" },
  "dashboard.new_order": { en: "New Order", ar: "طلب جديد" },
  "dashboard.track_order": { en: "Track Order", ar: "تتبع الطلب" },
  "dashboard.view_invoices": { en: "View Invoices", ar: "عرض الفواتير" },
  "dashboard.back_orders_action": {
    en: "Back Orders",
    ar: "الطلبات المتأخرة",
  },
  "dashboard.contact_support": { en: "Contact Support", ar: "اتصل بالدعم" },
  "dashboard.valid_until": { en: "Valid until", ar: "صالح حتى" },
  "dashboard.discount": { en: "discount", ar: "خصم" },

  // ── Parts Catalog ──
  "parts.title": { en: "Parts Catalog", ar: "كتالوج القطع" },
  "parts.search": {
    en: "Search parts by number or name...",
    ar: "ابحث عن القطع بالرقم أو الاسم...",
  },
  "parts.filter_category": { en: "Filter by Category", ar: "تصفية حسب الفئة" },
  "parts.filter_model": { en: "Filter by Model", ar: "تصفية حسب الموديل" },
  "parts.filter_availability": { en: "Availability", ar: "التوفر" },
  "parts.part_number": { en: "Part Number", ar: "رقم القطعة" },
  "parts.name": { en: "Name", ar: "الاسم" },
  "parts.category": { en: "Category", ar: "الفئة" },
  "parts.model": { en: "Model", ar: "الموديل" },
  "parts.price": { en: "Price", ar: "السعر" },
  "parts.stock": { en: "Stock", ar: "المخزون" },
  "parts.add_to_cart": { en: "Add to Cart", ar: "أضف إلى السلة" },
  "parts.available": { en: "Available", ar: "متوفر" },
  "parts.partial": { en: "Partial Stock", ar: "متوفر جزئياً" },
  "parts.unavailable_eta": {
    en: "Unavailable (ETA)",
    ar: "غير متوفر (موعد متوقع)",
  },
  "parts.unavailable": { en: "Unavailable", ar: "غير متوفر" },
  "parts.eta": { en: "ETA", ar: "الموعد المتوقع" },
  "parts.qty": { en: "Qty", ar: "الكمية" },
  "parts.all_categories": { en: "All Categories", ar: "جميع الفئات" },
  "parts.all_models": { en: "All Models", ar: "جميع الموديلات" },

  // ── Orders ──
  "orders.title": { en: "Orders", ar: "الطلبات" },
  "orders.new_order": { en: "New Order", ar: "طلب جديد" },
  "orders.order_id": { en: "Order ID", ar: "رقم الطلب" },
  "orders.date": { en: "Date", ar: "التاريخ" },
  "orders.type": { en: "Type", ar: "النوع" },
  "orders.status": { en: "Status", ar: "الحالة" },
  "orders.total": { en: "Total", ar: "الإجمالي" },
  "orders.actions": { en: "Actions", ar: "الإجراءات" },
  "orders.view": { en: "View", ar: "عرض" },
  "orders.track": { en: "Track", ar: "تتبع" },
  "orders.reorder": { en: "Reorder", ar: "إعادة الطلب" },
  "orders.daily": { en: "Daily Order", ar: "طلب يومي" },
  "orders.air_dhl": { en: "Air / DHL", ar: "جوي / DHL" },
  "orders.stock": { en: "Stock Order", ar: "طلب مخزون" },
  "orders.invoice_number": { en: "Invoice #", ar: "رقم الفاتورة" },
  "orders.tracking_number": { en: "Tracking #", ar: "رقم التتبع" },
  "orders.all": { en: "All", ar: "الكل" },
  "orders.items_count": { en: "Items", ar: "العناصر" },
  "orders.amount": { en: "Amount", ar: "المبلغ" },
  "orders.no_orders": { en: "No orders found.", ar: "لم يتم العثور على طلبات." },

  // ── New Order ──
  "newOrder.title": { en: "Create New Order", ar: "إنشاء طلب جديد" },
  "newOrder.selectType": { en: "Select Order Type", ar: "اختر نوع الطلب" },
  "newOrder.addParts": { en: "Add Parts", ar: "إضافة قطع" },
  "newOrder.reviewOrder": { en: "Review Order", ar: "مراجعة الطلب" },
  "newOrder.submitOrder": { en: "Submit Order", ar: "تقديم الطلب" },
  "newOrder.dailyTitle": { en: "Daily Order", ar: "طلب يومي" },
  "newOrder.dailyDesc": { en: "Regular delivery, 3-5 business days", ar: "توصيل عادي، 3-5 أيام عمل" },
  "newOrder.airDhlTitle": { en: "Air / DHL", ar: "جوي / DHL" },
  "newOrder.airDhlDesc": { en: "Express delivery, 1-2 business days", ar: "توصيل سريع، 1-2 أيام عمل" },
  "newOrder.stockTitle": { en: "Stock Order", ar: "طلب مخزون" },
  "newOrder.stockDesc": { en: "Bulk stock order, 7-14 business days", ar: "طلب مخزون بالجملة، 7-14 أيام عمل" },
  "newOrder.searchParts": { en: "Search parts to add...", ar: "بحث عن قطع لإضافتها..." },
  "newOrder.cart": { en: "Order Cart", ar: "سلة الطلب" },
  "newOrder.emptyCart": { en: "Your cart is empty", ar: "السلة فارغة" },
  "newOrder.subtotal": { en: "Subtotal", ar: "المجموع الفرعي" },
  "newOrder.total": { en: "Total", ar: "الإجمالي" },
  "newOrder.placeOrder": { en: "Place Order", ar: "تأكيد الطلب" },
  "newOrder.continue": { en: "Continue", ar: "متابعة" },
  "newOrder.back": { en: "Back", ar: "رجوع" },
  "newOrder.confirmTitle": { en: "Confirm Order", ar: "تأكيد الطلب" },
  "newOrder.confirmMessage": { en: "Are you sure you want to submit this order?", ar: "هل أنت متأكد من تقديم هذا الطلب؟" },
  "newOrder.orderPlaced": { en: "Order placed successfully!", ar: "تم تقديم الطلب بنجاح!" },
  "newOrder.estimatedDelivery": { en: "Estimated Delivery", ar: "التوصيل المتوقع" },
  "newOrder.remove": { en: "Remove", ar: "حذف" },
  "newOrder.step": { en: "Step", ar: "خطوة" },

  // ── Order Detail ──
  "orderDetail.title": { en: "Order Details", ar: "تفاصيل الطلب" },
  "orderDetail.timeline": { en: "Order Timeline", ar: "مسار الطلب" },
  "orderDetail.itemsTable": { en: "Order Items", ar: "عناصر الطلب" },
  "orderDetail.partNumber": { en: "Part Number", ar: "رقم القطعة" },
  "orderDetail.partName": { en: "Part Name", ar: "اسم القطعة" },
  "orderDetail.quantity": { en: "Quantity", ar: "الكمية" },
  "orderDetail.unitPrice": { en: "Unit Price", ar: "سعر الوحدة" },
  "orderDetail.totalPrice": { en: "Total", ar: "الإجمالي" },
  "orderDetail.invoice": { en: "Invoice", ar: "الفاتورة" },
  "orderDetail.tracking": { en: "Tracking Information", ar: "معلومات التتبع" },
  "orderDetail.carrier": { en: "Carrier", ar: "شركة الشحن" },
  "orderDetail.awb": { en: "AWB", ar: "رقم بوليصة الشحن" },
  "orderDetail.trackingNumber": { en: "Tracking Number", ar: "رقم التتبع" },
  "orderDetail.backorderItems": { en: "Backordered Items", ar: "العناصر المتأخرة" },
  "orderDetail.updatedEta": { en: "Updated ETA", ar: "موعد الوصول المحدث" },
  "orderDetail.backToOrders": { en: "Back to Orders", ar: "العودة للطلبات" },

  // ── Parts Extra ──
  "parts.campaignItems": { en: "Campaign Items", ar: "عروض الحملات" },
  "parts.gridView": { en: "Grid View", ar: "عرض شبكي" },
  "parts.listView": { en: "List View", ar: "عرض قائمة" },
  "parts.addToOrder": { en: "Add to Order", ar: "إضافة للطلب" },
  "parts.availableNow": { en: "Available Now", ar: "متوفر الآن" },
  "parts.partiallyAvailable": { en: "Partially Available", ar: "متوفر جزئياً" },
  "parts.outOfStock": { en: "Out of Stock", ar: "نفذ من المخزون" },
  "parts.inStock": { en: "in stock", ar: "في المخزون" },
  "parts.advancedFilters": { en: "Advanced Filters", ar: "فلاتر متقدمة" },
  "parts.clearFilters": { en: "Clear Filters", ar: "مسح الفلاتر" },
  "parts.noResults": { en: "No parts found matching your search.", ar: "لم يتم العثور على قطع مطابقة لبحثك." },
  "parts.results": { en: "results", ar: "نتيجة" },
  "parts.allAvailability": { en: "All", ar: "الكل" },

  // ── Order Statuses ──
  "status.submitted": { en: "Submitted", ar: "مُقدّم" },
  "status.under_review": { en: "Under Review", ar: "قيد المراجعة" },
  "status.approved": { en: "Approved", ar: "موافق عليه" },
  "status.rejected": { en: "Rejected", ar: "مرفوض" },
  "status.done": { en: "Done", ar: "مكتمل" },
  "status.partial": { en: "Partial", ar: "جزئي" },
  "status.backordered": { en: "Backordered", ar: "مؤجل" },
  "status.invoiced": { en: "Invoiced", ar: "تم الفوترة" },
  "status.shipped": { en: "Shipped", ar: "تم الشحن" },
  "status.delivered": { en: "Delivered", ar: "تم التسليم" },
  "status.processing": { en: "Processing", ar: "قيد المعالجة" },
  "status.active": { en: "Active", ar: "نشط" },
  "status.blocked": { en: "Blocked", ar: "محظور" },
  "status.warning": { en: "Warning", ar: "تحذير" },

  // ── Login ──
  "login.title": {
    en: "MANSCO Spare Parts Portal",
    ar: "بوابة مانسكو لقطع الغيار",
  },
  "login.subtitle": { en: "OriginalParts Hub", ar: "مركز القطع الأصلية" },
  "login.welcome": { en: "Welcome Back", ar: "مرحباً بعودتك" },
  "login.description": {
    en: "Sign in to access your dealer portal",
    ar: "سجّل الدخول للوصول إلى بوابة الوكيل",
  },
  "login.email": { en: "Email Address", ar: "البريد الإلكتروني" },
  "login.email_placeholder": { en: "dealer@mansco.com", ar: "dealer@mansco.com" },
  "login.password": { en: "Password", ar: "كلمة المرور" },
  "login.password_placeholder": {
    en: "Enter your password",
    ar: "أدخل كلمة المرور",
  },
  "login.sign_in": { en: "Sign In", ar: "تسجيل الدخول" },
  "login.forgot_password": { en: "Forgot Password?", ar: "نسيت كلمة المرور؟" },
  "login.hero_tagline": {
    en: "Your Trusted Source for Genuine Peugeot Parts",
    ar: "مصدرك الموثوق لقطع غيار بيجو الأصلية",
  },
  "login.hero_description": {
    en: "Access the complete catalog, place orders, and track deliveries all in one place.",
    ar: "الوصول إلى الكتالوج الكامل، تقديم الطلبات، وتتبع التسليمات في مكان واحد.",
  },

  // ── Invoices ──
  "invoices.title": { en: "Invoices", ar: "الفواتير" },
  "invoices.number": { en: "Invoice Number", ar: "رقم الفاتورة" },
  "invoices.amount": { en: "Amount", ar: "المبلغ" },
  "invoices.due_date": { en: "Due Date", ar: "تاريخ الاستحقاق" },
  "invoices.download": { en: "Download", ar: "تحميل" },

  // ── Campaigns ──
  "campaigns.title": {
    en: "Campaigns & Promotions",
    ar: "الحملات والعروض",
  },
  "campaigns.valid_until": { en: "Valid Until", ar: "صالح حتى" },
  "campaigns.discount": { en: "Discount", ar: "الخصم" },
  "campaigns.shop_now": { en: "Shop Now", ar: "تسوق الآن" },

  // ── Inquiries & Lost Sales ──
  "inquiries.title": { en: "Inquiries", ar: "الاستفسارات" },
  "inquiries.submit": { en: "Submit Inquiry", ar: "إرسال استفسار" },
  "lost_sales.title": { en: "Lost Sales", ar: "المبيعات المفقودة" },
  "lost_sales.report": {
    en: "Report Lost Sale",
    ar: "الإبلاغ عن بيع مفقود",
  },

  // ── Common ──
  "common.search": { en: "Search", ar: "بحث" },
  "common.filter": { en: "Filter", ar: "تصفية" },
  "common.export": { en: "Export", ar: "تصدير" },
  "common.cancel": { en: "Cancel", ar: "إلغاء" },
  "common.confirm": { en: "Confirm", ar: "تأكيد" },
  "common.save": { en: "Save", ar: "حفظ" },
  "common.delete": { en: "Delete", ar: "حذف" },
  "common.edit": { en: "Edit", ar: "تعديل" },
  "common.close": { en: "Close", ar: "إغلاق" },
  "common.loading": { en: "Loading...", ar: "جاري التحميل..." },
  "common.no_results": { en: "No results found", ar: "لا توجد نتائج" },
  "common.showing": { en: "Showing", ar: "عرض" },
  "common.of": { en: "of", ar: "من" },
  "common.items": { en: "items", ar: "عناصر" },
  "common.currency": { en: "EGP", ar: "ج.م" },
  "common.yes": { en: "Yes", ar: "نعم" },
  "common.no": { en: "No", ar: "لا" },
  "common.all": { en: "All", ar: "الكل" },
  "common.view_all": { en: "View All", ar: "عرض الكل" },
  "common.back": { en: "Back", ar: "رجوع" },
  "common.next": { en: "Next", ar: "التالي" },
  "common.previous": { en: "Previous", ar: "السابق" },

  // ── Sidebar ──
  "sidebar.collapse": { en: "Collapse Sidebar", ar: "طي الشريط الجانبي" },
  "sidebar.expand": { en: "Expand Sidebar", ar: "توسيع الشريط الجانبي" },

  // ── Login extra keys ──
  "login.hero_title_1": { en: "Genuine Peugeot", ar: "قطع غيار بيجو" },
  "login.hero_title_2": { en: "Parts. Delivered.", ar: "الأصلية. تُسلَّم." },
  "login.hero_subtitle": {
    en: "Access the authorized MANSCO dealer network. Order, track, and manage Peugeot spare parts with full SAP integration and transparent pricing.",
    ar: "ادخل إلى شبكة وكلاء مانسكو المعتمدين. اطلب وتتبع وأدر قطع غيار بيجو الأصلية مع تكامل كامل مع نظام SAP وأسعار شفافة.",
  },
  "login.stat_parts": { en: "Spare Parts", ar: "قطعة غيار" },
  "login.stat_dealers": { en: "Active Dealers", ar: "وكيل نشط" },
  "login.stat_support": { en: "Support", ar: "دعم" },
  "login.forgot": { en: "Forgot?", ar: "نسيت؟" },
  "login.signin": { en: "Sign In", ar: "تسجيل الدخول" },
  "login.or": { en: "Or continue with", ar: "أو تابع باستخدام" },
  "login.sso": { en: "MANSCO SSO", ar: "تسجيل دخول موحد" },
  "login.need_access": { en: "Need dealer access?", ar: "تحتاج صلاحية وكيل؟" },
  "login.contact_admin": { en: "Contact your admin", ar: "تواصل مع المسؤول" },

  // ── Branding ──
  "brand.name": { en: "OriginalParts Hub", ar: "مركز القطع الأصلية" },
  "brand.powered_by": {
    en: "Powered by MANSCO Egypt",
    ar: "بدعم من مانسكو مصر",
  },
};

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const dir: Direction = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);

  const value = useMemo(
    () => ({ locale, setLocale, dir }),
    [locale, dir]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useTranslation() {
  const { locale } = useLocale();

  const t = useCallback(
    (key: string): string => {
      return translations[key]?.[locale] ?? key;
    },
    [locale]
  );

  return { t, locale };
}

export function useToggleLocale() {
  const { locale, setLocale } = useLocale();
  return () => setLocale(locale === "en" ? "ar" : "en");
}
