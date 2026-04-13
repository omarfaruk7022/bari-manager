export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message)

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message)
    return res.status(422).json({ success: false, message: 'ভ্যালিডেশন ত্রুটি', errors: messages })
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({ success: false, message: `${field} ইতোমধ্যে ব্যবহৃত হয়েছে` })
  }

  if (err.name === 'CastError')
    return res.status(400).json({ success: false, message: 'অবৈধ ID ফরম্যাট' })

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'সার্ভার ত্রুটি হয়েছে',
  })
}

export class AppError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
  }
}
