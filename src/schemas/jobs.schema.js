import Joi from 'joi';
export const processSchema = Joi.object({
    assetId: Joi.string().required();
    iterations: Joi.number().integer().min(1).max(50).default(8);
    variants: Joi.number().integer().min(1).max(10).default(3)
});

export const listJobSchema = Joi.object({
    status: Joi.string().valid('running', 'done', 'error').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
});

export const jobIdSchema = Joi.object({ id: Joi.string().required() });