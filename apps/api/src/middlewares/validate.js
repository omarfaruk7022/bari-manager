import Joi from 'joi'

export const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false })
  if (error) {
    const messages = error.details.map((d) => d.message)
    return res.status(422).json({ success: false, message: 'ইনপুট সঠিক নয়', errors: messages })
  }
  next()
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
})

export const subscriptionApplySchema = Joi.object({
  applicantName:   Joi.string().min(2).required(),
  email:           Joi.string().email().required(),
  phone:           Joi.string().min(10).required(),
  propertyName:    Joi.string().allow(''),
  propertyAddress: Joi.string().allow(''),
  totalUnits:      Joi.number().min(1).default(1),
})

export const tenantCreateSchema = Joi.object({
  name:         Joi.string().min(2).required(),
  phone:        Joi.string().min(10).required(),
  email:        Joi.string().email().allow(''),
  propertyId:   Joi.string().required(),
  moveInDate:   Joi.date().required(),
  monthlyRent:  Joi.number().min(0).required(),
  nidNumber:    Joi.string().allow(''),
  advanceAmount:Joi.number().min(0).default(0),
  emergencyContact: Joi.object({
    name:  Joi.string().allow(''),
    phone: Joi.string().allow(''),
  }).optional(),
  notes: Joi.string().allow(''),
})

export const billCreateSchema = Joi.object({
  tenantId:  Joi.string().required(),
  propertyId:Joi.string().required(),
  month:     Joi.string().pattern(/^\d{4}-\d{2}$/).required(),
  year:      Joi.number().required(),
  items:     Joi.array().items(Joi.object({
    type:   Joi.string().valid('rent','electricity','gas','water','garbage','internet','maintenance','custom').required(),
    label:  Joi.string().allow(''),
    amount: Joi.number().min(0).required(),
  })).min(1).required(),
  dueDate: Joi.date().optional(),
  notes:   Joi.string().allow(''),
})

export const propertyCreateSchema = Joi.object({
  unitNumber:  Joi.string().required(),
  floor:       Joi.string().allow(''),
  type:        Joi.string().valid('flat','room','shop','office').default('flat'),
  monthlyRent: Joi.number().min(0).required(),
  description: Joi.string().allow(''),
})

export const expenseCreateSchema = Joi.object({
  title:       Joi.string().required(),
  amount:      Joi.number().min(0).required(),
  category:    Joi.string().valid('utilities','salary','maintenance','repair','cleaning','security','other').default('other'),
  month:       Joi.string().pattern(/^\d{4}-\d{2}$/).allow(''),
  date:        Joi.date().optional(),
  splitMethod: Joi.string().valid('equal','manual','per_unit','none').default('none'),
  splitDetails:Joi.array().items(Joi.object({
    tenantId: Joi.string().required(),
    amount:   Joi.number().min(0).required(),
  })).optional(),
  receiptNote: Joi.string().allow(''),
})

export const cashPaymentSchema = Joi.object({
  billId:      Joi.string().required(),
  amount:      Joi.number().min(1).required(),
  receiptNote: Joi.string().allow(''),
})
