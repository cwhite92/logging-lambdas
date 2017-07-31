'use strict';

const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
const sizeof = require('object-sizeof');
const Joi = require('joi');

const schema = Joi.object().keys({
    time: Joi.string().isoDate().required(),
    type: Joi.string().max(100).truncate().required(),
    message: Joi.string().max(1000).truncate().required(),
    level: Joi.string().valid(['debug', 'info', 'notice', 'warning', 'error', 'critical', 'alert', 'emergency']).required(),
    request: Joi.object().keys({
        url: Joi.string().max(1000).truncate().required(),
        method: Joi.string().max(100).truncate().required(),
        client_ip: Joi.string().ip({version: ['ipv4', 'ipv6'], cidr: 'forbidden'}),
        query_strings: Joi.array().items(Joi.object().keys({
            key: Joi.string().max(1000).truncate().required(),
            value: Joi.string().max(1000).truncate().required()
        })).required(),
        body_fields: Joi.array().items(Joi.object().keys({
            key: Joi.string().max(1000).truncate().required(),
            value: Joi.string().max(1000).truncate().required()
        })).required(),
        headers: Joi.array().items(Joi.object().keys({
            key: Joi.string().max(1000).truncate().required(),
            value: Joi.string().max(1000).truncate().required()
        })).required(),
        files: Joi.array().items(Joi.object().keys({
            name: Joi.string().max(1000).truncate().required(),
            mimeType: Joi.string().max(100).truncate().required(),
            size: Joi.number().integer().positive().max(99999999).required(),
        })).required(),
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

module.exports.entrypoint = (event, context, callback) => {
    const input = JSON.parse(event.body);

    // Max log payload size is 1MB.
    if (sizeof(input) > 1048576) {
        callback(null, {
            statusCode: 413,
            headers: {},
            body: JSON.stringify({"error": "Your log payload is too large. Maximum size is 1048576 bytes."})
        });

        return;
    }

    const validationResult = Joi.validate(input, schema);

    if (validationResult.error) {
        console.log(validationResult.error);
        callback(null, {
            statusCode: 422,
            headers: {},
            body: JSON.stringify({"error": "Your log payload has validation errors."})
        });

        return;
    }

    lambda.invoke({
        FunctionName: 'logwatch-ingest',
        InvocationType: 'Event',
        Payload: JSON.stringify(event)
    }, function (error, data) {
        callback(null, {
            statusCode: 201,
            headers: {},
            body: ''
        });
    });
};
