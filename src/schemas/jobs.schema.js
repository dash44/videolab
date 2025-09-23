import Joi from 'joi';

export const processSchema = Joi.object({
    assetId: Joi.string().required(),
    variants: Joi.number().integer().min(1).max(10).required(),
    format: Joi.string().valid('mp4', 'webm', 'mov', 'avi', 'mkv').required()
});

export const listJobsSchema = Joi.object({
    status: Joi.string().valid('running', 'done', 'error').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
});

export const jobIdSchema = Joi.object({ id: Joi.string().required(),
});