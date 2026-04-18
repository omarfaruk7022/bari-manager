export const ROLES = {
  ADMIN:    'admin',
  LANDLORD: 'landlord',
  TENANT:   'tenant',
}

export const BILL_TYPES = {
  RENT:         'rent',
  ELECTRICITY:  'electricity',
  GAS:          'gas',
  WATER:        'water',
  GARBAGE:      'garbage',
  INTERNET:     'internet',
  MAINTENANCE:  'maintenance',
  CUSTOM:       'custom',
}

export const BILL_STATUS = {
  UNPAID:  'unpaid',
  PARTIAL: 'partial',
  PAID:    'paid',
}

export const PAYMENT_METHODS = {
  BKASH:        'bkash',
  CASH:         'cash',
  BANK_TRANSFER:'bank_transfer',
}

export const PAYMENT_STATUS = {
  PENDING:   'pending',
  SUCCESS:   'success',
  FAILED:    'failed',
  CANCELLED: 'cancelled',
}

export const EXPENSE_CATEGORIES = {
  UTILITIES:   'utilities',
  SALARY:      'salary',
  MAINTENANCE: 'maintenance',
  REPAIR:      'repair',
  CLEANING:    'cleaning',
  SECURITY:    'security',
  OTHER:       'other',
}

export const NOTIFICATION_TYPES = {
  BILL_READY:       'bill_ready',
  PAYMENT_DUE:      'payment_due',
  PAYMENT_RECEIVED: 'payment_received',
  NOTICE:           'notice',
  SYSTEM:           'system',
}

export const SUBSCRIPTION_STATUS = {
  PENDING:  'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}

export const SUBSCRIPTION_PLANS = {
  BASIC:      'basic',
  STANDARD:   'standard',
  PREMIUM:    'premium',
  ENTERPRISE: 'enterprise',
}

export const PLAN_CONFIG = {
  basic: {
    name: 'Basic',
    price: 499,
    smsLimit: 20,
    flatLimit: 5,
    reportMonths: 1,
    autoBill: false,
  },
  standard: {
    name: 'Standard',
    price: 999,
    smsLimit: 100,
    flatLimit: 20,
    reportMonths: 6,
    autoBill: true,
  },
  premium: {
    name: 'Premium',
    price: 1999,
    smsLimit: 300,
    flatLimit: 75,
    reportMonths: 12,
    autoBill: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 4999,
    smsLimit: 1000,
    flatLimit: 300,
    reportMonths: 36,
    autoBill: true,
  },
}
