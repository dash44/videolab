import Joi from 'joi';
export const uploadSchema = Joi.object({}); // using multer, no body fields yet

import celebratePkg from 'celebrate';
const { celebrate, Segments } = celebratePkg;

export const body = (schema)  => celebrate({ [Segments.BODY]: schema });
export const params = (schema)=> celebrate({ [Segments.PARAMS]: schema });
export const query = (schema) => celebrate({ [Segments.QUERY]: schema });

export const validate = (_schema) => (req, _res, next) => next();
