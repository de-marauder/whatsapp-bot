import Joi from 'joi'

export const attachmentsValidator = Joi.array().items({
  type: Joi.string().trim().required(),
  url: Joi.string().trim().required(),
  name: Joi.string().trim().required(),
  size: Joi.number().required()
})