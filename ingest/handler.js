'use strict';

const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const uuidv4 = require('uuid/v4');
const Joi = require('joi');
const sizeof = require('object-sizeof');

const schema = Joi.object().keys({
    time: Joi.string().isoDate().required(),
    message: Joi.string().max(1000).truncate().required(),
    level: Joi.string().valid(['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency']).required(),
    request: Joi.object().keys({
        url: Joi.string().max(1000).truncate().required(),
        ip: Joi.string().ip({version: ['ipv4', 'ipv6'], cidr: 'forbidden'}),
        query_strings: Joi.array().items(Joi.object().keys({
            key: Joi.string().max(1000).truncate().required(),
            value: Joi.string().max(1000).truncate().required()
        })).min(1).allow(null).required(),
        body_fields: Joi.array().items(Joi.object().keys({
            key: Joi.string().max(1000).truncate().required(),
            value: Joi.string().max(1000).truncate().required()
        })).min(1).allow(null).required(),
        headers: Joi.array().items(Joi.object().keys({
            key: Joi.string().max(1000).truncate().required(),
            value: Joi.string().max(1000).truncate().required()
        })).min(1).allow(null).required(),
        files: Joi.array().items(Joi.object().keys({
            name: Joi.string().max(1000).truncate().required(),
            mimeType: Joi.string().max(100).truncate().required(),
            size: Joi.number().integer().positive().max(99999999).required(),
        })).min(1).allow(null).required(),
    }).allow(null).required(),
    exception: Joi.object().keys({
        message: Joi.string().max(1000).truncate().required(),
        code: Joi.string().max(100).truncate().required(),
        file: Joi.string().max(1000).truncate().required(),
        line: Joi.number().integer().positive().max(99999999).required(),
        trace_string: Joi.string().max(10000).truncate().required()
    }).allow(null).required(),
    context: Joi.object().unknown().max(100).allow(null).required()
}).strict();

module.exports.ingest = (event, context, callback) => {
    const input = JSON.parse(event.body);

    // Max log payload size is 1MB.
    if (sizeof(input) > 1048576) {
        callback(null, {
            statusCode: 413,
            headers: {},
            body: JSON.stringify({"error": "Your log payload is too large. Maximum size is 1048576 bytes."})
        })
    }

    const validationResult = Joi.validate(input, schema);

    if (validationResult.error) {
        callback(null, {
            statusCode: 422,
            headers: {},
            body: JSON.stringify(validationResult.error)
        });
    }

    const uuid = uuidv4();
    const filename = `${uuid}.json`;
    const payload = {
        data: input,
        meta: {
            uuid: uuid
        }
    };

    s3.putObject({
        Bucket: process.env.LOGS_BUCKET,
        Key: filename,
        Body: JSON.stringify(payload)
    }, (error, data) => {
        if (error) {
            console.log('Error writing to S3', error);
            callback(null, {
                statusCode: 500,
                headers: {},
                body: null
            });
        }

        console.log('Successfully wrote log to S3', filename);
        callback(null, {
            statusCode: 201,
            headers: {},
            body: JSON.stringify({uuid: uuid})
        });
    });
};
