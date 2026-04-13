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
