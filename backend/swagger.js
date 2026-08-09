const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Agile Project Management API',
            version: '1.0.0',
            description:
                'REST API for managing projects, sprints, user stories, and tasks in an agile workflow. ' +
                'Hierarchy: Project → Sprint → User Story → Task.',
            contact: {
                name: 'API Support',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local development server',
            },
        ],
    },
    apis: ['./routes/*.js'], // pick up all @swagger JSDoc comments from route files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
